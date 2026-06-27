export const onRequestPost: PagesFunction<{ AI: any, DB: any }> = async (context) => {
  const { request, env } = context
  try {
    const { text } = await request.json() as { text: string }
    if (!text) {
      return new Response('Bad Request', { status: 400 })
    }

    // 鉴权获取用户
    const token = request.headers.get('Authorization')
    if (!token || !token.startsWith('Bearer real-jwt-token-for-')) {
      return Response.json({ error: 'Unauthorized, please login first' }, { status: 401 })
    }
    const username = token.replace('Bearer real-jwt-token-for-', '')

    // 1. 获取现有分类，帮助 AI 归类，避免分类发散
    let existingCategories: string[] = []
    try {
      const { results } = await env.DB.prepare(
        `SELECT DISTINCT json_extract(parsed_data, '$.primaryCategory') as cat 
         FROM records 
         WHERE type = 'expense' 
         AND username = ?
         AND json_extract(parsed_data, '$.primaryCategory') IS NOT NULL`
      ).bind(username).all()
      existingCategories = results.map((r: any) => r.cat).filter(Boolean)
    } catch (e) {
      // 忽略表不存在或查询失败
      console.error('Fetch categories error:', e)
    }

    // 2. 组装 System Prompt
    const systemPrompt = `You are a life-logging assistant. Parse the user's input and return ONLY raw valid JSON. Do not wrap in markdown blocks like \`\`\`json.
Rules:
1. "type" must be exactly one of: "expense", "todo", "note".
2. If expense, extract "amount" (number) and "primaryCategory" (string).
   - Try to use one of the EXISTING categories if applicable: ${JSON.stringify(existingCategories)}.
   - If none fit, invent a new, short (2-4 characters) Chinese category.
3. If todo, extract "deadline" (string) and "summary" (string).
4. If note, extract "summary" (string).
5. Always generate 1-3 short "tags" (string array) in Chinese.

Output exact JSON schema:
{
  "type": "...",
  "parsedData": {
    "primaryCategory": "...",
    "amount": 0,
    "deadline": "...",
    "summary": "...",
    "tags": ["..."]
  }
}`

    // 3. 召唤 外部 Qwen 大模型 (OpenAI 兼容接口)
    const apiKey = 'sk-9eba23ea436b4603b40260f79f86fe0c'
    const aiResponse = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen3.7-plus', // 强制使用指定的版本号
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1 // 降低随机性，确保 JSON 格式稳定
      })
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      throw new Error(`AI API failed: ${aiResponse.status} ${errorText}`)
    }

    const aiData = await aiResponse.json()
    let jsonStr = aiData.choices?.[0]?.message?.content || ''
    
    // 4. 解析 JSON
    jsonStr = jsonStr.trim()
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim()
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim()
    }

    let parsedJson: any = {}
    try {
      parsedJson = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('AI JSON Parse Error:', jsonStr)
      // 回退策略：作为普通笔记
      parsedJson = {
        type: 'note',
        parsedData: { summary: text.slice(0, 20), tags: ['AI 解析失败'] }
      }
    }

    // 5. 保存入库 D1
    const recordId = crypto.randomUUID()
    const type = parsedJson.type || 'note'
    const parsedDataStr = JSON.stringify(parsedJson.parsedData || {})

    await env.DB.prepare(
      `INSERT INTO records (id, username, raw_text, type, parsed_data) VALUES (?, ?, ?, ?, ?)`
    ).bind(recordId, username, text, type, parsedDataStr).run()

    // 6. 返回给前端渲染
    return new Response(JSON.stringify({
      id: recordId,
      rawText: text,
      type: type,
      parsedData: parsedJson.parsedData,
      createdAt: new Date().toISOString()
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error("API ERROR:", err.stack || err.message || err)
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' } 
    })
  }
}

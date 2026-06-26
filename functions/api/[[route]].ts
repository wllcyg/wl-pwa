import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  AI: any
}

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

// 一个极其简易的密码哈希算法 (边缘计算里可以使用 Web Crypto API)
async function hashPassword(password: string) {
  const msgUint8 = new TextEncoder().encode(password + "my_secret_salt")
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// 简单的鉴权中间件（这里做最简单的演示，真实情况应该验证 JWT）
const authMiddleware = async (c: any, next: any) => {
  const token = c.req.header('Authorization')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  // 我们在 token 里夹带了用户名 (比如 real-jwt-token-for-admin)，简单提取出来
  const username = token.replace('Bearer real-jwt-token-for-', '')
  c.set('username', username)
  await next()
}

// 上传头像：绕过 R2，直接转 Base64 存入 D1 (限小图)
app.post('/upload-avatar', authMiddleware, async (c) => {
  const username = c.get('username')
  const body = await c.req.parseBody()
  const file = body['file'] as File

  if (!file) return c.json({ error: 'No file uploaded' }, 400)
  
  if (file.size > 500 * 1024) {
    return c.json({ error: '图片过大，请限制在 500KB 以内' }, 400)
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    const avatarUrl = `data:${file.type};base64,${base64}`

    // 更新 D1 数据库
    await c.env.DB.prepare('UPDATE users SET avatar_url = ? WHERE username = ?')
      .bind(avatarUrl, username)
      .run()

    return c.json({ message: '上传成功', avatarUrl })
  } catch (e: any) {
    return c.json({ error: '上传失败: ' + e.message }, 500)
  }
})

app.post('/register', async (c) => {
  const body = await c.req.json()
  const { username, password } = body

  if (!username || !password || username.length < 3) {
    return c.json({ error: '无效的账号密码' }, 400)
  }

  if (/^\d/.test(username)) {
    return c.json({ error: '用户名不能以数字开头' }, 400)
  }

  try {
    // 检查是否已存在
    const { results } = await c.env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).all()
    if (results && results.length > 0) {
      return c.json({ error: '用户名已被注册' }, 400)
    }

    const hashed = await hashPassword(password)
    
    // 插入新用户
    await c.env.DB.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .bind(username, hashed)
      .run()

    return c.json({ 
      message: '注册成功', 
      token: `real-jwt-token-for-${username}`
    })
  } catch (e: any) {
    return c.json({ error: '数据库错误: ' + e.message }, 500)
  }
})

app.post('/login', async (c) => {
  const body = await c.req.json()
  const { username, password } = body

  if (!username || !password) {
    return c.json({ error: '请输入账号和密码' }, 400)
  }

  try {
    const hashed = await hashPassword(password)
    const { results } = await c.env.DB.prepare('SELECT * FROM users WHERE username = ? AND password_hash = ?')
      .bind(username, hashed)
      .all()

    if (results && results.length > 0) {
      return c.json({ 
        message: '登录成功', 
        token: `real-jwt-token-for-${username}` 
      })
    } else {
      return c.json({ error: '账号或密码错误' }, 401)
    }
  } catch (e: any) {
    return c.json({ error: '数据库错误: ' + e.message }, 500)
  }
})

app.get('/tts', async (c) => {
  const text = c.req.query('text');
  if (!text) {
    return c.json({ error: 'Missing text parameter' }, 400);
  }

  try {
    // Generate audio using Deepgram Aura 2
    const inputs = { text };
    const response = await c.env.AI.run('@cf/deepgram/aura-2-en', inputs);
    
    // Set headers for Edge Caching (1 year)
    const headers = new Headers();
    headers.set('Content-Type', 'audio/wav');
    headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000');
    
    return new Response(response as any, { headers });
  } catch (e: any) {
    return c.json({ error: 'TTS generation failed: ' + e.message }, 500);
  }
});

app.post('/subscribe', authMiddleware, async (c) => {
  const username = c.get('username')
  const body = await c.req.json()
  const { endpoint, keys } = body

  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return c.json({ error: 'Invalid subscription data' }, 400)
  }

  try {
    // Check if subscription already exists for this endpoint
    const { results } = await c.env.DB.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).all()
    
    if (results && results.length > 0) {
      // Update existing subscription
      await c.env.DB.prepare('UPDATE push_subscriptions SET username = ?, keys_p256dh = ?, keys_auth = ? WHERE endpoint = ?')
        .bind(username, keys.p256dh, keys.auth, endpoint)
        .run()
    } else {
      // Insert new subscription
      await c.env.DB.prepare('INSERT INTO push_subscriptions (username, endpoint, keys_p256dh, keys_auth) VALUES (?, ?, ?, ?)')
        .bind(username, endpoint, keys.p256dh, keys.auth)
        .run()
    }

    return c.json({ message: 'Subscription saved successfully' })
  } catch (e: any) {
    return c.json({ error: 'Failed to save subscription: ' + e.message }, 500)
  }
})

app.post('/ping', authMiddleware, async (c) => {
  const username = c.get('username')
  const today = new Date().toISOString().split('T')[0]
  
  try {
    await c.env.DB.prepare('UPDATE push_subscriptions SET last_active_date = ? WHERE username = ?')
      .bind(today, username)
      .run()
    return c.json({ success: true, date: today })
  } catch (e: any) {
    return c.json({ error: 'Failed to update activity: ' + e.message }, 500)
  }
})

// 将 Hono App 绑定到 Cloudflare Pages 的入口函数
export const onRequest = handle(app)

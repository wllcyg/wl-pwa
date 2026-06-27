<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Send, Sparkles, Receipt, ListTodo, FileText, Loader2, Mic, AudioLines, X, Trash2 } from '@lucide/vue'
import { useUserStore } from '../store/user'

// 记录的类型定义
type RecordType = 'expense' | 'todo' | 'note' | 'loading'

interface RecordItem {
  id: string
  rawText: string
  type?: RecordType
  createdAt: Date
  parsedData?: {
    primaryCategory?: string
    amount?: number
    tags?: string[]
    deadline?: string
    summary?: string
  }
}

const formatTime = (date: Date) => {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

const records = ref<RecordItem[]>([
  {
    id: 'intro',
    rawText: '欢迎使用 AI 闪记。你可以随便输入，比如：“中午买咖啡花了25”、“明天下午3点开会”',
    type: 'note',
    createdAt: new Date(),
    parsedData: { summary: '使用提示', tags: ['系统'] }
  }
])

const inputText = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)

// 交互状态
const isTypingMode = ref(false)
const voiceInterimText = ref('')

// 语音识别逻辑
const isRecording = ref(false)
const isCanceling = ref(false) // 是否上滑取消
const showVoiceOverlay = ref(false) // 显示屏幕中央的黑色提示框
let recognition: any = null
let touchStartY = 0
let longPressTimer: any = null
let touchStartX = 0

const initSpeechRecognition = () => {
  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRec) return false
  
  recognition = new SpeechRec()
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'zh-CN'

  let finalStr = ''
  
  recognition.onstart = () => {
    finalStr = inputText.value // 记住之前的输入
  }

  recognition.onresult = (event: any) => {
    let currentInterim = ''
    let currentFinal = ''
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        currentFinal += event.results[i][0].transcript
      } else {
        currentInterim += event.results[i][0].transcript
      }
    }
    finalStr += currentFinal
    // 语音文字只上屏到中央黑色弹窗，不污染底部的输入框
    if (!isCanceling.value) {
      voiceInterimText.value = finalStr + currentInterim
    }
  }

  recognition.onerror = (event: any) => {
    console.error('语音识别错误:', event.error)
    endVoiceUI()
  }

  recognition.onend = () => {
    // 语音识别真正结束
    if (isRecording.value) {
       endVoiceUI()
    }
  }
  return true
}

// 结束语音状态重置
const endVoiceUI = () => {
  isRecording.value = false
  showVoiceOverlay.value = false
  isCanceling.value = false
}

// 处理长按逻辑
const handleTouchStart = (e: TouchEvent | MouseEvent) => {
  // 不阻止默认行为，避免拦截某些外层点击，但因为我们在 div 上绑定了，所以不会触发系统键盘
  
  if (e instanceof TouchEvent) {
    touchStartY = e.touches[0].clientY
    touchStartX = e.touches[0].clientX
  } else {
    touchStartY = e.clientY
    touchStartX = e.clientX
  }

  // 开始计时，如果是真正的长按（300ms），则进入录音模式
  longPressTimer = setTimeout(() => {
    startVoiceRecording(e)
  }, 300)
}

const startVoiceRecording = (e: TouchEvent | MouseEvent) => {
  // 阻止默认的长按菜单、放大镜等
  if (e.cancelable) e.preventDefault()
  
  if (!recognition) {
    if (!initSpeechRecognition()) {
      alert('抱歉，你的浏览器不支持语音输入 API。')
      return
    }
  }
  
  // 强制失去焦点，收起键盘（以防万一）
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }

  isRecording.value = true
  showVoiceOverlay.value = true
  isCanceling.value = false
  voiceInterimText.value = ''
  
  try {
    recognition.start()
  } catch (err) {
    console.error(err)
  }
}

const handleTouchMove = (e: TouchEvent | MouseEvent) => {
  let currentY = 0
  let currentX = 0
  if (e instanceof TouchEvent) {
    currentY = e.touches[0].clientY
    currentX = e.touches[0].clientX
  } else {
    currentY = e.clientY
    currentX = e.clientX
  }

  // 如果还在计时阶段（说明是点按滑动），移动超过 10px 则取消长按判定
  if (longPressTimer && !isRecording.value) {
    if (Math.abs(currentY - touchStartY) > 10 || Math.abs(currentX - touchStartX) > 10) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }
  
  if (!isRecording.value) return
  
  // 如果手指向上移动超过 60px，视为取消
  if (touchStartY - currentY > 60) {
    isCanceling.value = true
  } else {
    isCanceling.value = false
  }
}

const handleTouchEnd = (e: TouchEvent | MouseEvent) => {
  // 如果当前处于录音模式，说明触发了长按，绝不能进入短按打字模式
  if (isRecording.value) {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    
    if (e.cancelable) e.preventDefault() 
    
    try {
      recognition.stop()
    } catch (err) {}
    
    if (isCanceling.value) {
      // 取消发送
      voiceInterimText.value = ''
      endVoiceUI()
    } else {
      // 正常发送
      endVoiceUI()
      setTimeout(() => {
        if (voiceInterimText.value.trim()) {
          handleSend(voiceInterimText.value.trim())
          voiceInterimText.value = ''
        }
      }, 300)
    }
    return
  }

  // 如果没有进入录音模式，说明定时器没跑完就松手了，这是短按（轻点） -> 进入打字模式
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
    
    isTypingMode.value = true
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
}

const handleInputBlur = () => {
  // 当失去焦点且为空时，退回到“假输入框”形态
  if (!inputText.value.trim()) {
    isTypingMode.value = false
  }
}

// 调用真实的大模型后端接口
const parseRecordWithAI = async (text: string): Promise<any> => {
  try {
    const userStore = useUserStore()
    const token = userStore.token
    
    if (!token) {
      throw new Error('Please login first')
    }
    
    const res = await fetch('/api/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text })
    })
    
    if (!res.ok) {
      throw new Error('Network response was not ok')
    }
    
    const data = await res.json()
    return {
      type: data.type,
      parsedData: data.parsedData
    }
  } catch (err) {
    console.error('AI 解析请求失败:', err)
    return {
      type: 'note',
      parsedData: {
        summary: '解析出错',
        tags: ['Error']
      }
    }
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight
  }
}

const handleSend = async (textParam?: string | Event) => {
  let text = ''
  
  if (typeof textParam === 'string') {
    text = textParam
  } else {
    if (!inputText.value.trim()) return
    text = inputText.value.trim()
    inputText.value = ''
    isTypingMode.value = false // 发送完恢复成假输入框
  }
  
  if (!text) return
  
  const newId = Date.now().toString()
  
  // 1. 立即把用户的输入追加到列表，状态设为 loading
  records.value.push({
    id: newId,
    rawText: text,
    type: 'loading',
    createdAt: new Date()
  })
  
  await scrollToBottom()
  
  // 2. 模拟调用 AI
  const aiResult = await parseRecordWithAI(text)
  
  // 3. 更新对应的记录状态
  const idx = records.value.findIndex(r => r.id === newId)
  if (idx !== -1) {
    records.value[idx] = {
      ...records.value[idx],
      type: aiResult.type,
      parsedData: aiResult.parsedData
    }
  }
  
  await scrollToBottom()
}

// 列表左滑删除逻辑
const activeSwipeId = ref<string | null>(null)
let listTouchStartX = 0
let listTouchStartY = 0
let listTouchStartId = ''

const onListTouchStart = (e: TouchEvent, id: string) => {
  if (activeSwipeId.value && activeSwipeId.value !== id) {
    activeSwipeId.value = null // 点击其他项时收起
  }
  listTouchStartX = e.touches[0].clientX
  listTouchStartY = e.touches[0].clientY
  listTouchStartId = id
}

const onListTouchMove = (e: TouchEvent) => {
  if (!listTouchStartId) return
  const currentX = e.touches[0].clientX
  const currentY = e.touches[0].clientY
  
  // 判定是否为明显横向滑动（容差5px防抖）
  if (Math.abs(currentX - listTouchStartX) > Math.abs(currentY - listTouchStartY) + 5) {
    if (currentX < listTouchStartX - 30) {
      // 向左滑打开
      activeSwipeId.value = listTouchStartId
    } else if (currentX > listTouchStartX + 30) {
      // 向右滑关闭
      if (activeSwipeId.value === listTouchStartId) {
        activeSwipeId.value = null
      }
    }
  }
}

const deleteRecord = (id: string) => {
  records.value = records.value.filter(r => r.id !== id)
  activeSwipeId.value = null
}
</script>

<template>
  <div class="record-page">
    <header class="page-header">
      <h1 class="page-title">闪记</h1>
      <Sparkles :size="20" color="#0033A0" />
    </header>

    <!-- 消息列表区 -->
    <main class="record-list" ref="listRef" @click="activeSwipeId = null">
      <div 
        v-for="item in records" 
        :key="item.id" 
        class="record-wrapper"
        @touchstart.passive="onListTouchStart($event, item.id)"
        @touchmove.passive="onListTouchMove"
      >
        
        <!-- 底部的删除按钮 -->
        <div class="swipe-actions">
          <button class="delete-action-btn" @click.stop="deleteRecord(item.id)">
            <Trash2 :size="20" />
          </button>
        </div>

        <div class="record-card" :class="[item.type, { 'is-swiped': activeSwipeId === item.id }]">
          
          <!-- Loading 状态 -->
          <div v-if="item.type === 'loading'" class="loading-state">
            <Loader2 class="spin-icon" :size="18" />
            <span class="loading-text">✨ AI 正在拆解你的记录...</span>
            <span class="record-time">{{ formatTime(item.createdAt) }}</span>
          </div>
          
          <!-- 记账类型 -->
          <div v-else-if="item.type === 'expense'" class="content-state">
            <div class="card-top">
              <div class="icon-wrap expense"><Receipt :size="16" /></div>
              <span class="category">{{ item.parsedData?.primaryCategory }}</span>
              <div class="tags-row">
                <span v-for="tag in item.parsedData?.tags" :key="tag" class="ai-tag">{{ tag }}</span>
              </div>
              <span class="record-time">{{ formatTime(item.createdAt) }}</span>
            </div>
            <div class="amount-wrap">
              <span class="currency">¥</span>
              <span class="amount-number">{{ item.parsedData?.amount }}</span>
            </div>
            <p class="raw-text-dimmed">{{ item.rawText }}</p>
          </div>
          
          <!-- 待办类型 -->
          <div v-else-if="item.type === 'todo'" class="content-state">
            <div class="card-top">
              <div class="icon-wrap todo"><ListTodo :size="16" /></div>
              <span class="category">待办</span>
              <div class="tags-row">
                <span class="ai-tag highlight-time">{{ item.parsedData?.deadline }}</span>
              </div>
              <span class="record-time">{{ formatTime(item.createdAt) }}</span>
            </div>
            <h3 class="todo-summary">{{ item.parsedData?.summary }}</h3>
            <p class="raw-text-dimmed">{{ item.rawText }}</p>
          </div>

          <!-- 笔记类型 -->
          <div v-else class="content-state">
            <div class="card-top">
              <div class="icon-wrap note"><FileText :size="16" /></div>
              <span class="category">笔记</span>
              <div class="tags-row">
                <span v-for="tag in item.parsedData?.tags" :key="tag" class="ai-tag">{{ tag }}</span>
              </div>
              <span class="record-time">{{ formatTime(item.createdAt) }}</span>
            </div>
            <p class="note-raw-text">{{ item.rawText }}</p>
          </div>

        </div>
      </div>
    </main>

    <!-- 语音录制黑底提示框 (屏幕正中) -->
    <div class="voice-overlay" :class="{ 'is-active': showVoiceOverlay, 'is-canceling': isCanceling }">
      <div class="overlay-content">
        <Mic v-if="!isCanceling" :size="40" class="overlay-icon pulse-anim" />
        <X v-else :size="40" class="overlay-icon text-red" />
        <p class="overlay-text">{{ isCanceling ? '松开手指，取消发送' : '手指上滑，取消发送' }}</p>
        <div v-if="!isCanceling && voiceInterimText" class="voice-realtime-text">
          {{ voiceInterimText }}
        </div>
      </div>
    </div>

    <!-- 底部输入框 -->
    <div class="input-area">
      <div class="input-container">
        <!-- 假输入框 (拦截长按手势) -->
        <div 
          v-show="!isTypingMode"
          class="magic-input fake-input"
          @touchstart.passive="handleTouchStart"
          @touchmove.passive="handleTouchMove"
          @touchend.passive="handleTouchEnd"
          @touchcancel.passive="handleTouchEnd"
          @mousedown="handleTouchStart"
          @mousemove="handleTouchMove"
          @mouseup="handleTouchEnd"
          @mouseleave="handleTouchEnd"
        >
          <span class="placeholder-text">发消息或按住说话...</span>
        </div>

        <!-- 真输入框 (仅打字时出现) -->
        <input 
          v-show="isTypingMode"
          type="text" 
          v-model="inputText" 
          ref="inputRef"
          placeholder="发消息或按住右侧说话..." 
          @keyup.enter="handleSend"
          @blur="handleInputBlur"
          class="magic-input real-input"
        />
        
        <button 
          class="icon-btn hold-to-talk"
          @touchstart.prevent="startVoiceRecording"
          @touchmove.prevent="handleTouchMove"
          @touchend.prevent="handleTouchEnd"
          @touchcancel.prevent="handleTouchEnd"
        >
          <AudioLines :size="22" :class="{ 'text-active': isRecording }" />
        </button>
        
        <!-- 发送按钮 -->
        <button 
          class="send-btn" 
          :class="{ 'is-disabled': !inputText.trim() }"
          @click="handleSend"
          :disabled="!inputText.trim() || isRecording"
        >
          <Send :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.record-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f7f8f9;
}

.page-header {
  padding: 24px 20px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(247, 248, 249, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #191c1d;
  letter-spacing: -0.01em;
  margin: 0;
}

.record-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-behavior: smooth;
}

/* 卡片基础样式 */
.record-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.04);
  animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Loading 状态 */
.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #0033A0;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* 内容卡片通用 */
.card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.icon-wrap {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-wrap.expense { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.icon-wrap.todo { background: rgba(16, 185, 129, 0.15); color: #059669; }
.icon-wrap.note { background: rgba(0, 51, 160, 0.1); color: #0033A0; }

.category {
  font-size: 13px;
  font-weight: 600;
  color: #4a4a4a;
}

.tags-row {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.ai-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f0f2f5;
  color: #666;
}
.ai-tag.highlight-time {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  font-weight: 500;
}

/* 具体分类样式 */
.amount-wrap {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-bottom: 8px;
  color: #191c1d;
}
.currency { font-size: 16px; font-weight: 600; }
.amount-number { font-size: 32px; font-weight: 600; letter-spacing: -0.02em; font-family: 'Inter', sans-serif; }

.todo-summary {
  font-size: 16px;
  font-weight: 500;
  color: #191c1d;
  margin: 0 0 8px 0;
}

.note-raw-text {
  font-size: 15px;
  line-height: 1.5;
  color: #2c2c2c;
  margin: 0;
}

.raw-text-dimmed {
  font-size: 13px;
  color: #999;
  margin: 0;
  border-left: 2px solid #eee;
  padding-left: 8px;
}

/* 输入区 */
.input-area {
  padding: 12px 16px 24px; /* 留出底部安全区 */
  background: #f7f8f9;
  border-top: 1px solid rgba(0,0,0,0.05);
}

.input-container {
  display: flex;
  align-items: center;
  background: #f1f2f4;
  border-radius: 20px;
  padding: 8px 12px;
  gap: 8px;
}

.magic-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: #191c1d;
  padding: 4px 8px;
}
.magic-input::placeholder { color: #a0a5aa; }

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  transition: all 0.2s;
  cursor: pointer;
  -webkit-touch-callout: none;
  user-select: none;
}

.hold-to-talk {
  touch-action: none; /* 阻止移动端默认滚动，便于滑动判断 */
}

.text-active {
  color: #0033A0;
}

.send-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #0033A0;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border: none;
}
.send-btn:active:not(:disabled) { transform: scale(0.92); }
.send-btn.is-disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

/* 语音录制黑底弹窗 */
.voice-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
.voice-overlay.is-active {
  opacity: 1;
}

.overlay-content {
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 32px 24px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  min-width: 160px;
  max-width: 80%;
}

.overlay-icon {
  color: #fff;
}
.text-red {
  color: #ff4d4f;
}

.overlay-text {
  color: rgba(255,255,255,0.9);
  font-size: 14px;
  margin: 0;
}

.voice-realtime-text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  margin-top: 8px;
  text-align: center;
  word-break: break-all;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
}
.pulse-anim {
  animation: pulse 1.5s infinite ease-in-out;
}

.fake-input {
  display: flex;
  align-items: center;
  color: #9ca3af;
  user-select: none;
  -webkit-user-select: none;
}
.placeholder-text {
  pointer-events: none;
}

.is-canceling .overlay-content {
  background: rgba(220, 38, 38, 0.9);
}
</style>

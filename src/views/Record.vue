<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
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
  const y = date.getFullYear()
  const mo = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${y}-${mo}-${d} ${h}:${m}`
}

const records = ref<RecordItem[]>([])

const fetchRecords = async () => {
  try {
    const userStore = useUserStore()
    if (!userStore.token) return
    const res = await fetch('/api/record', {
      headers: { 'Authorization': `Bearer ${userStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      records.value = data.map((d: any) => ({
        ...d,
        createdAt: new Date(d.createdAt)
      }))
      await scrollToBottom()
    }
  } catch (err) {
    console.error('Failed to fetch records', err)
  }
}

onMounted(() => {
  fetchRecords()
})

const inputText = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)

// 彻底解决 iOS 放大镜/选中气泡：采用真假 UI 切换
const isTypingMode = ref(false)
const voiceInterimText = ref('')

// 语音识别逻辑
const isRecording = ref(false)
const isCanceling = ref(false)
const showVoiceOverlay = ref(false)
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
    finalStr = inputText.value
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
    if (!isCanceling.value) {
      voiceInterimText.value = finalStr + currentInterim
    }
  }

  recognition.onerror = (event: any) => {
    console.error('语音识别错误:', event.error)
    endVoiceUI()
  }

  recognition.onend = () => {
    if (isRecording.value) {
      endVoiceUI()
    }
  }
  return true
}

// 结束语音状态重置，主动 blur 防止键盘弹起
const endVoiceUI = () => {
  isRecording.value = false
  showVoiceOverlay.value = false
  isCanceling.value = false
  // 录音结束后退出打字模式
  isTypingMode.value = false
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}

const handleTouchStart = (e: TouchEvent | MouseEvent) => {
  if (e instanceof TouchEvent) {
    touchStartY = e.touches[0].clientY
    touchStartX = e.touches[0].clientX
  } else {
    touchStartY = e.clientY
    touchStartX = e.clientX
  }

  longPressTimer = setTimeout(() => {
    startVoiceRecording(e)
  }, 300)
}

const startVoiceRecording = (e: TouchEvent | MouseEvent) => {
  if (e.cancelable) e.preventDefault()

  if (!recognition) {
    if (!initSpeechRecognition()) {
      alert('抱歉，你的浏览器不支持语音输入 API。')
      return
    }
  }

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

  if (longPressTimer && !isRecording.value) {
    if (Math.abs(currentY - touchStartY) > 10 || Math.abs(currentX - touchStartX) > 10) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  if (!isRecording.value) return

  if (touchStartY - currentY > 60) {
    isCanceling.value = true
  } else {
    isCanceling.value = false
  }
}

const handleTouchEnd = (e: TouchEvent | MouseEvent) => {
  if (isRecording.value) {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }

    // passive 已去除，preventDefault 在此真正生效，阻止 iOS 弹起键盘
    if (e.cancelable) e.preventDefault()

    try {
      recognition.stop()
    } catch (err) { }

    if (isCanceling.value) {
      voiceInterimText.value = ''
      endVoiceUI()
    } else {
      const textToSend = voiceInterimText.value.trim()
      endVoiceUI()
      setTimeout(() => {
        if (textToSend) {
          handleSend(textToSend)
          voiceInterimText.value = ''
        }
      }, 300)
    }
    return
  }

  // 短按 → 打字模式：切换到真输入框，并触发聚焦
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
  if (!inputText.value.trim()) {
    isTypingMode.value = false
  }
}

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
    isTypingMode.value = false // 发送完退出打字模式
  }

  if (!text) return

  const newId = Date.now().toString()

  records.value.push({
    id: newId,
    rawText: text,
    type: 'loading',
    createdAt: new Date()
  })

  await scrollToBottom()

  const aiResult = await parseRecordWithAI(text)

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

const onListTouchStart = (e: TouchEvent | MouseEvent, id: string) => {
  if (activeSwipeId.value && activeSwipeId.value !== id) {
    activeSwipeId.value = null
  }
  listTouchStartX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
  listTouchStartY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
  listTouchStartId = id
}

const onListTouchMove = (e: TouchEvent | MouseEvent) => {
  if (!listTouchStartId) return
  const currentX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
  const currentY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY

  if (Math.abs(currentX - listTouchStartX) > Math.abs(currentY - listTouchStartY) + 5) {
    if (currentX < listTouchStartX - 30) {
      activeSwipeId.value = listTouchStartId
    } else if (currentX > listTouchStartX + 30) {
      if (activeSwipeId.value === listTouchStartId) {
        activeSwipeId.value = null
      }
    }
  }
}

const onListTouchEnd = () => {
  listTouchStartId = ''
}

const deleteRecord = async (id: string) => {
  records.value = records.value.filter(r => r.id !== id)
  activeSwipeId.value = null

  try {
    const userStore = useUserStore()
    await fetch(`/api/record?id=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${userStore.token}` }
    })
  } catch (e) {
    console.error('Delete failed', e)
  }
}
</script>

<template>
  <div class="record-page">
    <header class="page-header">
      <h1 class="page-title">闪记</h1>
      <Sparkles :size="20" color="var(--color-primary)" />
    </header>

    <!-- 消息列表区 -->
    <main class="record-list" ref="listRef" @click="activeSwipeId = null">
      <div v-for="item in records" :key="item.id" class="record-wrapper"
        @touchstart.passive="onListTouchStart($event, item.id)" @touchmove.passive="onListTouchMove"
        @touchend.passive="onListTouchEnd" @touchcancel.passive="onListTouchEnd"
        @mousedown="onListTouchStart($event, item.id)" @mousemove="onListTouchMove" @mouseup="onListTouchEnd"
        @mouseleave="onListTouchEnd">
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
              <div class="icon-wrap expense">
                <Receipt :size="16" />
              </div>
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
              <div class="icon-wrap todo">
                <ListTodo :size="16" />
              </div>
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
              <div class="icon-wrap note">
                <FileText :size="16" />
              </div>
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
        <!--
          假输入框：完全屏蔽系统长按菜单、放大镜
          负责处理长按语音和点击进入打字模式
        -->
        <div 
          v-show="!isTypingMode"
          class="magic-input fake-input"
          @touchstart.prevent="handleTouchStart"
          @touchmove.prevent="handleTouchMove"
          @touchend.prevent="handleTouchEnd"
          @touchcancel.prevent="handleTouchEnd"
          @mousedown.prevent="handleTouchStart"
          @mousemove.prevent="handleTouchMove"
          @mouseup.prevent="handleTouchEnd"
          @mouseleave.prevent="handleTouchEnd"
        >
          <span :class="inputText ? 'has-text' : 'placeholder-text'">
            {{ inputText || '发消息或按住说话...' }}
          </span>
        </div>

        <!-- 真输入框 (仅打字时出现) -->
        <input
          v-show="isTypingMode"
          ref="inputRef"
          type="text"
          v-model="inputText"
          placeholder="发消息或按住说话..."
          class="magic-input real-input"
          @blur="handleInputBlur"
          @keyup.enter="handleSend"
        />

        <!--
          右侧语音按钮同样去掉 .passive，理由相同
        -->
        <button class="icon-btn hold-to-talk" @touchstart.prevent="startVoiceRecording"
          @touchmove.prevent="handleTouchMove" @touchend="handleTouchEnd" @touchcancel="handleTouchEnd">
          <AudioLines :size="22" :class="{ 'text-active': isRecording }" />
        </button>

        <!-- 发送按钮 -->
        <button class="send-btn" :class="{ 'is-disabled': !inputText.trim() }" @click="handleSend"
          :disabled="!inputText.trim() || isRecording">
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
  background-color: var(--color-bg-page);
}

.page-header {
  padding: calc(16px + env(safe-area-inset-top)) 20px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-elevated);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-title);
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

/* 卡片包装器与左滑 */
.record-wrapper {
  position: relative;
  width: 100%;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 20px;
  animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 80px;
  background: var(--color-danger);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
}

.delete-action-btn {
  background: transparent;
  border: none;
  color: white;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.delete-action-btn:active {
  background: rgba(0, 0, 0, 0.1);
}

/* 卡片基础样式 */
.record-card {
  position: relative;
  background: var(--color-bg-surface);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 2;
}

.record-card.is-swiped {
  transform: translateX(-80px);
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Loading 状态 */
.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-primary);
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
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

.icon-wrap.expense {
  background: rgba(var(--color-warning-rgb), 0.15);
  color: var(--color-warning);
}

.icon-wrap.todo {
  background: rgba(var(--color-success-rgb), 0.15);
  color: var(--color-success);
}

.icon-wrap.note {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}

.category {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-main);
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
  background: var(--color-bg-surface-hover);
  color: var(--color-text-muted);
}

.ai-tag.highlight-time {
  background: rgba(var(--color-danger-rgb), 0.1);
  color: var(--color-danger);
  font-weight: 500;
}

/* 具体分类样式 */
.amount-wrap {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-bottom: 8px;
  color: var(--color-text-title);
}

.currency {
  font-size: 16px;
  font-weight: 600;
}

.amount-number {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-family: 'Inter', sans-serif;
}

.todo-summary {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-title);
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
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: var(--color-bg-page);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
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
  color: var(--color-text-title);
  padding: 4px 8px;
}

.magic-input::placeholder {
  color: var(--color-text-light);
}

/* 假输入框的样式补齐 */
.fake-input {
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  -webkit-touch-callout: none;
  user-select: none;
  -webkit-user-select: none;
}

.placeholder-text {
  color: var(--color-text-light);
}

.has-text {
  color: var(--color-text-title);
}

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
  touch-action: none;
}

.text-active {
  color: var(--color-primary);
}

.send-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border: none;
}

.send-btn:active:not(:disabled) {
  transform: scale(0.92);
}

.send-btn.is-disabled {
  background: #e5e7eb;
  color: var(--color-text-light);
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
  background: rgba(0, 0, 0, 0.75);
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
  color: var(--color-bg-surface);
}

.text-red {
  color: var(--color-danger);
}

.overlay-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  margin: 0;
}

.voice-realtime-text {
  color: var(--color-bg-surface);
  font-size: 16px;
  font-weight: 500;
  margin-top: 8px;
  text-align: center;
  word-break: break-all;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }

  50% {
    transform: scale(1.15);
    opacity: 1;
  }

  100% {
    transform: scale(1);
    opacity: 0.8;
  }
}

.pulse-anim {
  animation: pulse 1.5s infinite ease-in-out;
}

.fake-input {
  display: flex;
  align-items: center;
  color: var(--color-text-light);
  user-select: none;
  -webkit-user-select: none;
}

.placeholder-text {
  pointer-events: none;
}

.is-canceling .overlay-content {
  background: rgba(var(--color-danger-rgb), 0.9);
}
</style>
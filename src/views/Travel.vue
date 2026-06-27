<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ImagePlus, MapPin, Loader2 } from '@lucide/vue'
import { useUserStore } from '../store/user'

type TravelLog = {
  id: string
  note: string
  imageUrl?: string
  createdAt: string
  placeName?: string
  lat?: number | null
  lng?: number | null
}

const userStore = useUserStore()
const logs = ref<TravelLog[]>([])
const note = ref('')
const isLoading = ref(false)
const isSubmitting = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const fetchLogs = async () => {
  if (!userStore.token) return
  isLoading.value = true
  try {
    const res = await fetch('/api/travel', {
      headers: {
        Authorization: `Bearer ${userStore.token}`
      }
    })

    if (!res.ok) throw new Error('加载旅行日志失败')

    const data = await res.json()
    logs.value = data
  } catch (err) {
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchLogs()
})

const getCurrentPosition = () =>
  new Promise<{ lat: number; lng: number } | null>((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        })
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 60 * 1000
      }
    )
  })

const formatCoordinate = (v: number) => v.toFixed(4)

const getLocationName = async (lat: number, lng: number) => {
  try {
    // 根据和风天气接口要求，location参数格式为：经度,纬度
    const url = `https://geoapi.qweather.com/v2/city/lookup?location=${lng},${lat}&key=67f855af213147a78df179739b78ee86`
    const res = await fetch(url)
    const data = await res.json()
    
    if (data.code === '200' && data.location && data.location.length > 0) {
      const loc = data.location[0]
      // 将省、市、区/县进行组合，并去掉重复项（如直辖市的省市同名情况）
      const parts = [loc.adm1, loc.adm2, loc.name].filter(Boolean)
      return Array.from(new Set(parts)).join(' ')
    }
  } catch (err) {
    console.error('获取地理位置名称失败:', err)
  }
  return null
}

const postTravelLog = async (file?: File, forceCheckIn = false) => {
  if (!userStore.token) return
  if (!note.value.trim() && !file && !forceCheckIn) return

  isSubmitting.value = true

  try {
    const formData = new FormData()
    formData.append('note', note.value.trim())

    const position = await getCurrentPosition()
    if (position) {
      formData.append('lat', String(position.lat))
      formData.append('lng', String(position.lng))
      
      const placeName = await getLocationName(position.lat, position.lng)
      if (placeName) {
        formData.append('placeName', placeName)
      }
    }
    if (file) {
      formData.append('image', file)
    }

    const res = await fetch('/api/travel', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userStore.token}`
      },
      body: formData
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '提交失败')
    }

    const created = await res.json()
    logs.value.unshift(created)
    note.value = ''
  } catch (err) {
    console.error(err)
  } finally {
    isSubmitting.value = false
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }
}

const handleCheckIn = async () => {
  await postTravelLog(undefined, true)
}

const handlePickImage = () => {
  fileInputRef.value?.click()
}

const IMAGE_MAX_SIDE = 1600
const IMAGE_QUALITY = 0.82

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })

const compressImageFile = async (file: File) => {
  if (!file.type.startsWith('image/')) return file

  const objectUrl = URL.createObjectURL(file)

  try {
    const img = await loadImage(objectUrl)
    const { width, height } = img

    if (!width || !height) return file

    const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(width, height))
    const targetWidth = Math.round(width * scale)
    const targetHeight = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', IMAGE_QUALITY)
    })

    if (!compressedBlob) return file
    if (compressedBlob.size >= file.size) return file

    return new File([compressedBlob], file.name.replace(/\.[^.]+$/, '.jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now()
    })
  } catch (err) {
    console.error('图片压缩失败，回退原图上传', err)
    return file
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const compressed = await compressImageFile(file)
  await postTravelLog(compressed)
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

const withToken = (url: string) => {
  if (!url) return ''
  const token = userStore.token
  if (!token) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}token=${encodeURIComponent(token)}`
}
</script>

<template>
  <div class="travel-page">
    <header class="page-header">
      <h1 class="page-title">旅行</h1>
      <MapPin :size="20" color="var(--color-primary)" />
    </header>

    <section class="composer">
      <textarea
        v-model="note"
        class="note-input"
        rows="3"
        placeholder="写下此刻位置、心情或见闻…"
      />

      <div class="actions">
        <button class="ghost-btn" @click="handlePickImage" :disabled="isSubmitting">
          <ImagePlus :size="16" />
          上传/拍摄
        </button>

        <button class="primary-btn" @click="handleCheckIn" :disabled="isSubmitting">
          <Loader2 v-if="isSubmitting" :size="16" class="spin" />
          <span v-else>直接打卡</span>
        </button>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        class="hidden-input"
        accept="image/*"
        capture="environment"
        @change="handleFileChange"
      />
    </section>

    <main class="timeline">
      <div v-if="isLoading" class="empty-tip">正在加载旅行日志...</div>
      <div v-else-if="logs.length === 0" class="empty-tip">还没有旅行记录，拍一张或先打个卡吧 ✨</div>

      <div v-else class="timeline-list">
        <article v-for="item in logs" :key="item.id" class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-card">
            <p class="time">{{ formatDateTime(item.createdAt) }}</p>
            <p v-if="item.placeName || (item.lat != null && item.lng != null)" class="place-text">
              <MapPin :size="14" class="place-icon" />
              {{ item.placeName || `${formatCoordinate(item.lat as number)}, ${formatCoordinate(item.lng as number)}` }}
            </p>
            <p v-if="item.note" class="note-text">{{ item.note }}</p>
            <img v-if="item.imageUrl" :src="withToken(item.imageUrl)" alt="旅行照片" class="travel-image" loading="lazy" />
          </div>
        </article>
      </div>
    </main>
  </div>
</template>

<style scoped>
.travel-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-page);
}

.page-header {
  padding: calc(16px + env(safe-area-inset-top)) 20px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-elevated);
  position: sticky;
  top: 0;
  z-index: 5;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-title);
}

.composer {
  padding: 12px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: var(--color-bg-surface);
}

.note-input {
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--color-bg-page);
  color: var(--color-text-main);
  resize: none;
  font-size: 14px;
  outline: none;
}

.actions {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.ghost-btn,
.primary-btn {
  height: 36px;
  border-radius: 999px;
  border: none;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}

.ghost-btn {
  background: var(--color-bg-page);
  color: var(--color-text-main);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.primary-btn {
  background: var(--color-primary);
  color: #fff;
}

.ghost-btn:disabled,
.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hidden-input {
  display: none;
}

.timeline {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px calc(20px + env(safe-area-inset-bottom));
}

.timeline-list {
  position: relative;
}

.timeline-list::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(var(--color-primary-rgb), 0.2);
}

.timeline-item {
  position: relative;
  padding-left: 24px;
  margin-bottom: 16px;
}

.timeline-dot {
  position: absolute;
  left: 0;
  top: 6px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.15);
}

.timeline-card {
  border-radius: 14px;
  background: var(--color-bg-surface);
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 10px 12px;
}

.time {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.place-text {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}

.note-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--color-text-main);
}

.travel-image {
  margin-top: 10px;
  width: 100%;
  max-height: 420px;
  object-fit: contain;
  border-radius: 10px;
  display: block;
}

.empty-tip {
  margin-top: 40px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

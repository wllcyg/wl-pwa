<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSwipe } from '@vueuse/core'
import { Volume2, Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

// 移除默认的 Loading 占位，使用真实的 Loading 状态
const wordsList = ref<any[]>([])
const isLoading = ref(true)

const currentIndex = ref(0)
const currentWord = computed(() => wordsList.value[currentIndex.value])
const isTransitioning = ref(false)

const swipeContainerRef = ref<HTMLElement | null>(null)

// 移除了原始的 onMounted 里的 fetch 逻辑，全部收敛到 fetchWords 中

useSwipe(swipeContainerRef, {
  threshold: 50,
  onSwipeEnd(_e, direction) {
    if (direction === 'left' && currentIndex.value < wordsList.value.length - 1) {
      changeWord(currentIndex.value + 1)
    } else if (direction === 'right' && currentIndex.value > 0) {
      changeWord(currentIndex.value - 1)
    }
  }
})

const changeWord = (newIndex: number) => {
  if (newIndex === currentIndex.value) return
  isTransitioning.value = true
  
  setTimeout(() => {
    currentIndex.value = newIndex
    isTransitioning.value = false
  }, 300) // Match the CSS transition duration
}

const playingText = ref('')
const loadingText = ref('')

const playAudio = async (text: string) => {
  if (playingText.value === text || loadingText.value === text) {
    window.speechSynthesis.cancel()
    playingText.value = ''
    loadingText.value = ''
    return
  }

  window.speechSynthesis.cancel()

  try {
    loadingText.value = text
    playingText.value = ''
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    
    utterance.onstart = () => {
      loadingText.value = ''
      playingText.value = text
    }

    utterance.onend = () => {
      playingText.value = ''
      loadingText.value = ''
    }
    
    utterance.onerror = (e) => {
      console.error('Speech synthesis failed', e)
      toast.error('系统语音播放失败')
      playingText.value = ''
      loadingText.value = ''
    }
    
    window.speechSynthesis.speak(utterance)
  } catch (err) {
    console.error('Failed to play audio:', err)
    toast.error('播放失败，请检查系统设置。')
    playingText.value = ''
    loadingText.value = ''
  }
}

// Pull to refresh logic
const touchStartY = ref(0)
const touchCurrentY = ref(0)
const isPulling = ref(false)
const isRefreshing = ref(false)

const pullDistance = computed(() => {
  if (!isPulling.value) return 0
  const dist = touchCurrentY.value - touchStartY.value
  return dist > 0 ? Math.min(dist * 0.4, 80) : 0 // Add resistance and max distance
})

const onTouchStart = (e: TouchEvent) => {
  if (swipeContainerRef.value && swipeContainerRef.value.scrollTop === 0) {
    touchStartY.value = e.touches[0].clientY
    touchCurrentY.value = e.touches[0].clientY
    isPulling.value = true
  }
}

const onTouchMove = (e: TouchEvent) => {
  if (!isPulling.value) return
  touchCurrentY.value = e.touches[0].clientY
}

const fetchWords = async () => {
  isLoading.value = true
  try {
    const res = await fetch('/api/daily-words')
    if (res.ok) {
      const data = await res.json()
      if (data && data.length > 0) {
        wordsList.value = data.map((item: any) => ({
          id: item.id,
          word: item.word,
          phonetic: item.phonetic,
          translation: item.translation,
          pos: item.pos,
          literatureStyleExample: item.literature_example,
          englishExample: item.english_example
        }))
        currentIndex.value = 0
      }
    }
  } catch (err) {
    console.error('Failed to fetch daily words:', err)
  } finally {
    isLoading.value = false
  }
}

const onTouchEnd = async () => {
  if (!isPulling.value) return
  isPulling.value = false
  
  if (pullDistance.value >= 60 && !isRefreshing.value) {
    isRefreshing.value = true
    await fetchWords()
    isRefreshing.value = false
  }
  
  touchStartY.value = 0
  touchCurrentY.value = 0
}

import { onMounted } from 'vue'

onMounted(() => {
  fetchWords()
})
</script>

<template>
  <div 
    class="art-book-container" 
    ref="swipeContainerRef"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- Pull to refresh indicator -->
    <div 
      class="pull-refresh-indicator"
      :style="{ 
        transform: `translateY(${pullDistance}px)`,
        opacity: pullDistance / 60 
      }"
    >
      <div v-if="isRefreshing" class="refresh-spinner"></div>
      <span v-else class="pull-text">{{ pullDistance >= 60 ? '释放刷新' : '下拉刷新' }}</span>
    </div>

    <!-- Skeleton Loading State -->
    <div v-if="isLoading" class="skeleton-wrapper">
      <div class="skeleton-header"></div>
      <div class="skeleton-hero"></div>
      <div class="skeleton-phonetic"></div>
      <div class="skeleton-divider"></div>
      <div class="skeleton-text short"></div>
      <div class="skeleton-text title"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text"></div>
      <div class="skeleton-text" style="width: 60%"></div>
    </div>

    <!-- Actual Content -->
    <template v-else-if="wordsList.length > 0">
      <!-- Top Index Marker (Ultramarine Blue) -->
      <header 
        class="book-header" 
        :style="{ transform: `translateY(${isPulling ? pullDistance : 0}px)`, transition: isPulling ? 'none' : 'transform 0.3s ease' }"
      >
        <span class="index-marker">
          No. {{ String(currentIndex + 1).padStart(2, '0') }}
        </span>
        <span class="total-marker">/ {{ String(wordsList.length).padStart(2, '0') }}</span>
      </header>

      <!-- Content Area with Transition -->
      <main class="page-content" :class="{ 'page-transitioning': isTransitioning }">
        
        <!-- Top Half: The Word -->
        <section class="word-hero">
          <h1 class="display-word">{{ currentWord.word }}</h1>
          <div class="phonetic-row" @click="playAudio(currentWord.word)">
            <span class="utility-phonetic">{{ currentWord.phonetic }}</span>
            <Loader2 v-if="loadingText === currentWord.word" :size="16" color="#0033A0" class="spin-anim" style="margin-left: 4px;" />
            <Volume2 v-else :size="16" color="#0033A0" :class="{ 'playing-anim': playingText === currentWord.word }" style="margin-left: 4px;" />
          </div>
        </section>

        <!-- Bottom Half: The Meaning & Art Book Literature -->
        <section class="word-details">
          <div class="structural-divider"></div>
          
          <div class="definition-block">
            <span class="pos-tag">{{ currentWord.pos }}</span>
            <h2 class="translation-text">{{ currentWord.translation }}</h2>
          </div>

          <div class="literature-block">
            <p class="literature-example">
              {{ currentWord.literatureStyleExample }}
            </p>
            <div style="display: flex; gap: 8px; align-items: flex-start; cursor: pointer;" @click="playAudio(currentWord.englishExample)">
              <p class="english-example" style="flex: 1;">
                {{ currentWord.englishExample }}
              </p>
              <Loader2 v-if="loadingText === currentWord.englishExample" :size="16" color="#888C91" class="spin-anim" style="margin-top: 4px;" />
              <Volume2 v-else :size="16" color="#888C91" :class="{ 'playing-anim': playingText === currentWord.englishExample }" style="margin-top: 4px;" />
            </div>
          </div>
        </section>
      </main>
    </template>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <p>今日暂无单词数据</p>
    </div>
  </div>
</template>

<style scoped>
/* 
  Theme Tokens: Modern Art Book
*/
.art-book-container {
  /* Layout */
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #FAFAFA; /* Crisp off-white */
  color: #2C2A29; /* Deep warm grey */
  font-family: 'Inter', sans-serif;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
  
  /* Prevent text selection on swipe */
  user-select: none;
  -webkit-user-select: none;
  touch-action: pan-y;
}

.pull-refresh-indicator {
  position: absolute;
  top: -40px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40px;
  color: #0033A0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  z-index: 10;
}

.refresh-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 51, 160, 0.2);
  border-top-color: #0033A0;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Header */
.book-header {
  padding: 32px 32px 16px;
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: 4px;
}

.index-marker {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  color: #0033A0; /* Ultramarine Blue Accent */
  letter-spacing: 0.05em;
}

.total-marker {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #A0A5AA;
}

/* Page Transition Wrapper */
.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 32px 48px;
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0, 0, 1);
}

.page-content.page-transitioning {
  opacity: 0;
  transform: translateX(15px);
}

/* Top Half: Hero Word */
.word-hero {
  margin-top: 4vh;
  margin-bottom: 8vh;
  /* Push to left edge intentionally for brutalist/art book feel */
  margin-left: -8px; 
}

.display-word {
  font-family: 'Playfair Display', serif;
  font-size: 4.5rem;
  font-weight: 400;
  font-style: italic;
  letter-spacing: -0.04em;
  line-height: 1.1;
  color: #1A1A1A;
  margin: 0 0 16px 0;
  /* Soft elegant shadow to pop off the paper */
  text-shadow: 2px 4px 12px rgba(0,0,0,0.04);
}

.phonetic-row {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-left: 8px;
  cursor: pointer;
  padding: 4px 0;
}

.utility-phonetic {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  color: #888C91;
  letter-spacing: 0.02em;
}

.play-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #0033A0; /* Blue accent */
  position: relative;
}
.play-indicator::after {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border: 1px solid rgba(0, 51, 160, 0.4);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}

.spin-anim {
  animation: spin 1s linear infinite;
}

.playing-anim {
  animation: jiggle 1s ease-in-out infinite;
}

@keyframes jiggle {
  0%, 100% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(-10deg) scale(1.1); }
  75% { transform: rotate(10deg) scale(1.1); }
}

/* Bottom Half: Details */
.word-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.structural-divider {
  height: 1px;
  width: 40px;
  background-color: #2C2A29;
  margin-bottom: 32px;
}

.definition-block {
  margin-bottom: 40px;
}

.pos-tag {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  color: #0033A0;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

.translation-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2C2A29;
  margin: 0;
  line-height: 1.4;
  letter-spacing: 0.02em;
}

/* Literature Block */
.literature-block {
  position: relative;
  padding-left: 20px;
}

/* Blue structural line instead of generic quote marks */
.literature-block::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background-color: #0033A0;
  opacity: 0.8;
}

.literature-example {
  font-family: 'Playfair Display', serif;
  font-size: 1.15rem;
  line-height: 1.8;
  color: #4A4A4A;
  margin: 0 0 16px 0;
  text-align: justify;
}

.english-example {
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #888C91;
  margin: 0;
}

/* Skeleton Loading */
.skeleton-wrapper {
  padding: 32px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.skeleton-header {
  width: 60px;
  height: 16px;
  background: #ECECEC;
  align-self: flex-end;
  border-radius: 4px;
  margin-bottom: 8vh;
  animation: pulse-bg 1.5s infinite;
}

.skeleton-hero {
  width: 70%;
  height: 64px;
  background: #ECECEC;
  border-radius: 8px;
  margin-bottom: 16px;
  animation: pulse-bg 1.5s infinite;
}

.skeleton-phonetic {
  width: 40%;
  height: 20px;
  background: #ECECEC;
  border-radius: 4px;
  margin-bottom: 60px;
  animation: pulse-bg 1.5s infinite;
}

.skeleton-divider {
  width: 40px;
  height: 1px;
  background: #ECECEC;
  margin-bottom: 32px;
}

.skeleton-text {
  width: 100%;
  height: 16px;
  background: #ECECEC;
  border-radius: 4px;
  margin-bottom: 12px;
  animation: pulse-bg 1.5s infinite;
}

.skeleton-text.short { width: 30%; margin-bottom: 20px; }
.skeleton-text.title { width: 80%; height: 24px; margin-bottom: 40px; }

@keyframes pulse-bg {
  0% { opacity: 0.6; }
  50% { opacity: 0.3; }
  100% { opacity: 0.6; }
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888C91;
}
</style>

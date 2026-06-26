<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSwipe } from '@vueuse/core'
import { Volume2 } from 'lucide-vue-next'

// Initial state with a loading placeholder
const wordsList = ref([
  {
    id: 0,
    word: 'Loading...',
    phonetic: '',
    translation: '正在召唤 AI 生成优美例句...',
    pos: '',
    literatureStyleExample: '',
    englishExample: ''
  }
])

const currentIndex = ref(0)
const currentWord = computed(() => wordsList.value[currentIndex.value])
const isTransitioning = ref(false)

const swipeContainerRef = ref<HTMLElement | null>(null)

import { onMounted } from 'vue'

onMounted(async () => {
  try {
    const res = await fetch('/api/daily-words')
    if (res.ok) {
      const data = await res.json()
      if (data && data.length > 0) {
        // Map database fields to frontend keys
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
  }
})

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

const isPlaying = ref(false)
const currentAudio = ref<HTMLAudioElement | null>(null)

const playAudio = async (text: string) => {
  if (isPlaying.value) {
    currentAudio.value?.pause()
    isPlaying.value = false
    return
  }

  try {
    isPlaying.value = true
    const audioUrl = `/api/tts?text=${encodeURIComponent(text)}`
    
    // We use the browser's Audio API.
    // The first request will take 1-2s and Cloudflare will cache it.
    const audio = new Audio(audioUrl)
    currentAudio.value = audio
    
    audio.onended = () => {
      isPlaying.value = false
    }
    
    audio.onerror = (e) => {
      console.error('Audio playback failed', e)
      isPlaying.value = false
    }
    
    await audio.play()
  } catch (err) {
    console.error('Failed to play audio:', err)
    isPlaying.value = false
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
          <Volume2 :size="16" color="#0033A0" :class="{ 'playing-anim': isPlaying }" style="margin-left: 4px;" />
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
            <Volume2 :size="16" color="#888C91" style="margin-top: 4px;" />
          </div>
        </div>
      </section>
      
    </main>
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
</style>

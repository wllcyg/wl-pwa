<script setup lang="ts">
import { BookOpen, User, Bell, Sparkles } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useUserStore } from '../store/user'

const route = useRoute()
const userStore = useUserStore()

const showPrompt = ref(false)
const isKeyboardVisible = ref(false)

// Animated Tab Bar Refs
const menuRef = ref<HTMLElement | null>(null)
const menuBorderRef = ref<HTMLElement | null>(null)
const itemRefs = ref<Record<string, HTMLElement>>({})

const setItemRef = (el: any, path: string) => {
  if (el) {
    itemRefs.value[path] = el.$el || el
  }
}

const offsetMenuBorder = () => {
  if (!menuRef.value || !menuBorderRef.value) return
  const activeItem = itemRefs.value[route.path]
  if (!activeItem) return

  const menuRect = menuRef.value.getBoundingClientRect()
  const activeRect = activeItem.getBoundingClientRect()
  
  const left = Math.floor(
    (activeRect.left - menuRect.left) + 
    (activeRect.width / 2) - 
    (menuBorderRef.value.offsetWidth / 2)
  )
  
  menuBorderRef.value.style.transform = `translate3d(${left}px, 0, 0)`
}
const VAPID_PUBLIC_KEY = 'BBOhr7vlawsYEFIiLCPEDKVGyQze6UfOkDaGPwB_TO6Ccws6PV0chzAQsIooCJqNlJxu7zGfOxIAbXlTSh_tXT8'

onMounted(() => {
  // Only show if logged in, browser supports push, and hasn't been dismissed
  if (userStore.token && 'serviceWorker' in navigator && 'PushManager' in window) {
    if (Notification.permission === 'default' && !localStorage.getItem('pushPromptDismissed')) {
      // Delay prompt slightly for better UX
      setTimeout(() => {
        showPrompt.value = true
      }, 1500)
    }
  }

  // 监听输入框焦点，自动隐藏底部 Tab 栏，防止被键盘顶起
  window.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      isKeyboardVisible.value = true
    }
  })
  window.addEventListener('focusout', () => {
    isKeyboardVisible.value = false
  })

  nextTick(() => {
    offsetMenuBorder()
  })
  window.addEventListener('resize', offsetMenuBorder)
})

onUnmounted(() => {
  window.removeEventListener('resize', offsetMenuBorder)
})

watch(() => route.path, () => {
  nextTick(() => {
    offsetMenuBorder()
  })
})

const dismissPrompt = () => {
  showPrompt.value = false
  localStorage.setItem('pushPromptDismissed', 'true')
}

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const enablePush = async () => {
  showPrompt.value = false
  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      const subJson = subscription.toJSON()
      
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer real-jwt-token-for-${userStore.userInfo?.username}`
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys
        })
      })
    } else {
      localStorage.setItem('pushPromptDismissed', 'true')
    }
  } catch (err) {
    console.error('Failed to enable push from prompt', err)
  }
}
</script>

<template>
  <div class="layout-wrapper">
    <!-- 顶部和中间内容区：由子路由接管 -->
    <main class="main-content">
      <router-view v-slot="{ Component, route }">
        <transition name="fade" mode="out-in">
          <keep-alive>
            <component :is="Component" :key="route.path" />
          </keep-alive>
        </transition>
      </router-view>
    </main>

    <!-- 底部 Tab 导航栏 -->
    <nav class="bottom-tab-bar" v-show="!isKeyboardVisible" ref="menuRef">
      <router-link 
        to="/words" 
        replace 
        class="tab-item" 
        :class="{ active: route.path === '/words' }"
        :ref="el => setItemRef(el, '/words')"
      >
        <div class="icon-wrap">
          <BookOpen :size="24" :stroke-width="route.path === '/words' ? 2.5 : 2" />
        </div>
        <span class="tab-label">单词</span>
      </router-link>
      
      <router-link 
        to="/record" 
        replace 
        class="tab-item" 
        :class="{ active: route.path === '/record' }"
        :ref="el => setItemRef(el, '/record')"
      >
        <div class="icon-wrap">
          <Sparkles :size="24" :stroke-width="route.path === '/record' ? 2.5 : 2" />
        </div>
        <span class="tab-label">闪记</span>
      </router-link>
      
      <router-link 
        to="/profile" 
        replace 
        class="tab-item" 
        :class="{ active: route.path === '/profile' }"
        :ref="el => setItemRef(el, '/profile')"
      >
        <div class="icon-wrap">
          <User :size="24" :stroke-width="route.path === '/profile' ? 2.5 : 2" />
        </div>
        <span class="tab-label">我的</span>
      </router-link>

      <div class="menu__border" ref="menuBorderRef"></div>
    </nav>

    <!-- Hidden SVG for ClipPath -->
    <div class="svg-container">
      <svg viewBox="0 0 202.9 45.5">
        <clipPath id="menu-clip" clipPathUnits="objectBoundingBox" transform="scale(0.0049285362247413 0.021978021978022)">
          <path d="M6.7,45.5c5.7,0.1,14.1-0.4,23.3-4c5.7-2.3,9.9-5,18.1-10.5c10.7-7.1,11.8-9.2,20.6-14.3c5-2.9,9.2-5.2,15.2-7c7.1-2.1,13.3-2.3,17.6-2.1c4.2-0.2,10.5,0.1,17.6,2.1c6.1,1.8,10.2,4.1,15.2,7c8.8,5,9.9,7.1,20.6,14.3c8.3,5.5,12.4,8.2,18.1,10.5c9.2,3.6,17.6,4.2,23.3,4H6.7z"/>
        </clipPath>
      </svg>
    </div>

    <!-- Custom Notification Prompt Modal -->
    <transition name="modal-fade">
      <div v-if="showPrompt" class="prompt-overlay">
        <div class="prompt-card">
          <div class="prompt-icon-wrap">
            <Bell :size="28" color="var(--color-primary)" />
          </div>
          <h3 class="prompt-title">开启消息通知？</h3>
          <p class="prompt-text">开启消息通知，不错过 note 的每日精美内容。</p>
          <div class="prompt-actions">
            <button class="btn-cancel" @click="dismissPrompt">暂不需要</button>
            <button class="btn-confirm" @click="enablePush">开启通知</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.layout-wrapper {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-page);
}

.main-content {
  flex: 1;
  overflow-y: auto; /* 允许内部滚动 */
  position: relative;
}

.bottom-tab-bar {
  height: calc(64px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom); 
  display: flex;
  background-color: var(--color-bg-surface);
  box-shadow: 0 -2px 10px rgba(0,0,0,0.02);
  z-index: 50;
  position: relative;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  text-decoration: none;
  color: var(--color-text-muted);
  -webkit-touch-callout: none;
  user-select: none;
  -webkit-user-select: none;
}

.icon-wrap {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  position: relative;
  z-index: 1;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), color 0.4s;
}

.icon-wrap::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 50%;
  background-color: var(--color-primary);
  transform: scale(0);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: -1;
}

.tab-item.active .icon-wrap {
  transform: translate3d(0, -22px, 0);
  color: var(--color-bg-surface);
}

.tab-item.active .icon-wrap::before {
  transform: scale(1);
}

.tab-label {
  font-size: 11px;
  font-weight: 500;
  position: absolute;
  bottom: 8px;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.3s, transform 0.3s;
}

.tab-item.active .tab-label {
  opacity: 1;
  transform: translateY(0);
  color: var(--color-primary);
}

.menu__border {
  left: 0;
  bottom: 100%;
  width: 86px;
  height: 20px;
  position: absolute;
  clip-path: url(#menu-clip);
  will-change: transform;
  background-color: var(--color-bg-surface);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  /* Use pointer-events none so it doesn't block clicks */
  pointer-events: none;
}

.svg-container {
  width: 0;
  height: 0;
  position: absolute;
}

/* Prompt Modal */
.prompt-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}

.prompt-card {
  background: var(--color-bg-surface);
  border-radius: 24px;
  padding: 32px 24px 24px;
  text-align: center;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 340px;
}

.prompt-icon-wrap {
  width: 56px;
  height: 56px;
  background: rgba(0, 51, 160, 0.08);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.prompt-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-title);
  margin: 0 0 12px 0;
}

.prompt-desc {
  font-size: 0.95rem;
  color: #555;
  line-height: 1.5;
  margin: 0 0 24px 0;
}

.prompt-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel {
  flex: 1;
  padding: 12px 0;
  border-radius: 12px;
  border: none;
  background: #f0f0f0;
  color: #555;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
}

.btn-confirm {
  flex: 1;
  padding: 12px 0;
  border-radius: 12px;
  border: none;
  background: var(--color-primary);
  color: var(--color-bg-surface);
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
}

/* Modal Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>

import { BookOpen, User, Bell } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { ref, onMounted } from 'vue'
import { useUserStore } from '../store/user'

const route = useRoute()
const userStore = useUserStore()

const showPrompt = ref(false)
const VAPID_PUBLIC_KEY = 'BBOhr7vlawsYEFIiLCPEDKVGyQze6UfOkDaGPwB_TO6Ccws6PV0chzAQsIooCJqNlJxu7zGfOxIAbXlTSh_tXT8'

onMounted(() => {
  // Only show if logged in, browser supports push, and hasn't been dismissed
  if (userStore.isLoggedIn && 'serviceWorker' in navigator && 'PushManager' in window) {
    if (Notification.permission === 'default' && !localStorage.getItem('pushPromptDismissed')) {
      // Delay prompt slightly for better UX
      setTimeout(() => {
        showPrompt.value = true
      }, 1500)
    }
  }
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
            <component :is="Component" v-if="route.meta.keepAlive" :key="route.path" />
          </keep-alive>
        </transition>
        <transition name="fade" mode="out-in">
          <component :is="Component" v-if="!route.meta.keepAlive" :key="route.path" />
        </transition>
      </router-view>
    </main>

    <!-- 底部 Tab 导航栏 -->
    <nav class="bottom-tab-bar">
      <router-link to="/words" class="tab-item" :class="{ active: route.path === '/words' }">
        <BookOpen :size="24" :stroke-width="route.path === '/words' ? 2.5 : 2" />
        <span>单词</span>
      </router-link>
      
      <router-link to="/profile" class="tab-item" :class="{ active: route.path === '/profile' }">
        <User :size="24" :stroke-width="route.path === '/profile' ? 2.5 : 2" />
        <span>我的</span>
      </router-link>
    </nav>

    <!-- Custom Notification Prompt Modal -->
    <transition name="modal-fade">
      <div v-if="showPrompt" class="prompt-overlay">
        <div class="prompt-card">
          <div class="prompt-icon-wrap">
            <Bell :size="28" color="#0033A0" />
          </div>
          <h3 class="prompt-title">开启每日新词推送？</h3>
          <p class="prompt-desc">每天早晨 7 点准时送达，不错过每一篇优美短文和单词解析，养成好习惯。</p>
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
  background-color: var(--color-bg);
}

.main-content {
  flex: 1;
  overflow-y: auto; /* 允许内部滚动 */
  position: relative;
}

.bottom-tab-bar {
  height: 64px;
  /* 苹果底边安全距离适配（iPhone 小黑条） */
  padding-bottom: env(safe-area-inset-bottom); 
  display: flex;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -2px 10px rgba(0,0,0,0.02);
  z-index: 50;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-decoration: none;
  color: var(--color-text-muted);
  transition: color 0.2s ease;
  /* 禁用 iOS 长按弹出菜单（拷贝链接等） */
  -webkit-touch-callout: none;
  user-select: none;
  -webkit-user-select: none;
}

.tab-item span {
  font-size: 11px;
  font-weight: 500;
}

.tab-item.active {
  color: var(--color-primary);
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
  background: #fff;
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
  color: #191c1d;
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
  background: #0033A0;
  color: #fff;
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

<script setup lang="ts">
import { Toaster, toast } from 'vue-sonner'
import { watch, onMounted } from 'vue'
import { useUserStore } from './store/user'

// 这里的 virtual 模块由 vite-plugin-pwa 自动生成
// 如果 TS 报错找不到模块，可以忽略，因为打包时会自动注入
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegistered(r: any) {
    if (r) {
      // 每小时定时检查一次更新
      setInterval(() => {
        r.update()
      }, 60 * 60 * 1000)
      
      // 每次用户从后台切回应用时，立刻检查更新
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          r.update()
        }
      })
    }
  }
})

watch(needRefresh, (isNeed) => {
  if (isNeed) {
    toast.info('🚀 发现新版本', {
      description: '应用已在后台准备好新版本，请更新以获得最佳体验。',
      duration: Number.POSITIVE_INFINITY, // 保持不消失直到用户点击
      action: {
        label: '立即更新',
        onClick: () => {
          updateServiceWorker()
        }
      }
    })
  }
})

const userStore = useUserStore()

onMounted(() => {
  // Activity Ping for Smart Push
  if (userStore.token) {
    const today = new Date().toISOString().split('T')[0]
    if (localStorage.getItem('lastActiveDate') !== today) {
      fetch('/api/ping', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer real-jwt-token-for-${userStore.userInfo?.username}`
        }
      }).then(res => {
        if (res.ok) localStorage.setItem('lastActiveDate', today)
      }).catch(console.error)
    }
  }
})


</script>

<template>
  <div class="app-root">
    <router-view v-slot="{ Component }">
      <vue-page-stack>
        <component :is="Component" />
      </vue-page-stack>
    </router-view>
  </div>
  
  <!-- 全局精美 Toast -->
  <Toaster position="top-center" richColors />
</template>

<style>
/* 保证动画期间父容器绝对占满，不出现滚动条 */
.app-root {
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: #000; /* 底部黑色背景，iOS 滑动时边缘更真实 */
}

/* 页面容器必须是绝对定位，才能重叠滑动 */
.app-root > div:not([data-sonner-toaster]) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--color-bg); /* 页面底色 */
  box-shadow: -4px 0 16px rgba(0,0,0,0.05); /* 左侧阴影，模拟纸张叠放 */
}
</style>

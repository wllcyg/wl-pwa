<script setup lang="ts">
import { Toaster, toast } from 'vue-sonner'
import { watch, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from './store/user'

// 这里的 virtual 模块由 vite-plugin-pwa 自动生成
// 如果 TS 报错找不到模块，可以忽略，因为打包时会自动注入
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh, updateServiceWorker } = useRegisterSW()

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

const router = useRouter()
const userStore = useUserStore()
const transitionName = ref('slide-left')

onMounted(() => {
  // Activity Ping for Smart Push
  if (userStore.isLoggedIn) {
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

// 定义路由层级，模拟 iOS 的推进和返回
const getDepth = (path: string) => {
  if (path === '/login') return 0
  if (path === '/' || path === '/words' || path === '/profile') return 1
  if (path === '/edit-profile') return 2
  return path.split('/').length
}

router.afterEach((to, from) => {
  const toDepth = getDepth(to.path)
  const fromDepth = getDepth(from.path)
  // 当层级相同时（例如在 Tab 间切换），为了避免奇怪的左右横跳，也默认使用简单的 fade 或者静止
  if (toDepth === fromDepth) {
    transitionName.value = 'fade'
  } else {
    transitionName.value = toDepth < fromDepth ? 'slide-right' : 'slide-left'
  }
})
</script>

<template>
  <div class="app-root">
    <router-view v-slot="{ Component }">
      <transition :name="transitionName">
        <component :is="Component" />
      </transition>
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

/* =========== iOS 滑动动画核心 =========== */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.45s cubic-bezier(0.36, 0.66, 0.04, 1), 
              opacity 0.45s cubic-bezier(0.36, 0.66, 0.04, 1);
  will-change: transform, opacity;
}

/* 前进（推入）：新页面从右边进来 */
.slide-left-enter-from {
  transform: translateX(100%);
}
/* 前进（推入）：老页面往左边退去，并变暗 */
.slide-left-leave-to {
  transform: translateX(-25%);
  opacity: 0.4;
}

/* 后退（拉出）：底下老页面从左边 -25% 恢复 */
.slide-right-enter-from {
  transform: translateX(-25%);
  opacity: 0.4;
}
/* 后退（拉出）：当前页面往右边 100% 退出 */
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>

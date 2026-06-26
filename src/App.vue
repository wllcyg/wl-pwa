<script setup lang="ts">
import { Toaster, toast } from 'vue-sonner'
import { watch } from 'vue'

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
</script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
  
  <!-- 全局精美 Toast -->
  <Toaster position="top-center" richColors />
</template>

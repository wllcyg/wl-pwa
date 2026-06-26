<script setup lang="ts">
import { BookOpen, User } from '@lucide/vue'
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="layout-wrapper">
    <!-- 顶部和中间内容区：由子路由接管 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
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
}

.tab-item span {
  font-size: 11px;
  font-weight: 500;
}

.tab-item.active {
  color: var(--color-primary);
}
</style>

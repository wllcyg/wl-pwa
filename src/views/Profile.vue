<script setup lang="ts">
import { useUserStore } from '../store/user'
import { useRouter } from 'vue-router'
import { Moon, Info, ChevronRight } from '@lucide/vue'
import { ref } from 'vue'
import packageJson from '../../package.json'

const userStore = useUserStore()
const router = useRouter()

const isDarkMode = ref(false)
const appVersion = `v${packageJson.version}`

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
}

const goToEditProfile = () => {
  router.push('/edit-profile')
}
</script>

<template>
  <div class="profile-page">
    <!-- 头像和用户名 -->
    <section class="user-hero" @click="goToEditProfile">
      <div class="avatar-wrapper">
        <img src="/default-avatar.png" alt="User Avatar" class="avatar-img" />
      </div>
      <div class="user-info">
        <h2 class="username">学习者_8923</h2>
        <div class="edit-hint">
          <span>编辑资料</span>
          <ChevronRight :size="14" />
        </div>
      </div>
    </section>

    <!-- 设置组 -->
    <section class="settings-group">
      <ul class="settings-list">
        <!-- 夜间模式 -->
        <li class="setting-item border-bottom" @click="toggleTheme">
          <div class="item-left">
            <Moon :size="22" class="icon" />
            <span class="item-text">夜间模式</span>
          </div>
          <!-- 开关容器 -->
          <button class="toggle-track" :class="{ 'toggle-active': isDarkMode }">
            <span class="toggle-thumb" :class="{ 'thumb-active': isDarkMode }"></span>
          </button>
        </li>
        <!-- 版本号 -->
        <li class="setting-item">
          <div class="item-left">
            <Info :size="22" class="icon" />
            <span class="item-text">当前版本</span>
          </div>
          <span class="version-text">{{ appVersion }}</span>
        </li>
      </ul>
    </section>

    <!-- 退出登录 -->
    <section class="logout-section">
      <button class="logout-button" @click="handleLogout">
        退出登录
      </button>
    </section>
  </div>
</template>

<style scoped>
/* 背景与间距 */
.profile-page {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: 32px 16px 80px 16px; /* 底部留白给 Tab */
  background-color: #f8f9fa; /* bg-background */
  min-height: 100%;
}

/* User Hero */
.user-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 32px;
  margin-bottom: 24px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  padding: 8px;
  border-radius: 24px;
  transition: background-color 0.2s;
}

.user-hero:active {
  background-color: rgba(0, 0, 0, 0.03);
}

.avatar-wrapper {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid rgba(193, 198, 215, 0.3);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
  background-color: #e1e3e4;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.username {
  font-size: 22px;
  font-weight: 600;
  color: #191c1d;
  letter-spacing: -0.01em;
}

.edit-hint {
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 500;
  padding: 4px 12px;
  background-color: rgba(0, 0, 0, 0.04);
  border-radius: 9999px;
}

/* Settings Group */
.settings-group {
  background-color: #ffffff; /* bg-surface-container-lowest */
  border-radius: 16px; /* rounded-2xl */
  border: 1px solid #edeeef; /* border-surface-container */
  overflow: hidden;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
  margin-bottom: 24px;
}

.settings-list {
  display: flex;
  flex-direction: column;
  list-style: none;
  padding: 0;
  margin: 0;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px; /* py-4 px-padding-card */
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.setting-item:active {
  background-color: rgba(0,0,0,0.02);
}

.border-bottom {
  border-bottom: 1px solid rgba(193, 198, 215, 0.2); /* border-outline-variant/20 */
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12px; /* gap-3 */
}

.icon {
  color: #414755; /* text-on-surface-variant */
}

.item-text {
  font-size: 17px; /* text-body-lg */
  font-weight: 400;
  color: #191c1d; /* text-on-surface */
  letter-spacing: -0.01em;
}

.version-text {
  font-size: 15px; /* text-body-md */
  color: #414755; /* text-on-surface-variant */
}

/* Toggle Switch */
.toggle-track {
  position: relative;
  display: inline-flex;
  height: 24px; /* h-6 */
  width: 44px; /* w-11 */
  align-items: center;
  border-radius: 9999px;
  background-color: rgba(193, 198, 215, 0.5); /* bg-outline-variant/50 */
  border: none;
  padding: 0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.toggle-active {
  background-color: var(--color-primary); /* 你可以改成 #0058bc 如果想要原图那种蓝 */
}

.toggle-thumb {
  display: inline-block;
  height: 16px; /* h-4 */
  width: 16px; /* w-4 */
  transform: translateX(4px); /* translate-x-1 */
  border-radius: 9999px;
  background-color: white;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.thumb-active {
  transform: translateX(24px); /* 大概是 w-11 减去 thumb 宽度 */
}

/* Logout Button */
.logout-section {
  padding-top: 8px; /* pt-spacer-sm */
  padding-bottom: 32px; /* pb-spacer-xl */
}

.logout-button {
  width: 100%;
  background-color: rgba(255, 218, 214, 0.4); /* bg-error-container/20 */
  color: #ba1a1a; /* text-error */
  font-size: 17px; /* text-headline-sm */
  font-weight: 600; /* font-bold */
  padding: 16px 0; /* py-4 */
  border-radius: 16px; /* rounded-2xl */
  border: none;
  cursor: pointer;
  letter-spacing: -0.01em;
  transition: background-color 0.15s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.logout-button:active {
  background-color: rgba(255, 218, 214, 0.6); /* hover:bg-error-container/40 */
  transform: scale(0.98); /* active:scale-[0.98] */
}
</style>

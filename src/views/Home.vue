<script setup lang="ts">
import { useUserStore } from '../store/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="home-wrapper">
    <header class="home-header">
      <div class="user-avatar"></div>
      <button class="logout-btn" @click="handleLogout">Logout</button>
    </header>
    
    <main class="home-main">
      <h1>Hello, Developer.</h1>
      <p>This is your protected PWA home screen.</p>
    </main>
  </div>
</template>

<style scoped>
.home-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg);
}

.home-header {
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--color-primary);
}

.logout-btn {
  font-size: 14px;
  color: var(--color-text-muted);
  font-weight: 500;
  transition: color 0.15s;
}

.logout-btn:hover {
  color: var(--color-text-main);
}

.home-main {
  padding: 32px 20px;
}

.home-main h1 {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: 8px;
}

.home-main p {
  color: var(--color-text-muted);
  font-size: 15px;
}
</style>

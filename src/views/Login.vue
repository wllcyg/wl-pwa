<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { Loader2 } from '@lucide/vue'
import { toast } from 'vue-sonner'

const router = useRouter()
const userStore = useUserStore()

const isLoginMode = ref(true)
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  // 切换模式时清空密码
  password.value = ''
  confirmPassword.value = ''
}

const handleSubmit = async () => {
  if (!username.value || !password.value) {
    toast.error('请填写完整的账号和密码')
    return
  }

  // 校验：用户名不能以数字开头
  if (/^\d/.test(username.value)) {
    toast.error('用户名不能以数字开头')
    return
  }

  if (!isLoginMode.value && password.value !== confirmPassword.value) {
    toast.error('两次输入的密码不一致')
    return
  }

  loading.value = true

  try {
    const endpoint = isLoginMode.value ? '/api/login' : '/api/register'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || '请求失败，请检查账号密码')
    }

    // 成功，保存由 Cloudflare Hono 返回的 Token
    userStore.setToken(data.token)
    toast.success(isLoginMode.value ? '登录成功，欢迎回来！' : '注册成功！')
    router.push('/words')
  } catch (error: any) {
    toast.error(error.message || '网络或服务器错误')
  } finally {
    loading.value = false
  }
}

const submitText = computed(() => isLoginMode.value ? '登录' : '注册账号')
</script>

<template>
  <div class="login-wrapper">
    <div class="login-header">
      <img src="/login-hero.png" alt="App Illustration" class="hero-image" />
    </div>

    <form class="login-form" @submit.prevent="handleSubmit">
      <div class="mode-title">
        <h2>{{ isLoginMode ? '欢迎回来' : '创建新账号' }}</h2>
      </div>

      <div class="input-group">
        <label>用户名</label>
        <input type="text" v-model="username" placeholder="请输入您的用户名" autocomplete="username" />
      </div>

      <div class="input-group">
        <label>密码</label>
        <input type="password" v-model="password" placeholder="请输入密码" autocomplete="new-password" />
      </div>

      <!-- 注册模式下才显示确认密码 -->
      <div class="input-group" v-if="!isLoginMode">
        <label>确认密码</label>
        <input type="password" v-model="confirmPassword" placeholder="请再次输入密码" autocomplete="new-password" />
      </div>

      <button type="submit" class="submit-btn" :disabled="loading">
        <Loader2 v-if="loading" class="spin-icon" :size="20" />
        <span v-else>{{ submitText }}</span>
      </button>

      <div class="toggle-mode" @click="toggleMode">
        {{ isLoginMode ? '没有账号？点击注册' : '已有账号？点击登录' }}
      </div>
    </form>
  </div>
</template>

<style scoped>
.login-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 24px;
  background-color: var(--color-bg);
}

.login-header {
  margin-bottom: 32px;
  display: flex;
  justify-content: center;
}

.hero-image {
  width: 220px;
  height: 180px;
  object-fit: contain;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mode-title {
  margin-bottom: 8px;
  text-align: center;
}

.mode-title h2 {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text-main);
  margin-bottom: 4px;
}

.mode-title p {
  font-size: 14px;
  color: var(--color-text-muted);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-main);
}

.input-group input {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  font-size: 15px;
  color: var(--color-text-main);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input-group input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.15);
  /* 适配现在的蓝色 */
}

.submit-btn {
  margin-top: 8px;
  background-color: var(--color-primary);
  color: white;
  padding: 14px;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.submit-btn:hover {
  background-color: var(--color-primary-hover);
}

.submit-btn:active {
  transform: scale(0.98);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.toggle-mode {
  text-align: center;
  font-size: 14px;
  color: var(--color-text-muted);
  margin-top: 16px;
  cursor: pointer;
  transition: color 0.15s;
}

.toggle-mode:hover {
  color: var(--color-primary);
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>

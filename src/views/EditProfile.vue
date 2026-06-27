<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Camera, Loader2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useUserStore } from '../store/user'

const router = useRouter()
const userStore = useUserStore()

// 绑定到 store
const username = ref(userStore.userInfo?.nickname || userStore.userInfo?.username || '')
const avatarUrl = ref(userStore.userInfo?.avatarUrl || '/default-avatar.png')
const loading = ref(false)

const goBack = () => {
  router.back()
}

const fileInput = ref<HTMLInputElement | null>(null)

// 真实触发图片选择
const handleAvatarChange = () => {
  fileInput.value?.click()
}

// 真实上传逻辑
const onFileSelected = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  if (file.size > 5 * 1024 * 1024) {
    toast.error('图片过大，请限制在 5MB 以内')
    return
  }

  const formData = new FormData()
  formData.append('file', file)

  const loadingToast = toast.loading('正在上传头像...')
  
  try {
    const res = await fetch('/api/upload-avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      },
      body: formData
    })
    
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '上传失败')

    avatarUrl.value = data.avatarUrl
    
    // 更新 store
    if (userStore.userInfo) {
      userStore.setUserInfo({ ...userStore.userInfo, avatarUrl: data.avatarUrl })
    }

    toast.success('头像上传成功！', { id: loadingToast })
  } catch (error: any) {
    toast.error(error.message, { id: loadingToast })
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

const handleSave = async () => {
  if (!username.value.trim()) {
    toast.error('昵称不能为空')
    return
  }
  
  if (username.value.length < 1 || username.value.length > 12) {
    toast.error('昵称长度必须在 1-12 个字符之间')
    return
  }

  loading.value = true
  
  try {
    const res = await fetch('/api/update-nickname', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userStore.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ nickname: username.value })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || '保存失败')

    if (userStore.userInfo) {
      userStore.setUserInfo({ ...userStore.userInfo, nickname: data.nickname })
    }
    
    toast.success('个人信息保存成功')
    router.back()
  } catch (error: any) {
    toast.error(error.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="edit-profile-page">
    <!-- 顶部导航栏 -->
    <header class="navbar">
      <button class="icon-btn" @click="goBack">
        <ChevronLeft :size="28" />
      </button>
      <h1 class="nav-title">编辑个人资料</h1>
      <div class="placeholder"></div>
    </header>

    <div class="content">
      <!-- 隐藏的 input -->
      <input type="file" ref="fileInput" accept="image/*" class="hidden-input" @change="onFileSelected" />

      <!-- 头像修改区 -->
      <section class="avatar-section">
        <div class="avatar-wrapper" @click="handleAvatarChange">
          <img 
            :src="avatarUrl" 
            @error="e => (e.target as HTMLImageElement).src = '/default-avatar.png'"
            alt="Avatar" 
            class="avatar-img" 
          />
          <div class="avatar-overlay">
            <Camera :size="24" class="camera-icon" />
          </div>
        </div>
        <span class="change-text">点击更换头像</span>
      </section>

      <!-- 表单区 -->
      <form class="edit-form" @submit.prevent="handleSave">
        <div class="input-group">
          <label>昵称</label>
          <input 
            type="text" 
            v-model="username" 
            placeholder="请输入新的昵称" 
          />
          <p class="input-hint">用来在应用中展示你的名字，最长 12 个字符。</p>
        </div>

        <button type="submit" class="save-btn" :disabled="loading">
          <Loader2 v-if="loading" class="spin-icon" :size="20" />
          <span v-else>保存修改</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.edit-profile-page {
  min-height: 100dvh;
  background-color: var(--color-bg-page);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* 导航栏 */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background-color: var(--color-bg-surface);
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
}

.icon-btn {
  background: none;
  border: none;
  color: var(--color-text-main);
  padding: 4px;
  margin-left: -4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.icon-btn:active {
  background-color: rgba(0, 0, 0, 0.05);
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-text-main);
}

.placeholder {
  width: 36px; /* 和返回按钮对称 */
}

.hidden-input {
  display: none;
}

/* 主体内容 */
.content {
  padding: 32px 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 头像部分 */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;
}

.avatar-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.2s;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.camera-icon {
  color: white;
}

.avatar-wrapper:active .avatar-overlay {
  opacity: 1;
}

/* 在支持 hover 的设备上显示遮罩 */
@media (hover: hover) {
  .avatar-wrapper:hover .avatar-overlay {
    opacity: 1;
  }
}

.change-text {
  margin-top: 12px;
  font-size: 13px;
  color: var(--color-text-muted);
}

/* 表单部分 */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-main);
}

.input-group input {
  padding: 14px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-surface);
  font-size: 16px;
  color: var(--color-text-main);
  outline: none;
  transition: all 0.2s ease;
}

.input-group input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.15);
}

.input-hint {
  font-size: 12px;
  color: var(--color-text-muted);
}

.save-btn {
  background-color: var(--color-primary);
  color: white;
  padding: 16px;
  border-radius: 100px; /* 全圆角按钮，更现代 */
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.save-btn:active {
  transform: scale(0.98);
}

.save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

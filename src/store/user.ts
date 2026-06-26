import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 从 localStorage 初始化 token
  const token = ref<string>(localStorage.getItem('token') || '')
  const userInfo = ref<{ username: string, nickname: string, avatarUrl: string } | null>(
    JSON.parse(localStorage.getItem('userInfo') || 'null')
  )

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function setUserInfo(info: any) {
    userInfo.value = info
    localStorage.setItem('userInfo', JSON.stringify(info))
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  return { token, userInfo, setToken, setUserInfo, logout }
})

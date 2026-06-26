import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  // 从 localStorage 初始化 token
  const token = ref<string>(localStorage.getItem('token') || '')

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function logout() {
    token.value = ''
    localStorage.removeItem('token')
  }

  return { token, setToken, logout }
})

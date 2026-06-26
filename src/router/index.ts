import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../store/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    redirect: '/words',
    children: [
      {
        path: 'words',
        name: 'Words',
        component: () => import('../views/Words.vue')
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue')
      }
    ]
  },
  {
    path: '/edit-profile',
    name: 'EditProfile',
    component: () => import('../views/EditProfile.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：登录拦截
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.token) {
    // 如果需要权限但没登录，踢去登录页
    next('/login')
  } else if (to.path === '/login' && userStore.token) {
    // 如果已经登录还去登录页，直接进首页
    next('/')
  } else {
    next()
  }
})

export default router

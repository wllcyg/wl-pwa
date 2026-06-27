import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import 'vue-sonner/style.css'
import App from './App.vue'
import { VuePageStackPlugin } from 'vue-page-stack'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VuePageStackPlugin, { router })

app.mount('#app')

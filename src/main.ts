import { createApp } from 'vue'
import { i18n } from './locales'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import VueKonva from 'vue-konva'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

app.use(i18n)
app.use(ElementPlus)
app.use(VueKonva)

app.mount('#app')

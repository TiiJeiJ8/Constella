import { createApp } from 'vue'
import { i18n } from './locales'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import VueKonva from 'vue-konva'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
import { registerPlugins } from './plugins/register'
import { applyStoredTheme } from './utils/theme'

// 创建应用实例
applyStoredTheme()
const app = createApp(App)

// 异步注册所有内容类型插件
registerPlugins().catch(err => {
    console.error('[Plugins] Failed to register plugins:', err)
})

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

app.use(i18n)
app.use(ElementPlus)
app.use(VueKonva)

app.mount('#app')

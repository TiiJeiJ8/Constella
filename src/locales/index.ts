import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN.json'
import enUS from './en-US.json'

// 获取保存的语言，默认中文
const savedLocale = localStorage.getItem('locale') || 'zh-CN'

export const i18n = createI18n({
    legacy: false,
    locale: savedLocale,
    fallbackLocale: 'zh-CN',
    messages: {
        'zh-CN': zhCN,
        'en-US': enUS
    }
})

export const availableLocales = [
    { code: 'zh-CN', name: '简体中文' },
    { code: 'en-US', name: 'English' }
]

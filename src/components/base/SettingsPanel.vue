<template>
    <Teleport to="body">
        <Transition name="overlay">
            <div v-if="isOpen" class="settings-overlay" @click="handleOverlayClick"></div>
        </Transition>
        
        <Transition name="slide">
            <div v-if="isOpen" class="settings-panel">
                <!-- 顶部标题栏 -->
                <div class="settings-header">
                    <h2 class="settings-title">{{ t('settings.title') }}</h2>
                    <button class="close-btn" @click="closePanel" :title="t('settings.close')">
                        <CloseIcon />
                    </button>
                </div>

                <div class="settings-content">
                    <!-- 左侧分类导航 -->
                    <div class="settings-nav">
                        <button
                            v-for="category in categories"
                            :key="category.key"
                            class="nav-item"
                            :class="{ active: activeCategory === category.key }"
                            @click="activeCategory = category.key"
                        >
                            <component :is="category.icon" class="nav-icon" />
                            <span class="nav-text">{{ t(`settings.categories.${category.key}`) }}</span>
                        </button>
                    </div>

                    <!-- 右侧设置项 -->
                    <div class="settings-main">
                        <!-- 通用设置 -->
                        <div v-show="activeCategory === 'general'" class="settings-section">
                            <h3 class="section-title">{{ t('settings.general.title') }}</h3>
                            
                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.general.language') }}</label>
                                <select v-model="settingsData.language" class="setting-select">
                                    <option value="zh-CN">简体中文</option>
                                    <option value="en-US">English</option>
                                </select>
                            </div>

                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.general.autoSave') }}</label>
                                <label class="toggle-switch">
                                    <input type="checkbox" v-model="settingsData.autoSave" />
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>

                            <div class="setting-item" v-if="settingsData.autoSave">
                                <label class="setting-label">{{ t('settings.general.autoSaveInterval') }}</label>
                                <input 
                                    type="number" 
                                    v-model.number="settingsData.autoSaveInterval" 
                                    class="setting-input"
                                    min="10"
                                    max="300"
                                />
                            </div>
                        </div>

                        <!-- 外观设置 -->
                        <div v-show="activeCategory === 'appearance'" class="settings-section">
                            <h3 class="section-title">{{ t('settings.appearance.title') }}</h3>
                            
                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.appearance.theme') }}</label>
                                <select v-model="settingsData.theme" class="setting-select">
                                    <option value="light">{{ t('theme.light') }}</option>
                                    <option value="dark">{{ t('theme.dark') }}</option>
                                </select>
                            </div>

                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.appearance.fontSize') }}</label>
                                <input 
                                    type="number" 
                                    v-model.number="settingsData.fontSize" 
                                    class="setting-input"
                                    min="12"
                                    max="24"
                                />
                            </div>

                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.appearance.fontFamily') }}</label>
                                <select v-model="settingsData.fontFamily" class="setting-select">
                                    <option value="system">System Default</option>
                                    <option value="serif">Serif</option>
                                    <option value="sans-serif">Sans-serif</option>
                                    <option value="monospace">Monospace</option>
                                </select>
                            </div>
                        </div>

                        <!-- 编辑器设置 -->
                        <div v-show="activeCategory === 'editor'" class="settings-section">
                            <h3 class="section-title">{{ t('settings.editor.title') }}</h3>
                            
                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.editor.defaultFormat') }}</label>
                                <select v-model="settingsData.defaultFormat" class="setting-select">
                                    <option value="markdown">Markdown</option>
                                    <option value="text">Plain Text</option>
                                    <option value="latex">LaTeX</option>
                                </select>
                            </div>

                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.editor.spellCheck') }}</label>
                                <label class="toggle-switch">
                                    <input type="checkbox" v-model="settingsData.spellCheck" />
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <!-- 协作设置 -->
                        <div v-show="activeCategory === 'collaboration'" class="settings-section">
                            <h3 class="section-title">{{ t('settings.collaboration.title') }}</h3>
                            
                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.collaboration.showCursors') }}</label>
                                <label class="toggle-switch">
                                    <input type="checkbox" v-model="settingsData.showCursors" />
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>

                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.collaboration.showPresence') }}</label>
                                <label class="toggle-switch">
                                    <input type="checkbox" v-model="settingsData.showPresence" />
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <!-- 高级设置 -->
                        <div v-show="activeCategory === 'advanced'" class="settings-section">
                            <h3 class="section-title">{{ t('settings.advanced.title') }}</h3>
                            
                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.advanced.debugMode') }}</label>
                                <label class="toggle-switch">
                                    <input type="checkbox" v-model="settingsData.debugMode" />
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>

                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.advanced.clearCache') }}</label>
                                <button class="danger-btn" @click="clearCache">
                                    {{ t('settings.advanced.clearCache') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    CloseIcon,
    SettingIcon,
    ViewListIcon,
    Edit1Icon,
    UserCircleIcon,
    ToolsIcon
} from 'tdesign-icons-vue-next'

const { t, locale } = useI18n()

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(props.modelValue)
const activeCategory = ref('general')

// 分类列表
const categories = [
    { key: 'general', icon: SettingIcon },
    { key: 'appearance', icon: ViewListIcon },
    { key: 'editor', icon: Edit1Icon },
    { key: 'collaboration', icon: UserCircleIcon },
    { key: 'advanced', icon: ToolsIcon }
]

// 设置数据
const settingsData = reactive({
    language: 'zh-CN',
    autoSave: true,
    autoSaveInterval: 30,
    theme: 'light',
    fontSize: 14,
    fontFamily: 'system',
    defaultFormat: 'markdown',
    spellCheck: true,
    showCursors: true,
    showPresence: true,
    debugMode: false
})

// 监听 modelValue 变化
watch(() => props.modelValue, (newVal) => {
    isOpen.value = newVal
})

// 监听 isOpen 变化
watch(isOpen, (newVal) => {
    emit('update:modelValue', newVal)
})

// 加载保存的设置
const loadSettings = () => {
    const saved = localStorage.getItem('settings')
    if (saved) {
        Object.assign(settingsData, JSON.parse(saved))
    }
}

// 保存设置
const saveSettings = () => {
    localStorage.setItem('settings', JSON.stringify(settingsData))
}

// 监听设置变化并自动保存
watch(settingsData, () => {
    saveSettings()
    applySettings()
}, { deep: true })

// 应用设置
const applySettings = () => {
    // 应用语言设置
    if (settingsData.language !== locale.value) {
        locale.value = settingsData.language
        localStorage.setItem('locale', settingsData.language)
    }
    
    // 应用主题设置
    if (settingsData.theme) {
        document.documentElement.setAttribute('data-theme', settingsData.theme)
        localStorage.setItem('theme', settingsData.theme)
    }
}

// 关闭面板
const closePanel = () => {
    isOpen.value = false
}

// 点击遮罩层关闭
const handleOverlayClick = () => {
    closePanel()
}

// 清除缓存
const clearCache = () => {
    if (confirm(locale.value === 'zh-CN' ? '确定要清除缓存吗？' : 'Are you sure to clear cache?')) {
        localStorage.clear()
        alert(locale.value === 'zh-CN' ? '缓存已清除，请重启应用' : 'Cache cleared, please restart the app')
    }
}

// 初始化时加载设置
loadSettings()
applySettings()
</script>

<style scoped>
/* ==================== 遮罩层 ==================== */
.settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2000;
    backdrop-filter: blur(2px);
}

/* ==================== 设置面板 ==================== */
.settings-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 680px;
    background: var(--bg-primary);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
    z-index: 2001;
    display: flex;
    flex-direction: column;
    border-radius: 12px 0 0 12px;
}

/* ==================== 顶部标题栏 ==================== */
.settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
    -webkit-app-region: drag;
}

.settings-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: all 0.2s ease;
    -webkit-app-region: no-drag;
}

.close-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

/* ==================== 内容区域 ==================== */
.settings-content {
    flex: 1;
    display: flex;
    overflow: hidden;
}

/* ==================== 左侧导航 ==================== */
.settings-nav {
    width: 200px;
    padding: 16px 12px;
    border-right: 1px solid var(--border-color);
    overflow-y: auto;
}

.nav-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    margin-bottom: 4px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 0.875rem;
    transition: all 0.2s ease;
    cursor: pointer;
    text-align: left;
}

.nav-item:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.nav-item.active {
    background: var(--accent-primary);
    color: #fff;
}

.nav-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

.nav-text {
    flex: 1;
}

/* ==================== 右侧主内容 ==================== */
.settings-main {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
}

.settings-section {
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 20px 0;
}

/* ==================== 设置项 ==================== */
.setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid var(--border-light);
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    flex: 1;
}

.setting-select,
.setting-input {
    width: 200px;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 0.875rem;
    transition: all 0.2s ease;
}

.setting-select:focus,
.setting-input:focus {
    border-color: var(--accent-primary);
    outline: none;
}

/* ==================== 开关按钮 ==================== */
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 26px;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--border-color);
    transition: 0.3s;
    border-radius: 26px;
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
    background-color: var(--accent-primary);
}

.toggle-switch input:checked + .toggle-slider:before {
    transform: translateX(22px);
}

/* ==================== 危险按钮 ==================== */
.danger-btn {
    padding: 8px 16px;
    background: #e53935;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.danger-btn:hover {
    background: #c62828;
}

/* ==================== 过渡动画 ==================== */
.overlay-enter-active,
.overlay-leave-active {
    transition: opacity 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
    opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
    transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
    transform: translateX(100%);
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
    .settings-panel {
        width: 100%;
    }

    .settings-content {
        flex-direction: column;
    }

    .settings-nav {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        flex-wrap: wrap;
        padding: 12px;
    }

    .nav-item {
        flex: 0 0 calc(50% - 4px);
        margin-bottom: 8px;
    }

    .setting-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }

    .setting-select,
    .setting-input {
        width: 100%;
    }
}
</style>

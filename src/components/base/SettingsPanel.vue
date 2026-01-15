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
                        <!-- 账户设置 -->
                        <div v-show="activeCategory === 'account'" class="settings-section">
                            <h3 class="section-title">{{ t('settings.account.title') }}</h3>
                            
                            <!-- 头像 -->
                            <div class="setting-item avatar-item">
                                <label class="setting-label">{{ t('settings.account.avatar') }}</label>
                                <div class="avatar-controls">
                                    <div class="avatar-preview">
                                        <img :src="settingsData.avatar" :alt="settingsData.userId" />
                                    </div>
                                    <button class="change-avatar-btn" @click="changeAvatar">
                                        {{ t('settings.account.changeAvatar') }}
                                    </button>
                                </div>
                            </div>

                            <!-- 用户 ID -->
                            <div class="setting-item userid-item">
                                <div class="label-with-help">
                                    <label class="setting-label">{{ t('settings.account.userId') }}</label>
                                    <div class="help-icon-wrapper" :title="t('settings.account.userIdHint')">
                                        <HelpCircleIcon class="help-icon" />
                                    </div>
                                </div>
                                <div class="input-with-button">
                                    <input 
                                        v-model="settingsData.userId" 
                                        type="text"
                                        class="setting-input"
                                        :class="{ 'error': userIdError }"
                                        :placeholder="t('settings.account.userIdPlaceholder')"
                                        @blur="checkUserId"
                                    />
                                    <button class="icon-btn" @click="regenerateUserId" :title="t('settings.account.regenerateId')">
                                        <RefreshIcon />
                                    </button>
                                </div>
                                <div v-if="userIdError" class="error-text">{{ userIdError }}</div>
                            </div>

                            <!-- 姓名 -->
                            <div class="setting-item name-group">
                                <label class="setting-label">{{ t('settings.account.name') }}</label>
                                <div class="name-inputs">
                                    <div class="name-field">
                                        <input 
                                            v-model="settingsData.lastName" 
                                            type="text"
                                            class="setting-input"
                                            :placeholder="t('settings.account.lastName')"
                                        />
                                    </div>
                                    <div class="name-field">
                                        <input 
                                            v-model="settingsData.firstName" 
                                            type="text"
                                            class="setting-input"
                                            :placeholder="t('settings.account.firstName')"
                                        />
                                    </div>
                                    <button class="icon-btn" @click="regenerateName" :title="t('settings.account.regenerateName')">
                                        <RefreshIcon />
                                    </button>
                                </div>
                            </div>

                            <!-- 邮箱 -->
                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.account.email') }}</label>
                                <input 
                                    v-model="settingsData.email" 
                                    type="email"
                                    class="setting-input"
                                    :placeholder="t('settings.account.emailPlaceholder')"
                                />
                            </div>
                        </div>

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
                            <!-- 仅保留主题设置；字体相关设置已移除 -->
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
import { ref, reactive, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    CloseIcon,
    SettingIcon,
    ViewListIcon,
    UserIcon,
    HelpCircleIcon,
    RefreshIcon
} from 'tdesign-icons-vue-next'
import {
    generateUserId,
    generateChineseName,
    generateEnglishName,
    generateAvatar,
    validateUserId
} from '@/utils/accountHelper'

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
    { key: 'account', icon: UserIcon },
    { key: 'general', icon: SettingIcon },
    { key: 'appearance', icon: ViewListIcon }
]

// 设置数据（仅保留必要项）
const settingsData = reactive({
    // 账户信息
    userId: '',
    firstName: '',
    lastName: '',
    avatar: '',
    email: '',
    // 通用设置
    language: 'zh-CN',
    // 外观设置（仅保留主题）
    theme: 'light'
})

// 验证错误
const userIdError = ref('')

// 监听 modelValue 变化
watch(() => props.modelValue, (newVal) => {
    isOpen.value = newVal
    // 面板打开时重新加载设置，确保同步外部更改
    if (newVal) {
        loadSettings()
    }
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
    // 优先使用 localStorage 中的 theme 和 locale 值
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
        settingsData.theme = savedTheme
    }
    const savedLocale = localStorage.getItem('locale')
    if (savedLocale) {
        settingsData.language = savedLocale
    }
    
    // 初始化账户信息（如果没有）
    initializeAccount()
}

// 初始化账户信息
const initializeAccount = () => {
    if (!settingsData.userId) {
        settingsData.userId = generateUserId()
    }
    
    if (!settingsData.firstName || !settingsData.lastName) {
        const name = settingsData.language === 'zh-CN' 
            ? generateChineseName() 
            : generateEnglishName()
        settingsData.firstName = name.firstName
        settingsData.lastName = name.lastName
    }
    
    if (!settingsData.avatar) {
        settingsData.avatar = generateAvatar(settingsData.userId)
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

    // 移除字体设置（不再管理字体大小）
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

// 重新生成用户 ID
const regenerateUserId = () => {
    settingsData.userId = generateUserId()
    settingsData.avatar = generateAvatar(settingsData.userId)
    userIdError.value = ''
}

// 重新生成姓名
const regenerateName = () => {
    const name = settingsData.language === 'zh-CN' 
        ? generateChineseName() 
        : generateEnglishName()
    settingsData.firstName = name.firstName
    settingsData.lastName = name.lastName
}

// 更换头像
const changeAvatar = () => {
    // 使用时间戳作为 seed 生成新头像
    const seed = `${settingsData.userId}-${Date.now()}`
    settingsData.avatar = generateAvatar(seed)
}

// 验证用户 ID
const checkUserId = () => {
    if (!settingsData.userId) {
        userIdError.value = ''
        return
    }
    
    if (!validateUserId(settingsData.userId)) {
        userIdError.value = t('settings.account.errors.invalidUserId')
    } else {
        userIdError.value = ''
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

.setting-item.userid-item {
    align-items: flex-start;
    flex-wrap: wrap;
}

.setting-item.userid-item .label-with-help {
    flex: none;
}

.setting-item.userid-item .input-with-button {
    flex: 1;
    max-width: 400px;
}

.setting-item.userid-item .error-text {
    width: 100%;
    margin-top: 8px;
    margin-left: 0;
}

.setting-item.avatar-item {
    flex-direction: column;
    align-items: flex-start;
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.label-with-help {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
}

.help-icon-wrapper {
    display: flex;
    align-items: center;
    cursor: help;
}

.help-icon {
    width: 16px;
    height: 16px;
    color: var(--text-tertiary);
    margin-right: 100px;
    transition: color 0.2s ease;
}

.help-icon-wrapper:hover .help-icon {
    color: var(--accent-primary);
}

.setting-select,
.setting-input {
    width: 220px;
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

.setting-input.error {
    border-color: #e53935;
}

/* ==================== 头像相关 ==================== */
.avatar-controls {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    margin-top: 8px;
}

.avatar-preview {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid var(--accent-primary);
    flex-shrink: 0;
}

.avatar-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.change-avatar-btn {
    padding: 8px 16px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.change-avatar-btn:hover {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    color: #fff;
}

/* ==================== 带按钮的输入框 ==================== */
.input-with-button {
    display: flex;
    gap: 8px;
    flex: 1;
    max-width: 400px;
}

.input-with-button .setting-input {
    flex: 1;
    width: auto;
}

.icon-btn {
    width: 36px;
    height: 36px;
    padding: 0;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.icon-btn:hover {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    color: #fff;
}

.icon-btn svg {
    width: 18px;
    height: 18px;
}

/* ==================== 错误提示 ==================== */
.error-text {
    font-size: 0.75rem;
    color: #e53935;
    margin-top: 4px;
}

/* ==================== 姓名输入组 ==================== */
.setting-item.name-group {
    flex-direction: column;
    align-items: flex-start;
}

.name-inputs {
    display: flex;
    gap: 12px;
    width: 100%;
    margin-top: 8px;
}

.name-field {
    flex: 1;
}

.name-field .setting-input {
    width: 100%;
}

/* ==================== 密码强度 ==================== */
.password-strength {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    font-size: 0.75rem;
}

.strength-label {
    color: var(--text-secondary);
}

.strength-indicator {
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
}

.strength-indicator.weak {
    color: #e53935;
    background: rgba(229, 57, 53, 0.1);
}

.strength-indicator.medium {
    color: #ff9800;
    background: rgba(255, 152, 0, 0.1);
}

.strength-indicator.strong {
    color: #43a047;
    background: rgba(67, 160, 71, 0.1);
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

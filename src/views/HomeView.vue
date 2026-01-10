<template>
    <div class="home-view">
        <!-- 可拖动标题栏 -->
        <div class="title-bar">
            <div class="drag-region"></div>
        </div>
        
        <!-- 窗口控制按钮 -->
        <div class="window-controls">
            <button class="window-btn minimize-btn" @click="minimizeWindow" :title="t('window.minimize')">
                <MinusIcon />
            </button>
            <button class="window-btn maximize-btn" @click="toggleMaximize" :title="t('window.maximize')">
                <RectangleIcon />
            </button>
            <button class="window-btn close-btn" @click="closeWindow" :title="t('window.close')">
                <CloseIcon />
            </button>
        </div>

        <!-- 功能按钮组 -->
        <div class="control-buttons">
            <button class="ctrl-btn github-btn" @click="openGithub" :title="t('home.footer.github')">
                <LogoGithubIcon />
            </button>
            <button class="ctrl-btn theme-btn" @click="toggleTheme" :title="isDark ? t('theme.light') : t('theme.dark')">
                <SunnyIcon v-if="!isDark" />
                <MoonIcon v-else />
            </button>
            <button class="ctrl-btn lang-btn" @click="toggleLanguage" :title="t('language.switch')">
                <span class="lang-text">{{ currentLocale === 'zh-CN' ? '中' : 'EN' }}</span>
            </button>
            <button class="ctrl-btn info-btn" @click="showInfo" :title="t('home.footer.info')">
                <HelpCircleIcon />
            </button>
            <button class="ctrl-btn settings-btn" @click="openSettings" :title="t('settings.title')">
                <SettingIcon />
            </button>
        </div>

        <!-- 入场动画容器 -->
        <div class="intro-animation" :class="{ 'fade-out': !showIntro }">
            <div class="logo-text">
                <span v-for="(char, index) in logoChars" :key="index" class="char"
                    :style="{ animationDelay: `${index * 0.1}s` }">
                    {{ char }}
                </span>
            </div>
        </div>

        <!-- 主内容 -->
        <main class="main-content" :class="{ 'show': !showIntro }">
            <Transition name="lang-fade" mode="out-in">
                <div :key="currentLocale" class="content-wrapper">
                    <!-- 标题区 -->
                    <div class="header-section">
                        <h1 class="title" style="user-select: none;">{{ t('home.title') }}</h1>
                        <p class="subtitle" style="user-select: none;">{{ t('home.subtitle') }}</p>
                    </div>

                    <!-- 服务器连接卡片 -->
                    <div class="server-card">
                        <label class="input-label">{{ t('home.serverInput.label') }}</label>
                        <div class="input-group">
                            <input v-model="serverUrl" type="text" class="server-input"
                                :placeholder="t('home.serverInput.placeholder')" @keyup.enter="connectToServer" />
                            <button class="connect-btn" @click="connectToServer">
                                {{ t('home.serverInput.connect') }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </main>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    SettingIcon,
    MoonIcon,
    SunnyIcon,
    HelpCircleIcon,
    LogoGithubIcon,
    MinusIcon,
    RectangleIcon,
    CloseIcon
} from 'tdesign-icons-vue-next'

const { t, locale } = useI18n()
const showIntro = ref(true)
const serverUrl = ref('')
const logoChars = 'Constella'.split('')
const isMaximized = ref(false)
const isDark = ref(false)

const currentLocale = computed(() => locale.value)

onMounted(() => {
    // 入场动画持续 2 秒后淡出
    setTimeout(() => {
        showIntro.value = false
    }, 2000)
    
    // 读取主题设置
    const savedTheme = localStorage.getItem('theme') || 'light'
    isDark.value = savedTheme === 'dark'
    document.documentElement.setAttribute('data-theme', savedTheme)
})

// 窗口控制函数
function minimizeWindow() {
    if (window.electron?.minimize) {
        window.electron.minimize()
    }
}

function toggleMaximize() {
    if (window.electron?.toggleMaximize) {
        window.electron.toggleMaximize()
        isMaximized.value = !isMaximized.value
    }
}

function closeWindow() {
    if (window.electron?.close) {
        window.electron.close()
    }
}

function openSettings() {
    // TODO: 打开设置对话框
    alert(locale.value === 'zh-CN' ? '设置功能开发中...' : 'Settings coming soon...')
}

function toggleLanguage() {
    const newLocale = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
    locale.value = newLocale
    localStorage.setItem('locale', newLocale)
}

function toggleTheme() {
    isDark.value = !isDark.value
    const theme = isDark.value ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
}

function openGithub() {
    const url = 'https://github.com/TiiJeiJ8/constella'
    if (window.electron?.openExternal) {
        window.electron.openExternal(url)
    } else {
        window.open(url, '_blank')
    }
}

function connectToServer() {
    if (!serverUrl.value.trim()) {
        alert(locale.value === 'zh-CN' ? '请输入服务器地址' : 'Please enter server address')
        return
    }
    // TODO: 实现连接逻辑
    console.log('Connecting to:', serverUrl.value)
    alert(`${locale.value === 'zh-CN' ? '连接到' : 'Connecting to'}: ${serverUrl.value}`)
}

function showInfo() {
    // TODO: 打开关于对话框
    alert(locale.value === 'zh-CN'
        ? 'Constella - 安全实时协作无限画布\n版本: 0.1.0'
        : 'Constella - Secure Real-time Collaborative Infinite Canvas\nVersion: 0.1.0')
}
</script>

<style scoped>
.home-view {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
}

/* ==================== 拖动标题栏 ==================== */
.title-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 32px;
    z-index: 1000;
    pointer-events: none;
}

.drag-region {
    width: 100%;
    height: 100%;
    -webkit-app-region: drag;
    pointer-events: auto;
}

/* ==================== 窗口控制按钮 ==================== */
.window-controls {
    position: fixed;
    top: 0;
    right: 0;
    display: flex;
    z-index: 1001;
    -webkit-app-region: no-drag;
}

.window-btn {
    width: 46px;
    height: 32px;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
    color: var(--text-primary);
}

.window-btn svg {
    width: 14px;
    height: 14px;
}

.window-btn:hover {
    background: var(--bg-tertiary);
}

.close-btn:hover {
    background: #e81123;
    color: #fff;
}

/* ==================== 功能按钮区 ==================== */
.control-buttons {
    position: fixed;
    top: 40px;
    right: 12px;
    display: flex;
    gap: 10px;
    z-index: 1000;
    -webkit-app-region: no-drag;
}

.ctrl-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
    color: var(--text-primary);
}

.ctrl-btn svg {
    width: 20px;
    height: 20px;
}

.ctrl-btn:hover {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    transform: scale(1.05);
    color: #fff;
}

.ctrl-btn .lang-text {
    font-size: 13px;
    font-weight: 600;
}

.ctrl-btn:hover .lang-text {
    color: #fff;
}

/* ==================== 入场动画 ==================== */
.intro-animation {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
    z-index: 999;
    transition: opacity 0.8s ease;
}

.intro-animation.fade-out {
    opacity: 0;
    pointer-events: none;
}

.logo-text {
    display: flex;
    gap: 4px;
}

.char {
    font-size: 5.5rem;
    font-weight: 700;
    color: var(--accent-primary);
    opacity: 0;
    animation: charFadeIn 0.6s ease forwards;
}

@keyframes charFadeIn {
    0% {
        opacity: 0;
        transform: translateY(20px) scale(0.8);
    }

    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* ==================== 主内容 ==================== */
.main-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    opacity: 0;
    transition: opacity 0.8s ease 0.5s;
}

.main-content.show {
    opacity: 1;
}

.content-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

/* ==================== 语言切换动画 ==================== */
.lang-fade-enter-active,
.lang-fade-leave-active {
    transition: all 0.3s ease;
}

.lang-fade-enter-from {
    opacity: 0;
    transform: translateY(-10px);
}

.lang-fade-leave-to {
    opacity: 0;
    transform: translateY(10px);
}

.header-section {
    text-align: center;
    margin-bottom: 48px;
}

.title {
    font-size: 6.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 12px;
    letter-spacing: -0.02em;
}

.subtitle {
    font-size: 1.125rem;
    color: var(--text-secondary);
    font-weight: 400;
}

/* ==================== 服务器连接卡片 ==================== */
.server-card {
    width: 100%;
    max-width: 480px;
    padding: 32px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: 16px;
    box-shadow: var(--shadow-md);
    transition: all 0.3s ease;
}

.server-card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
}

.input-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.input-group {
    display: flex;
    gap: 12px;
}

.server-input {
    flex: 1;
    padding: 12px 16px;
    font-size: 1rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    transition: all 0.3s ease;
}

.server-input:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.connect-btn {
    padding: 12px 28px;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    background: var(--accent-primary);
    border-radius: 12px;
    transition: all 0.3s ease;
}

.connect-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
}

.connect-btn:active {
    background: var(--accent-active);
    transform: translateY(0);
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
    .title {
        font-size: 2.5rem;
    }

    .subtitle {
        font-size: 1rem;
    }

    .server-card {
        max-width: 100%;
        padding: 24px;
        border-radius: 12px;
    }

    .input-group {
        flex-direction: column;
    }

    .connect-btn {
        width: 100%;
    }

    .char {
        font-size: 3.5rem;
    }

    .control-buttons {
        top: 40px;
        right: 8px;
        gap: 8px;
    }

    .ctrl-btn {
        width: 36px;
        height: 36px;
    }
    
    .ctrl-btn svg {
        width: 18px;
        height: 18px;
    }
    
    .ctrl-btn .lang-text {
        font-size: 12px;
    }
}
</style>

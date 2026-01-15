<template>
    <div class="home-view">
        <!-- 窗口控制组件 -->
        <WindowControls />

        <!-- 功能按钮组 -->
        <div class="control-buttons" :class="{ 'no-electron': !isElectron, 'show': !showIntro }">
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
        <div class="intro-animation" :class="{ 'fade-out': !showIntro }" style="user-select: none;">
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
                            <input 
                                v-model="serverUrl" 
                                type="text" 
                                class="server-input"
                                :class="{ 
                                    'error': connectionError, 
                                    'success': connectionSuccess,
                                    'disabled': isConnecting 
                                }"
                                :placeholder="t('home.serverInput.placeholder')" 
                                :disabled="isConnecting"
                                @keyup.enter="connectToServer" 
                            />
                            <button 
                                class="connect-btn" 
                                :class="{ 'connecting': isConnecting, 'success': connectionSuccess }"
                                @click="isConnecting ? cancelConnection() : connectToServer()"
                                :disabled="connectionSuccess"
                            >
                                <span v-if="isConnecting" class="loading-spinner"></span>
                                {{ isConnecting ? t('home.serverInput.cancel') : connectionSuccess ? t('home.serverInput.success') : t('home.serverInput.connect') }}
                            </button>
                        </div>
                        
                        <!-- 错误提示 -->
                        <Transition name="fade">
                            <div v-if="connectionError" class="error-message">
                                {{ connectionError }}
                            </div>
                        </Transition>
                        
                        <!-- 成功提示 -->
                        <Transition name="fade">
                            <div v-if="connectionSuccess" class="success-message">
                                {{ t('home.serverInput.success') }}
                            </div>
                        </Transition>
                    </div>
                </div>
            </Transition>
        </main>

        <!-- 设置面板 -->
        <SettingsPanel v-model="showSettings" />
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
    LogoGithubIcon
} from 'tdesign-icons-vue-next'
import SettingsPanel from '@/components/base/SettingsPanel.vue'
import WindowControls from '@/components/base/WindowControls.vue'
import { apiService } from '@/services/api'
import { handleApiError } from '@/utils/errorHandler'

const { t, locale } = useI18n()
const emit = defineEmits(['navigate'])

const showIntro = ref(true)
const serverUrl = ref('')
const logoChars = 'Constella'.split('')
const isDark = ref(false)
const showSettings = ref(false)
const isElectron = ref(!!window.electron)

// 连接状态
const isConnecting = ref(false)
const connectionError = ref('')
const connectionSuccess = ref(false)

const currentLocale = computed(() => locale.value)

onMounted(() => {
    // 入场动画持续 2 秒后淡出
    setTimeout(() => {
        showIntro.value = false
    }, 2000)
    
    // 读取主题设置状态
    const savedTheme = localStorage.getItem('theme') || 'light'
    isDark.value = savedTheme === 'dark'
    
    // 加载保存的服务器地址
    const savedServerUrl = localStorage.getItem('serverUrl')
    if (savedServerUrl) {
        serverUrl.value = savedServerUrl
    }
})

function openSettings() {
    showSettings.value = true
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
    
    // 同步更新 settings 中的主题设置
    const settings = JSON.parse(localStorage.getItem('settings') || '{}')
    settings.theme = theme
    localStorage.setItem('settings', JSON.stringify(settings))
}

function openGithub() {
    const url = 'https://github.com/TiiJeiJ8/constella'
    if (window.electron?.openExternal) {
        window.electron.openExternal(url)
    } else {
        window.open(url, '_blank')
    }
}

async function connectToServer() {
    // 验证输入
    if (!serverUrl.value.trim()) {
        connectionError.value = t('home.serverInput.errors.empty')
        return
    }

    // 重置状态
    connectionError.value = ''
    connectionSuccess.value = false
    isConnecting.value = true

    try {
        // 规范化 URL
        let normalizedUrl = serverUrl.value.trim()
        
        // 如果没有协议，使用当前页面协议
        if (!normalizedUrl.match(/^[a-zA-Z][a-zA-Z0-9+.\-]*:\/\//)) {
            const proto = (typeof window !== 'undefined' && window.location?.protocol) ? window.location.protocol : 'http:'
            normalizedUrl = proto + '//' + normalizedUrl.replace(/^\/+/, '')
        }

        // 验证 URL 格式
        try {
            new URL(normalizedUrl)
        } catch {
            connectionError.value = t('home.serverInput.errors.invalid')
            isConnecting.value = false
            return
        }

        // 调用健康检查 API
        const result = await apiService.healthCheck(normalizedUrl)

        if (result.success) {
            // 连接成功
            connectionSuccess.value = true
            apiService.setBaseUrl(normalizedUrl)
            
            // 保存服务器地址
            localStorage.setItem('serverUrl', normalizedUrl)
            
            // 显示成功提示
            setTimeout(() => {
                connectionSuccess.value = false
                // 跳转到登录页
                emit('navigate', 'login')
            }, 1500)
        } else {
            // 连接失败，使用错误处理工具获取本地化的错误消息
            if (result.errorCode) {
                // 如果有错误码，使用错误处理工具
                connectionError.value = handleApiError(result)
            } else if (result.message?.includes('timeout') || result.message?.includes('Timeout')) {
                connectionError.value = t('home.serverInput.errors.timeout')
            } else if (result.message?.includes('reach') || result.message?.includes('fetch') || result.message?.includes('NetworkError')) {
                connectionError.value = t('home.serverInput.errors.unreachable')
            } else if (result.message?.includes('cancelled')) {
                connectionError.value = t('home.serverInput.errors.cancelled')
            } else {
                connectionError.value = result.message || t('home.serverInput.errors.unknown')
            }
        }
    } catch (error) {
        console.error('Connection error:', error)
        connectionError.value = error.message || t('home.serverInput.errors.unknown')
    } finally {
        isConnecting.value = false
    }
}

function cancelConnection() {
    apiService.cancelRequest()
    isConnecting.value = false
    connectionError.value = t('home.serverInput.errors.cancelled')
}

function showInfo() {
    emit('navigate', 'about')
}
</script>

<style scoped>
.home-view {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    border-radius: 12px;
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
    opacity: 0;
    transform: translateY(-10px);
    transition: opacity 0.6s ease 0.5s, transform 0.6s ease 0.5s;
}

.control-buttons.show {
    opacity: 1;
    transform: translateY(0);
}

.control-buttons.no-electron {
    top: 12px;
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

.server-input.error {
    border-color: #e53935;
}

.server-input.error:focus {
    box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.1);
}

.server-input.success {
    border-color: #43a047;
}

.server-input.success:focus {
    box-shadow: 0 0 0 3px rgba(67, 160, 71, 0.1);
}

.server-input.disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.connect-btn {
    padding: 12px 28px;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    background: var(--accent-primary);
    border-radius: 12px;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 120px;
    justify-content: center;
}

.connect-btn:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
}

.connect-btn:active:not(:disabled) {
    background: var(--accent-active);
    transform: translateY(0);
}

.connect-btn.connecting {
    background: #ff9800;
}

.connect-btn.connecting:hover {
    background: #f57c00;
}

.connect-btn.success {
    background: #43a047;
    cursor: default;
}

.connect-btn:disabled {
    opacity: 0.8;
    cursor: not-allowed;
}

/* 加载动画 */
.loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* 错误和成功消息 */
.error-message,
.success-message {
    margin-top: 12px;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
}

.error-message {
    background: rgba(229, 57, 53, 0.1);
    color: #e53935;
    border: 1px solid rgba(229, 57, 53, 0.3);
}

.success-message {
    background: rgba(67, 160, 71, 0.1);
    color: #43a047;
    border: 1px solid rgba(67, 160, 71, 0.3);
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
    transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(-5px);
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

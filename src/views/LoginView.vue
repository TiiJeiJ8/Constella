<template>
    <div class="login-view">
        <!-- 窗口控制组件 -->
        <WindowControls />

        <!-- 功能按钮组 -->
        <div class="control-buttons" :class="{ 'no-electron': !isElectron }">
            <button class="ctrl-btn" @click="toggleLanguage" :title="t('home.controls.language')">
                <span class="lang-text">{{ currentLocale === 'zh-CN' ? '中' : 'EN' }}</span>
            </button>
            <button class="ctrl-btn" @click="toggleTheme" :title="t('home.controls.theme')">
                <MoonIcon v-if="!isDark" />
                <SunnyIcon v-else />
            </button>
            <button class="ctrl-btn" @click="goBack" :title="t('login.controls.back')">
                <ChevronLeftIcon />
            </button>
        </div>

        <!-- 主内容 -->
        <main class="main-content">
            <div class="content-wrapper">
                <!-- 头部信息 -->
                <div class="header-section">
                    <Transition name="lang-fade" mode="out-in">
                        <h1 :key="currentLocale" class="title">{{ t('login.title') }}</h1>
                    </Transition>
                    <p class="subtitle">{{ t('login.subtitle') }}</p>
                    <div class="server-info">
                        <span class="server-label">{{ t('login.serverConnected') }}:</span>
                        <span class="server-url">{{ serverUrl }}</span>
                    </div>
                </div>

                <!-- 登录表单卡片 -->
                <div class="login-card">
                    <!-- 用户头像 -->
                    <div class="avatar-section">
                        <div class="avatar-wrapper">
                            <img :src="userAvatar" :alt="userIdValue" class="avatar-image" />
                        </div>
                        <div class="user-info">
                            <div class="user-id">{{ userIdValue }}</div>
                            <div class="user-name">{{ userName }}</div>
                        </div>
                    </div>

                    <!-- 密码输入 -->
                    <div class="form-section">
                        <div class="input-group">
                            <label class="input-label">{{ t('login.password') }}</label>
                            <input 
                                v-model="password"
                                type="password"
                                class="password-input"
                                :class="{ 'error': loginError }"
                                :placeholder="t('login.passwordPlaceholder')"
                                @keyup.enter="handleLogin"
                                :disabled="isLoading"
                                autofocus
                            />
                        </div>

                        <!-- 错误提示 -->
                        <Transition name="fade">
                            <div v-if="loginError" class="error-message">
                                {{ loginError }}
                            </div>
                        </Transition>

                        <!-- 提示信息 -->
                        <div class="hint-text">
                            {{ t('login.hint') }}
                        </div>
                    </div>

                    <!-- 登录按钮 -->
                    <button 
                        class="login-btn"
                        :class="{ 'loading': isLoading, 'success': loginSuccess }"
                        @click="handleLogin"
                        :disabled="isLoading || !password || loginSuccess"
                    >
                        <div v-if="isLoading" class="loading-spinner"></div>
                        <span v-else-if="loginSuccess">{{ t('login.success') }}</span>
                        <span v-else>{{ t('login.submit') }}</span>
                    </button>
                </div>
            </div>
        </main>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    MoonIcon,
    SunnyIcon,
    ChevronLeftIcon
} from 'tdesign-icons-vue-next'
import WindowControls from '@/components/base/WindowControls.vue'
import { apiService } from '@/services/api'
import { handleApiError } from '@/utils/errorHandler'

const { t, locale } = useI18n()
const emit = defineEmits(['navigate'])

const isElectron = ref(!!window.electron)
const isDark = ref(false)
const password = ref('')
const isLoading = ref(false)
const loginError = ref('')
const loginSuccess = ref(false)

// 从 localStorage 读取用户信息
const settings = JSON.parse(localStorage.getItem('settings') || '{}')
const userIdValue = ref(settings.userId || '')
const userAvatar = ref(settings.avatar || '')
const userName = computed(() => {
    if (settings.lastName && settings.firstName) {
        return locale.value === 'zh-CN' 
            ? `${settings.lastName}${settings.firstName}`
            : `${settings.firstName} ${settings.lastName}`
    }
    return userIdValue.value
})

// 获取服务器地址
const serverUrl = ref(localStorage.getItem('serverUrl') || apiService.getBaseUrl())

const currentLocale = computed(() => locale.value)

onMounted(() => {
    // 读取主题设置状态
    const savedTheme = localStorage.getItem('theme') || 'light'
    isDark.value = savedTheme === 'dark'
})

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

function goBack() {
    emit('navigate', 'home')
}

async function handleLogin() {
    if (!password.value || isLoading.value || loginSuccess.value) {
        return
    }

    loginError.value = ''
    isLoading.value = true

    try {
        // 构建用户数据
        const userData = {
            username: userIdValue.value,
            email: settings.email || `${userIdValue.value}@constella.local`,
            password: password.value
        }

        // 先尝试登录（使用 username 作为 email 字段）
        let result = await apiService.login(userData.username, userData.password)

        // 如果登录失败且错误码为用户不存在，则自动注册
        if (!result.success && result.errorCode === 'AUTH_INVALID_CREDENTIALS') {
            console.log('Login failed, attempting auto-registration...')
            const registerResult = await apiService.register(userData.username, userData.email, userData.password)
            
            if (!registerResult.success) {
                // 如果注册失败是因为用户名已存在，说明是密码错误
                if (registerResult.errorCode === 'AUTH_USERNAME_EXISTS') {
                    throw new Error(handleApiError(result)) // 显示登录错误：用户ID或密码错误
                } else {
                    throw new Error(handleApiError(registerResult)) // 显示注册错误
                }
            }
            result = registerResult
        } else if (!result.success) {
            throw new Error(handleApiError(result))
        }

        // 保存登录状态
        if (result.data?.access_token) {
            localStorage.setItem('access_token', result.data.access_token)
        }
        if (result.data?.refresh_token) {
            localStorage.setItem('refresh_token', result.data.refresh_token)
        }
        
        // 保存用户信息
        if (result.data?.user) {
            localStorage.setItem('user', JSON.stringify(result.data.user))
        }

        loginSuccess.value = true

        // 延迟跳转到房间列表
        setTimeout(() => {
            emit('navigate', 'rooms')
        }, 1000)

    } catch (error) {
        loginError.value = error.message || t('login.errors.unknown')
    } finally {
        isLoading.value = false
    }
}
</script>

<style scoped>
.login-view {
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

/* ==================== 主内容 ==================== */
.main-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
}

.content-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 480px;
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

/* ==================== 头部区域 ==================== */
.header-section {
    text-align: center;
    margin-bottom: 40px;
}

.title {
    font-size: 3rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 12px;
    letter-spacing: -0.02em;
}

.subtitle {
    font-size: 1rem;
    color: var(--text-secondary);
    font-weight: 400;
    margin-bottom: 16px;
}

.server-info {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--bg-tertiary);
    border-radius: 20px;
    font-size: 0.75rem;
}

.server-label {
    color: var(--text-tertiary);
}

.server-url {
    color: var(--accent-primary);
    font-weight: 600;
}

/* ==================== 登录卡片 ==================== */
.login-card {
    width: 100%;
    padding: 40px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: 20px;
    box-shadow: var(--shadow-lg);
    transition: all 0.3s ease;
}

/* ==================== 头像区域 ==================== */
.avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 32px;
}

.avatar-wrapper {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    overflow: hidden;
    border: 4px solid var(--accent-primary);
    margin-bottom: 16px;
    box-shadow: var(--shadow-md);
}

.avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.user-info {
    text-align: center;
}

.user-id {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
}

.user-name {
    font-size: 0.875rem;
    color: var(--text-secondary);
}

/* ==================== 表单区域 ==================== */
.form-section {
    margin-bottom: 24px;
}

.input-group {
    margin-bottom: 8px;
}

.input-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 8px;
}

.password-input {
    width: 100%;
    padding: 14px 16px;
    font-size: 1rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    transition: all 0.3s ease;
}

.password-input:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.password-input.error {
    border-color: #e53935;
}

.password-input.error:focus {
    box-shadow: 0 0 0 3px rgba(229, 57, 53, 0.1);
}

.password-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.hint-text {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-top: 8px;
}

/* ==================== 错误消息 ==================== */
.error-message {
    margin-top: 8px;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    background: rgba(229, 57, 53, 0.1);
    color: #e53935;
    border: 1px solid rgba(229, 57, 53, 0.3);
}

/* ==================== 登录按钮 ==================== */
.login-btn {
    width: 100%;
    padding: 14px 28px;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    background: var(--accent-primary);
    border-radius: 12px;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.login-btn:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
}

.login-btn:active:not(:disabled) {
    background: var(--accent-active);
    transform: translateY(0);
}

.login-btn.loading {
    background: #ff9800;
}

.login-btn.success {
    background: #43a047;
    cursor: default;
}

.login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* ==================== 加载动画 ==================== */
.loading-spinner {
    width: 20px;
    height: 20px;
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

/* ==================== 淡入淡出动画 ==================== */
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
        font-size: 2rem;
    }

    .login-card {
        padding: 30px 24px;
    }

    .avatar-wrapper {
        width: 80px;
        height: 80px;
    }

    .control-buttons {
        top: 12px;
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

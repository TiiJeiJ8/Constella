<template>
    <div class="login-view">
        <WindowControls />

        <div class="control-buttons" :class="{ 'no-electron': !isElectron }">
            <button class="ctrl-btn" @click="toggleLanguage" :title="t('home.controls.language')">
                <span class="lang-text">{{ currentLocale === 'zh-CN' ? '中' : 'EN' }}</span>
            </button>
            <button class="ctrl-btn" @click="toggleTheme" :title="t('home.controls.theme')">
                <SunnyIcon v-if="isDark" />
                <MoonIcon v-else />
            </button>
            <button class="ctrl-btn" @click="goBack" :title="t('login.controls.back')">
                <ChevronLeftIcon />
            </button>
        </div>

        <main class="main-content">
            <div class="content-wrapper">
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

                <div class="login-card">
                    <div class="avatar-section">
                        <div class="avatar-wrapper">
                            <img :src="userAvatar" :alt="userIdValue" class="avatar-image" />
                        </div>
                        <div class="user-info">
                            <div class="user-id">{{ userIdValue }}</div>
                            <div class="user-name">{{ userName }}</div>
                        </div>
                    </div>

                    <div class="form-section">
                        <div class="input-group">
                            <label class="input-label">{{ t('login.password') }}</label>
                            <input
                                v-model="password"
                                type="password"
                                class="password-input"
                                :class="{ error: loginError }"
                                :placeholder="t('login.passwordPlaceholder')"
                                @keyup.enter="handleLogin"
                                :disabled="isLoading"
                                autofocus
                            />
                        </div>

                        <div v-if="needsRegistrationConfirm" class="input-group">
                            <label class="input-label">{{ confirmPasswordLabel }}</label>
                            <input
                                v-model="confirmPassword"
                                type="password"
                                class="password-input"
                                :class="{ error: loginError }"
                                :placeholder="confirmPasswordPlaceholder"
                                @keyup.enter="handleLogin"
                                :disabled="isLoading"
                            />
                        </div>

                        <Transition name="fade">
                            <div v-if="loginError" class="error-message">
                                {{ loginError }}
                            </div>
                        </Transition>

                        <div class="hint-text">{{ loginHintText }}</div>
                    </div>

                    <button
                        class="login-btn"
                        :class="{ loading: isLoading, success: loginSuccess }"
                        @click="handleLogin"
                        :disabled="isLoading || !password || (needsRegistrationConfirm && !confirmPassword) || loginSuccess"
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
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeftIcon, MoonIcon, SunnyIcon } from 'tdesign-icons-vue-next'
import WindowControls from '@/components/base/WindowControls.vue'
import { apiService } from '@/services/api'
import { handleApiError } from '@/utils/errorHandler'
import { setAuthTokens, setStoredUser } from '@/utils/storage'
import { getStoredTheme, setTheme } from '@/utils/theme'

const { t, te, locale } = useI18n()
const emit = defineEmits(['navigate'])

const isElectron = ref(!!window.electron)
const isDark = ref(false)
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const loginError = ref('')
const loginSuccess = ref(false)
const needsRegistrationConfirm = ref(false)

const settings = JSON.parse(localStorage.getItem('settings') || '{}')
const userIdValue = ref(settings.userId || '')
const userAvatar = ref(settings.avatar || '')
const serverUrl = ref(localStorage.getItem('serverUrl') || apiService.getBaseUrl())
const currentLocale = computed(() => locale.value)
const confirmPasswordLabel = computed(() => (
    te('login.confirmPassword')
        ? t('login.confirmPassword')
        : (locale.value === 'zh-CN' ? '确认密码' : 'Confirm Password')
))
const confirmPasswordPlaceholder = computed(() => (
    te('login.confirmPasswordPlaceholder')
        ? t('login.confirmPasswordPlaceholder')
        : (locale.value === 'zh-CN' ? '请再次输入密码' : 'Re-enter your password')
))

const userName = computed(() => {
    if (settings.lastName && settings.firstName) {
        return locale.value === 'zh-CN'
            ? `${settings.lastName}${settings.firstName}`
            : `${settings.firstName} ${settings.lastName}`
    }
    return userIdValue.value
})

const loginHintText = computed(() => (
    needsRegistrationConfirm.value
        ? (
            te('login.hintConfirm')
                ? t('login.hintConfirm')
                : (locale.value === 'zh-CN'
                    ? '未检测到该账户，请确认密码以创建新账户。'
                    : 'Account not found. Confirm password to create a new account.')
        )
        : t('login.hint')
))

onMounted(() => {
    isDark.value = getStoredTheme() === 'dark'
})

function toggleLanguage() {
    const nextLocale = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
    locale.value = nextLocale
    localStorage.setItem('locale', nextLocale)
}

function toggleTheme() {
    isDark.value = !isDark.value
    setTheme(isDark.value ? 'dark' : 'light')
}

function goBack() {
    emit('navigate', 'home')
}

async function handleLogin() {
    if (!password.value || isLoading.value || loginSuccess.value) return

    if (needsRegistrationConfirm.value && !confirmPassword.value) {
        loginError.value = te('login.errors.confirmPasswordRequired')
            ? t('login.errors.confirmPasswordRequired')
            : (locale.value === 'zh-CN' ? '请先确认密码' : 'Please confirm your password')
        return
    }

    loginError.value = ''
    isLoading.value = true

    try {
        const userData = {
            username: userIdValue.value,
            email: settings.email || `${userIdValue.value}@constella.local`,
            password: password.value
        }

        let result = await apiService.login(userData.username, userData.password)

        if (!result.success && result.errorCode === 'AUTH_INVALID_CREDENTIALS') {
            if (!needsRegistrationConfirm.value) {
                needsRegistrationConfirm.value = true
                confirmPassword.value = ''
                loginError.value = te('login.errors.confirmPasswordToRegister')
                    ? t('login.errors.confirmPasswordToRegister')
                    : (locale.value === 'zh-CN'
                        ? '该账户可能尚未创建，请确认密码后注册'
                        : 'Account may not exist yet. Please confirm password to register')
                return
            }

            if (password.value !== confirmPassword.value) {
                throw new Error(
                    te('login.errors.passwordMismatch')
                        ? t('login.errors.passwordMismatch')
                        : (locale.value === 'zh-CN' ? '两次密码输入不一致' : 'Passwords do not match')
                )
            }

            const registerResult = await apiService.register(userData.username, userData.email, userData.password)
            if (!registerResult.success) {
                if (registerResult.errorCode === 'AUTH_USERNAME_EXISTS') {
                    needsRegistrationConfirm.value = false
                    confirmPassword.value = ''
                    throw new Error(handleApiError(result))
                }
                throw new Error(handleApiError(registerResult))
            }

            result = registerResult
        } else if (!result.success) {
            throw new Error(handleApiError(result))
        }

        setAuthTokens({
            accessToken: result.data?.access_token,
            refreshToken: result.data?.refresh_token
        })
        if (result.data?.user) {
            setStoredUser(result.data.user)
        }

        loginSuccess.value = true
        needsRegistrationConfirm.value = false
        confirmPassword.value = ''

        setTimeout(() => {
            emit('navigate', 'rooms')
        }, 1000)
    } catch (error) {
        loginError.value = error?.message || t('login.errors.unknown')
    } finally {
        isLoading.value = false
    }
}

watch(password, () => {
    if (!needsRegistrationConfirm.value) return
    loginError.value = ''
})
</script>

<style scoped>
.login-view {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    border-radius: 12px;
}

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

.main-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: clamp(24px, 4vw, 40px) 20px;
}

.content-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: min(480px, 100%);
}

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
    margin-bottom: clamp(24px, 4vw, 40px);
}

.title {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 12px;
    letter-spacing: -0.02em;
}

.subtitle {
    font-size: clamp(0.92rem, 1.5vw, 1rem);
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
    max-width: 100%;
    flex-wrap: wrap;
    justify-content: center;
}

.server-label {
    color: var(--text-tertiary);
}

.server-url {
    color: var(--accent-primary);
    font-weight: 600;
    word-break: break-all;
}

.login-card {
    width: 100%;
    padding: clamp(24px, 4vw, 40px);
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: 20px;
    box-shadow: var(--shadow-lg);
    transition: all 0.3s ease;
}

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

.fade-enter-active,
.fade-leave-active {
    transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(-5px);
}

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

@media (max-height: 760px) {
    .main-content {
        justify-content: flex-start;
        padding-top: 88px;
        overflow-y: auto;
    }

    .avatar-section {
        margin-bottom: 24px;
    }

    .avatar-wrapper {
        width: 72px;
        height: 72px;
    }
}
</style>

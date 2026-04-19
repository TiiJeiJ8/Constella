<template>
    <Transition name="slide" mode="out-in">
        <HomeView v-if="currentView === 'home'" :play-intro="!hasPlayedStartupIntro" @intro-finished="hasPlayedStartupIntro = true" @navigate="handleNavigate" />
        <LoginView v-else-if="currentView === 'login'" @navigate="handleNavigate" />
        <RoomWorkspaceView v-else-if="isRoomWorkspace" :subview="currentView" @navigate="handleNavigate" />
        <CanvasView v-else-if="currentView === 'canvas'" :room-id="currentRoomId" @navigate="handleNavigate" />
        <AboutView v-else-if="currentView === 'about'" @navigate="handleNavigate" />
    </Transition>

    <Toast
        :message="toastMessage"
        :type="toastType"
        :show="showToast"
        @update:show="showToast = $event"
    />
    <ToastManager ref="toastManagerRef" />
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import RoomWorkspaceView from './views/RoomWorkspaceView.vue'
import CanvasView from './views/CanvasView.vue'
import AboutView from './views/AboutView.vue'
import Toast from './components/base/Toast.vue'
import ToastManager from './components/base/ToastManager.vue'
import { setToastInstance } from './utils/useToast'
import { apiService } from './services/api'
import { clearAuthStorage, getAccessToken, getRefreshToken, setAuthTokens } from './utils/storage'
import { applyStoredTheme } from './utils/theme'

const hasPlayedStartupIntro = ref(false)
const currentView = ref('home')
const currentRoomId = ref('')
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('info')
const toastManagerRef = ref(null)
const isRoomWorkspace = computed(() => ['rooms', 'recent', 'favorites'].includes(currentView.value))

let tokenRefreshInterval = null
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000

function startTokenRefresh() {
    const accessToken = getAccessToken()
    const refreshToken = getRefreshToken()

    if (!accessToken || !refreshToken) return

    stopTokenRefresh()
    tokenRefreshInterval = setInterval(async () => {
        const currentRefreshToken = getRefreshToken()
        if (!currentRefreshToken) {
            stopTokenRefresh()
            return
        }

        try {
            const result = await apiService.refreshToken(currentRefreshToken)
            if (result.success && result.data) {
                if (result.data.access_token) {
                    setAuthTokens({ accessToken: result.data.access_token })
                }
                if (result.data.refresh_token) {
                    setAuthTokens({ refreshToken: result.data.refresh_token })
                }
            } else {
                handleTokenExpired()
            }
        } catch (error) {
            console.error('[Token] Auto refresh error:', error)
        }
    }, TOKEN_REFRESH_INTERVAL)
}

function stopTokenRefresh() {
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval)
        tokenRefreshInterval = null
    }
}

function handleTokenExpired() {
    stopTokenRefresh()
    clearAuthStorage()
    toastMessage.value = '登录状态已过期，请重新登录'
    toastType.value = 'warning'
    showToast.value = true

    window.setTimeout(() => {
        currentView.value = 'login'
    }, 1500)
}

function handleNavigate(view, params) {
    const supportedViews = ['home', 'login', 'rooms', 'recent', 'favorites', 'canvas', 'about']
    if (!supportedViews.includes(view)) {
        const featureNames = {
            recent: '最近',
            favorites: '收藏',
            notifications: '通知'
        }
        toastMessage.value = `${featureNames[view] || view} 功能暂未开放`
        toastType.value = 'info'
        showToast.value = true
        return
    }

    currentView.value = view

    if (view === 'canvas' && params?.roomId) {
        currentRoomId.value = params.roomId
    }

    if (view === 'login' || view === 'home') {
        stopTokenRefresh()
    } else if (view === 'rooms' || view === 'recent' || view === 'favorites') {
        startTokenRefresh()
    }
}

onMounted(() => {
    applyStoredTheme()

    try {
        const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}')
        if (window.electron?.setWindowZoomFactor) {
            const scalePercent = Number(savedSettings.uiScale)
            const normalizedPercent = Number.isFinite(scalePercent)
                ? Math.max(85, Math.min(115, Math.round(scalePercent / 5) * 5))
                : 100
            void window.electron.setWindowZoomFactor(normalizedPercent / 100)
        }
        if (window.electron?.setWindowSize && savedSettings.windowSize?.width && savedSettings.windowSize?.height) {
            void window.electron.setWindowSize(savedSettings.windowSize.width, savedSettings.windowSize.height)
        }
    } catch {
        // Ignore malformed persisted settings and keep native defaults.
    }

    if (toastManagerRef.value) {
        setToastInstance(toastManagerRef.value)
    }
    startTokenRefresh()
})

onUnmounted(() => {
    stopTokenRefresh()
})
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
    transition: all 0.4s ease;
}

.slide-enter-from {
    opacity: 0;
    transform: translateX(30px);
}

.slide-leave-to {
    opacity: 0;
    transform: translateX(-30px);
}
</style>

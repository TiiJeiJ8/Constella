<template>
    <Transition name="slide" mode="out-in">
        <HomeView v-if="currentView === 'home'" @navigate="handleNavigate" />
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

const currentView = ref('home')
const currentRoomId = ref('')
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('info')
const toastManagerRef = ref(null)
const isRoomWorkspace = computed(() => ['rooms', 'recent', 'favorites'].includes(currentView.value))

let tokenRefreshInterval = null
let settingsUpdatedHandler = null
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000

function normalizeUiScale(value) {
    const n = Number(value)
    if (!Number.isFinite(n)) return 100
    return Math.max(85, Math.min(115, Math.round(n / 5) * 5))
}

function applyUiScale(value) {
    const scale = normalizeUiScale(value) / 100
    const appRoot = document.getElementById('app')
    if (!appRoot) return

    document.documentElement.style.zoom = ''
    document.body.style.zoom = ''
    appRoot.style.transformOrigin = 'top left'
    appRoot.style.transform = `scale(${scale})`
    appRoot.style.width = `${100 / scale}%`
    appRoot.style.height = `${100 / scale}%`
}

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
    const savedTheme = localStorage.getItem('theme') || 'light'
    document.documentElement.setAttribute('data-theme', savedTheme)

    try {
        const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}')
        applyUiScale(savedSettings.uiScale ?? 100)
    } catch {
        applyUiScale(100)
    }

    if (toastManagerRef.value) {
        setToastInstance(toastManagerRef.value)
    }

    settingsUpdatedHandler = event => {
        applyUiScale(event?.detail?.uiScale ?? 100)
    }
    window.addEventListener('settings-updated', settingsUpdatedHandler)

    startTokenRefresh()
})

onUnmounted(() => {
    stopTokenRefresh()
    if (settingsUpdatedHandler) {
        window.removeEventListener('settings-updated', settingsUpdatedHandler)
        settingsUpdatedHandler = null
    }
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

<template>
        <Transition name="slide" mode="out-in">
            <HomeView v-if="currentView === 'home'" @navigate="handleNavigate" />
            <LoginView v-else-if="currentView === 'login'" @navigate="handleNavigate" />
            <RoomWorkspaceView v-else-if="isRoomWorkspace" :subview="currentView" @navigate="handleNavigate" />
            <CanvasView v-else-if="currentView === 'canvas'" :room-id="currentRoomId" @navigate="handleNavigate" />
            <AboutView v-else-if="currentView === 'about'" @navigate="handleNavigate" />
        </Transition>

        <!-- eslint-disable vue/no-multiple-template-root -->
        <Toast
            :message="toastMessage"
            :type="toastType"
            :show="showToast"
            @update:show="showToast = $event"
        />
        <ToastManager ref="toastManagerRef" />
        <!-- eslint-enable vue/no-multiple-template-root -->
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

// Token 自动刷新
let tokenRefreshInterval = null
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000 // 15分钟刷新一次

// 在应用启动时初始化主题和Token刷新
onMounted(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    document.documentElement.setAttribute('data-theme', savedTheme)
    
    // 初始化全局 Toast 实例
    if (toastManagerRef.value) {
        setToastInstance(toastManagerRef.value)
    }
    
    // 启动 Token 自动刷新（如果已登录）
    startTokenRefresh()
})

// 组件卸载时清理定时器
onUnmounted(() => {
    stopTokenRefresh()
})

// 启动 Token 自动刷新
function startTokenRefresh() {
    const accessToken = getAccessToken()
    const refreshToken = getRefreshToken()
    
    if (!accessToken || !refreshToken) {
        return
    }
    
    // 清除旧的定时器
    stopTokenRefresh()
    
    // 设置新的定时器
    tokenRefreshInterval = setInterval(async () => {
        const currentRefreshToken = getRefreshToken()
        
        if (!currentRefreshToken) {
            stopTokenRefresh()
            return
        }
        
        try {
            const result = await apiService.refreshToken(currentRefreshToken)
            
            if (result.success && result.data) {
                // 更新 token
                if (result.data.access_token) {
                    setAuthTokens({ accessToken: result.data.access_token })
                }
                if (result.data.refresh_token) {
                    setAuthTokens({ refreshToken: result.data.refresh_token })
                }
                console.log('[Token] Auto refresh successful')
            } else {
                // Token 刷新失败，可能已过期
                console.warn('[Token] Refresh failed, redirecting to login')
                handleTokenExpired()
            }
        } catch (error) {
            console.error('[Token] Auto refresh error:', error)
        }
    }, TOKEN_REFRESH_INTERVAL)
    
    console.log('[Token] Auto refresh started')
}

// 停止 Token 自动刷新
function stopTokenRefresh() {
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval)
        tokenRefreshInterval = null
        console.log('[Token] Auto refresh stopped')
    }
}

// 处理 Token 过期
function handleTokenExpired() {
    stopTokenRefresh()
    clearAuthStorage()
    
    toastMessage.value = '登录已过期，请重新登录'
    toastType.value = 'warning'
    showToast.value = true
    
    setTimeout(() => {
        currentView.value = 'login'
    }, 1500)
}

function handleNavigate(view, params) {
    // 暂时只支持这些视图，其他的保持在 rooms
    const supportedViews = ['home', 'login', 'rooms', 'recent', 'favorites', 'canvas', 'about']
    
    if (supportedViews.includes(view)) {
        currentView.value = view
        
        // 如果是 canvas 视图，保存 roomId
        if (view === 'canvas' && params?.roomId) {
            currentRoomId.value = params.roomId
            console.log('[App] Navigating to canvas, roomId:', params.roomId)
        }
        
        // 如果导航到登录页，停止 Token 刷新
        if (view === 'login' || view === 'home') {
            stopTokenRefresh()
        } else if (view === 'rooms' || view === 'recent' || view === 'favorites') {
            // 进入房间相关页面时启动 Token 刷新
            startTokenRefresh()
        }
    } else {
        // 未实现的功能，显示提示
        const featureNames = {
            recent: '最近使用',
            favorites: '我的收藏',
            notifications: '通知中心'
        }
        toastMessage.value = `${featureNames[view] || view} 功能正在开发中，敬请期待 🚀`
        toastType.value = 'info'
        showToast.value = true
    }
}
</script>

<style scoped>
/* ==================== 页面切换动画 ==================== */
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

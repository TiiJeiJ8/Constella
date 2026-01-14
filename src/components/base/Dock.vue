<template>
    <div class="dock">
        <!-- 左侧：用户信息胶囊（不可点击） -->
        <div class="user-pill">
            <img :src="userAvatar" alt="avatar" class="user-avatar" />
            <span class="user-name">{{ userName }}</span>
        </div>

        <!-- 分隔线 -->
        <div class="dock-divider"></div>

        <!-- 中间：导航图标组 -->
        <div class="dock-section">
            <button
                v-for="item in navItems"
                :key="item.id"
                class="dock-item"
                :class="{ active: item.active }"
                :title="t(`dock.${item.id}`)"
                @click="item.action"
            >
                <span class="dock-icon">{{ item.icon }}</span>
            </button>
        </div>

        <!-- 分隔线 -->
        <div class="dock-divider"></div>

        <!-- 右侧：系统控制组 -->
        <div class="dock-section">
            <button
                class="dock-item"
                :title="t('dock.language')"
                @click="toggleLanguage"
            >
                <span class="dock-icon">🌐</span>
            </button>
            <button
                class="dock-item"
                :title="t('dock.theme')"
                @click="toggleTheme"
            >
                <span class="dock-icon">{{ isDark ? '☀️' : '🌙' }}</span>
            </button>
            <button
                class="dock-item"
                :title="t('dock.settings')"
                @click="openSettings"
            >
                <span class="dock-icon">⚙️</span>
            </button>
            
            <!-- 退出按钮 -->
            <div class="exit-menu-wrapper">
                <button
                    class="dock-item exit-btn"
                    :title="t('dock.exit')"
                    @click="toggleExitMenu"
                >
                    <span class="dock-icon">🚪</span>
                </button>

                <!-- 退出菜单 -->
                <Transition name="menu-slide">
                    <div v-if="showExitMenu" class="exit-menu" @click.stop>
                        <button class="menu-item" @click="handleLogout">
                            <span class="menu-icon">🚪</span>
                            <span class="menu-text">{{ t('dock.logout') }}</span>
                        </button>
                        <button class="menu-item" @click="handleDisconnect">
                            <span class="menu-icon">🔌</span>
                            <span class="menu-text">{{ t('dock.disconnect') }}</span>
                        </button>
                    </div>
                </Transition>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const emit = defineEmits(['navigate', 'openSettings', 'logout', 'disconnect'])

// 从 localStorage 读取用户信息
const settings = JSON.parse(localStorage.getItem('settings') || '{}')
const userAvatar = ref(settings.avatar || '')
const userName = computed(() => {
    if (settings.lastName && settings.firstName) {
        return locale.value === 'zh-CN' 
            ? `${settings.lastName}${settings.firstName}`
            : `${settings.firstName} ${settings.lastName}`
    }
    return settings.userId || 'User'
})

// 退出菜单状态
const showExitMenu = ref(false)

// 主题状态
const isDark = ref(false)

// 初始化主题
onMounted(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    isDark.value = savedTheme === 'dark'
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})

// 导航项配置
const navItems = ref([
    { 
        id: 'rooms',
        icon: '🏠',
        active: true,
        action: () => emit('navigate', 'rooms')
    },
    { 
        id: 'recent',
        icon: '🕐',
        active: false,
        action: () => emit('navigate', 'recent')
    },
    { 
        id: 'favorites',
        icon: '⭐',
        active: false,
        action: () => emit('navigate', 'favorites')
    }
])

// 切换语言
function toggleLanguage() {
    const newLocale = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
    locale.value = newLocale
    localStorage.setItem('locale', newLocale)
}

// 切换主题
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

// 打开设置面板
function openSettings() {
    emit('openSettings')
}

// 切换退出菜单
function toggleExitMenu() {
    showExitMenu.value = !showExitMenu.value
}

// 点击退出登录
function handleLogout() {
    showExitMenu.value = false
    // 清除登录信息
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    emit('logout')
}

// 点击断开连接
function handleDisconnect() {
    showExitMenu.value = false
    // 清除服务器连接信息
    localStorage.removeItem('serverUrl')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    emit('disconnect')
}

// 点击外部关闭菜单
function handleClickOutside(event) {
    if (showExitMenu.value && !event.target.closest('.exit-menu-wrapper')) {
        showExitMenu.value = false
    }
}
</script>

<style scoped>
.dock {
    height: 64px;
    padding: 0 16px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 32px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ==================== 暗色模式 ==================== */
html[data-theme='dark'] .dock {
    background: rgba(28, 28, 28, 0.95);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

/* ==================== 用户信息胶囊 ==================== */
.user-pill {
    height: 36px;
    padding: 0 12px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: default;
    user-select: none;
}

html[data-theme='dark'] .user-pill {
    background: rgba(80, 80, 80, 0.5);
}

.user-avatar {
    width: 24px;
    height: 24px;
    border-radius: 12px;
    object-fit: cover;
}

.user-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* ==================== 分隔线 ==================== */
.dock-divider {
    width: 1px;
    height: 24px;
    background: rgba(0, 0, 0, 0.1);
    margin: 0 4px;
}

.dark .dock-divider {
    background: rgba(255, 255, 255, 0.1);
}

/* ==================== Dock 区域 ==================== */
.dock-section {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* ==================== Dock 图标项 ==================== */
.dock-item {
    width: 40px;
    height: 40px;
    border-radius: 20px;
    border: none;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

.dock-icon {
    font-size: 20px;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dock-item:hover {
    background: rgba(0, 0, 0, 0.05);
    transform: translateY(-4px);
}

.dark .dock-item:hover {
    background: rgba(255, 255, 255, 0.1);
}

.dock-item:active {
    transform: translateY(-2px);
}

.dock-item.active {
    background: rgba(103, 126, 234, 0.15);
}

.dark .dock-item.active {
    background: rgba(103, 126, 234, 0.25);
}

.dock-item.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    border-radius: 2px;
    background: var(--accent-primary);
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
    .dock {
        padding: 0 12px;
        gap: 6px;
    }

    .dock-item {
        width: 36px;
        height: 36px;
    }

    .dock-icon {
        font-size: 18px;
    }

    .user-name {
        display: none;
    }

    .user-pill {
        padding: 0 6px;
    }
}

/* ==================== 退出菜单 ==================== */
.exit-menu-wrapper {
    position: relative;
}

.exit-btn {
    /* 退出按钮特殊样式 */
}

.exit-menu {
    position: absolute;
    bottom: calc(100% + 12px);
    right: 0;
    background: var(--bg-secondary);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    padding: 8px;
    min-width: 180px;
    border: 1px solid var(--border-light);
}

.dark .exit-menu {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.menu-item {
    width: 100%;
    padding: 10px 12px;
    border: none;
    background: transparent;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--text-primary);
    font-size: 14px;
}

.menu-item:hover {
    background: var(--bg-tertiary);
}

.menu-icon {
    font-size: 18px;
}

.menu-text {
    flex: 1;
    text-align: left;
}

/* ==================== 菜单滑入滑出动画 ==================== */
.menu-slide-enter-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-slide-leave-active {
    transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
}

.menu-slide-enter-from {
    opacity: 0;
    transform: translateY(10px);
}

.menu-slide-leave-to {
    opacity: 0;
    transform: translateY(5px);
}
</style>

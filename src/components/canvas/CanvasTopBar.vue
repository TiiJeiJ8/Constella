<template>
    <div class="canvas-topbar">
        <!-- 左侧：退出按钮 + 房间信息 -->
        <div class="topbar-section topbar-left">
            <button class="circular-btn exit-btn" @click="$emit('exit')" :title="t('canvas.topBar.exitRoom')">
                <span class="icon">←</span>
            </button>
            <div class="room-info-card">
                <h1 class="room-title">{{ roomName }}</h1>
                <div class="sync-status" :class="{ syncing: isSyncing }">
                    <span class="status-dot"></span>
                    <span class="status-text">{{ isSyncing ? t('canvas.statusBar.syncing') : t('canvas.statusBar.synced') }}</span>
                </div>
            </div>
        </div>

        <!-- 右侧：操作按钮组 -->
        <div class="topbar-section topbar-right" style="user-select: none;">
            <!-- 菜单按钮组 -->
            <div class="menu-group">
                <!-- 展开的功能按钮 -->
                <Transition name="slide-fade">
                    <div v-if="isMenuExpanded" class="menu-buttons">
                        <button 
                            class="circular-btn menu-item" 
                            @click="toggleLanguage"
                            :title="locale === 'zh-CN' ? 'Switch to English' : '切换为中文'"
                        >
                            <span class="icon">{{ locale === 'zh-CN' ? '中' : 'En' }}</span>
                        </button>
                        <button 
                            class="circular-btn menu-item" 
                            @click="toggleTheme"
                            :title="t('settings.appearance.theme')"
                        >
                            <span class="icon">🌙</span>
                        </button>
                        <button 
                            class="circular-btn menu-item" 
                            @click="openSettings"
                            :title="t('settings.title')"
                        >
                            <span class="icon">⚙️</span>
                        </button>
                    </div>
                </Transition>
                
                <!-- 菜单切换按钮 -->
                <button
                    class="circular-btn menu-toggle" 
                    @click="toggleMenu"
                    :class="{ active: isMenuExpanded }"
                    :title="isMenuExpanded ? '收起菜单' : '展开菜单'"
                >
                    <span class="icon menu-icon">≡</span>
                </button>
                <!-- 其他功能按钮 -->
                <button class="circular-btn" :title="t('canvas.topBar.save')">
                    <span class="icon">💾</span>
                </button>
                <button class="circular-btn" :title="t('canvas.topBar.snapshot')">
                    <span class="icon">📸</span>
                </button>
                <button class="circular-btn" :title="t('canvas.topBar.export')">
                    <span class="icon">📤</span>
                </button>
                <button class="circular-btn members-btn" :title="t('canvas.topBar.members')">
                    <span class="icon">👥</span>
                    <span class="badge">1</span>
                </button>
            </div>
        </div>

        <!-- 设置面板 -->
        <SettingsPanel v-model="isSettingsPanelOpen" />
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsPanel from '@/components/base/SettingsPanel.vue'

const { t, locale } = useI18n()

const isMenuExpanded = ref(false)
const isSettingsPanelOpen = ref(false)

const toggleMenu = () => {
    isMenuExpanded.value = !isMenuExpanded.value
}

const toggleLanguage = () => {
    locale.value = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
    localStorage.setItem('locale', locale.value)
}

const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme')
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
}

const openSettings = () => {
    isSettingsPanelOpen.value = true
    isMenuExpanded.value = false // 关闭菜单
}

const props = defineProps({
    roomId: {
        type: String,
        required: true
    },
    roomName: {
        type: String,
        default: 'Untitled Room'
    },
    isSyncing: {
        type: Boolean,
        default: false
    }
})

defineEmits(['exit'])
</script>

<style scoped>
.canvas-topbar {
    position: absolute;
    top: 16px;
    left: 16px;
    right: 16px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    pointer-events: none;
    z-index: 100;
    transition: all 0.3s ease;
}

.topbar-section {
    display: flex;
    align-items: center;
    gap: 12px;
    pointer-events: auto;
}

.topbar-left {
    gap: 16px;
}

/* 圆形按钮样式 */
.circular-btn {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--canvas-toolbar-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-size: 20px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--shadow-sm);
}

.circular-btn:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    background: var(--bg-primary);
    border-color: var(--color-primary);
}

.circular-btn:active {
    transform: translateY(0);
}

.circular-btn .icon {
    font-size: 20px;
}

/* 房间信息卡片 */
.room-info-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 20px;
    background: var(--canvas-toolbar-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
}

.room-info-card:hover {
    box-shadow: var(--shadow-md);
}

.room-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    white-space: nowrap;
}

.sync-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--text-secondary);
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #67c23a;
    transition: all 0.3s ease;
}

.sync-status.syncing .status-dot {
    background: #409eff;
    animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* 成员按钮徽章 */
.badge {
    position: absolute;
    top: 2px;
    right: 2px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--color-primary);
    color: white;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 菜单按钮组 */
.menu-group {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
}

.menu-buttons {
    display: flex;
    align-items: center;
    gap: 12px;
}

.menu-toggle {
    position: relative;
    z-index: 2;
}

.menu-toggle.active .menu-icon {
    transform: rotate(90deg);
}

.menu-icon {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-item {
    font-size: 16px;
}

/* 菜单展开动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
    transform: translateX(20px);
    opacity: 0;
}

.slide-fade-leave-to {
    transform: translateX(20px);
    opacity: 0;
}

.slide-fade-enter-active .menu-item {
    animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.slide-fade-enter-active .menu-item:nth-child(1) {
    animation-delay: 0.05s;
}

.slide-fade-enter-active .menu-item:nth-child(2) {
    animation-delay: 0.1s;
}

.slide-fade-enter-active .menu-item:nth-child(3) {
    animation-delay: 0.15s;
}

@keyframes slideIn {
    from {
        transform: translateX(30px);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* 响应式 */
@media (max-width: 768px) {
    .canvas-topbar {
        top: 12px;
        left: 12px;
        right: 12px;
        height: 56px;
    }

    .circular-btn {
        width: 44px;
        height: 44px;
    }

    .room-info-card {
        padding: 6px 16px;
    }

    .room-title {
        font-size: 14px;
    }

    .sync-status {
        display: none;
    }
}
</style>

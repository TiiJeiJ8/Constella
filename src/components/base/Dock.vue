<template>
    <div class="dock">
        <div class="user-pill">
            <img :src="userAvatar" alt="avatar" class="user-avatar" />
            <span class="user-name">{{ userName }}</span>
        </div>

        <div class="dock-divider"></div>

        <div class="dock-section">
            <button
                v-for="item in navItems"
                :key="item.id"
                class="dock-item"
                :class="{ active: item.active }"
                :title="t(`dock.${item.id}`)"
                @click="item.action"
            >
                <svg class="dock-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        v-for="(path, index) in item.paths"
                        :key="index"
                        :d="path.d"
                        :fill="path.fill || 'none'"
                        :stroke="path.stroke || 'currentColor'"
                        :stroke-linecap="path.linecap || 'round'"
                        :stroke-linejoin="path.linejoin || 'round'"
                        :stroke-width="path.width || 1.8"
                    />
                </svg>
            </button>
        </div>

        <div class="dock-divider"></div>

        <div class="dock-section">
            <button class="dock-item" :title="t('dock.language')" @click="toggleLanguage">
                <span class="dock-text">{{ locale === 'zh-CN' ? '中' : 'EN' }}</span>
            </button>
            <button class="dock-item" :title="t('dock.theme')" @click="toggleTheme">
                <svg v-if="isDark" class="dock-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.66 6.34l-1.55 1.55M7.89 16.11l-1.55 1.55M17.66 17.66l-1.55-1.55M7.89 7.89L6.34 6.34" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
                    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8" />
                </svg>
                <svg v-else class="dock-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.5 14.75A7.25 7.25 0 0 1 9.25 5.5a7.75 7.75 0 1 0 9.25 9.25Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8" />
                </svg>
            </button>
            <button class="dock-item" :title="locale === 'zh-CN' ? '插件' : 'Plugins'" @click="openPlugins">
                <svg class="dock-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M10 4.75a2.75 2.75 0 1 1 4.92 1.69l.71.7a2.75 2.75 0 1 1 3.89 3.89l-.7.71A2.75 2.75 0 1 1 17.13 17l-.71-.7-4.56 4.55a1 1 0 0 1-1.41 0l-3.26-3.26a1 1 0 0 1 0-1.41l4.56-4.56-.71-.7A2.75 2.75 0 0 1 10 4.75Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.7" />
                    <path d="m12.15 11.85-2.3 2.3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
                </svg>
            </button>
            <button class="dock-item" :title="t('dock.settings')" @click="openSettings">
                <svg class="dock-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M10.1 3.7h3.8l.55 2.08c.3.09.59.21.87.36l1.97-.92 2.68 2.68-.92 1.97c.15.28.27.57.36.87l2.08.55v3.8l-2.08.55c-.09.3-.21.59-.36.87l.92 1.97-2.68 2.68-1.97-.92c-.28.15-.57.27-.87.36l-.55 2.08h-3.8l-.55-2.08a6.3 6.3 0 0 1-.87-.36l-1.97.92-2.68-2.68.92-1.97a6.3 6.3 0 0 1-.36-.87l-2.08-.55v-3.8l2.08-.55c.09-.3.21-.59.36-.87l-.92-1.97 2.68-2.68 1.97.92c.28-.15.57-.27.87-.36L10.1 3.7Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.45" />
                    <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" stroke-width="1.8" />
                </svg>
            </button>

            <div class="exit-menu-wrapper">
                <button class="dock-item exit-btn" :title="t('dock.exit')" @click="toggleExitMenu">
                    <svg class="dock-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M10.25 6.75L5 12l5.25 5.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                        <path d="M19 12H5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.9" />
                    </svg>
                </button>

                <Transition name="menu-slide">
                    <div v-if="showExitMenu" class="exit-menu" @click.stop>
                        <button class="menu-item" @click="handleLogout">
                            <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M10.25 6.75L5 12l5.25 5.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                                <path d="M19 12H5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.9" />
                            </svg>
                            <span class="menu-text">{{ t('dock.logout') }}</span>
                        </button>
                        <button class="menu-item" @click="handleDisconnect">
                            <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M7.5 7.5 16.5 16.5M16.5 7.5l-9 9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.9" />
                                <rect x="4.75" y="4.75" width="14.5" height="14.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.7" />
                            </svg>
                            <span class="menu-text">{{ t('dock.disconnect') }}</span>
                        </button>
                    </div>
                </Transition>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getStoredTheme, setTheme } from '@/utils/theme'

const { t, locale } = useI18n()

const props = defineProps({
    currentView: {
        type: String,
        default: 'rooms'
    }
})

const emit = defineEmits(['navigate', 'openSettings', 'openPlugins', 'logout', 'disconnect'])

const settings = JSON.parse(localStorage.getItem('settings') || '{}')
const userAvatar = ref(settings.avatar || '')
const showExitMenu = ref(false)
const isDark = ref(false)

const userName = computed(() => {
    if (settings.lastName && settings.firstName) {
        return locale.value === 'zh-CN'
            ? `${settings.lastName}${settings.firstName}`
            : `${settings.firstName} ${settings.lastName}`
    }
    return settings.userId || 'User'
})

const navItems = ref([
    {
        id: 'rooms',
        active: true,
        paths: [
            { d: 'M4.75 8.25 12 4.75l7.25 3.5v7.5L12 19.25l-7.25-3.5Z' },
            { d: 'M12 4.75v14.5M4.75 8.25 12 12l7.25-3.75' }
        ],
        action: () => emit('navigate', 'rooms')
    },
    {
        id: 'recent',
        active: false,
        paths: [
            { d: 'M12 6v6l4 2' },
            { d: 'M12 20a8 8 0 1 1 5.66-2.34' }
        ],
        action: () => emit('navigate', 'recent')
    },
    {
        id: 'favorites',
        active: false,
        paths: [
            { d: 'm12 18.5-5.29 2.78 1.01-5.9-4.29-4.19 5.93-.86L12 5l2.64 5.33 5.93.86-4.29 4.19 1.01 5.9Z', linejoin: 'round' }
        ],
        action: () => emit('navigate', 'favorites')
    }
])

onMounted(() => {
    isDark.value = getStoredTheme() === 'dark'
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})

watch(() => props.currentView, newView => {
    navItems.value.forEach(item => {
        item.active = item.id === newView
    })
}, { immediate: true })

function toggleLanguage() {
    const newLocale = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
    locale.value = newLocale
    localStorage.setItem('locale', newLocale)
}

function toggleTheme() {
    isDark.value = !isDark.value
    setTheme(isDark.value ? 'dark' : 'light')
}

function openSettings() {
    emit('openSettings')
}

function openPlugins() {
    emit('openPlugins')
}

function toggleExitMenu() {
    showExitMenu.value = !showExitMenu.value
}

function handleLogout() {
    showExitMenu.value = false
    emit('logout')
}

function handleDisconnect() {
    showExitMenu.value = false
    emit('disconnect')
}

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

html[data-theme='dark'] .dock {
    background: rgba(28, 28, 28, 0.95);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

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

.dock-divider {
    width: 1px;
    height: 24px;
    background: rgba(0, 0, 0, 0.1);
    margin: 0 4px;
}

html[data-theme='dark'] .dock-divider {
    background: rgba(255, 255, 255, 0.1);
}

.dock-section {
    display: flex;
    align-items: center;
    gap: 8px;
}

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
    color: var(--text-primary);
}

.dock-icon {
    width: 20px;
    height: 20px;
    display: block;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dock-text {
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
}

.dock-item:hover {
    background: rgba(0, 0, 0, 0.05);
    transform: translateY(-4px);
}

html[data-theme='dark'] .dock-item:hover {
    background: rgba(255, 255, 255, 0.1);
}

.dock-item:active {
    transform: translateY(-2px);
}

.dock-item.active {
    background: rgba(103, 126, 234, 0.15);
}

html[data-theme='dark'] .dock-item.active {
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

.exit-menu-wrapper {
    position: relative;
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

html[data-theme='dark'] .exit-menu {
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
    width: 18px;
    height: 18px;
    display: block;
    flex-shrink: 0;
}

.menu-text {
    flex: 1;
    text-align: left;
}

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
        width: 18px;
        height: 18px;
    }

    .dock-text {
        font-size: 12px;
    }

    .user-name {
        display: none;
    }

    .user-pill {
        padding: 0 6px;
    }
}
</style>

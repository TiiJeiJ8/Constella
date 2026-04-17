<template>
    <div class="room-workspace-view">
        <WindowControls />

        <SettingsPanel v-model="showSettings" />
        <PluginPanel v-model="showPlugins" />

        <ConfirmDialog
            v-model="showLogoutDialog"
            :title="t('dock.logoutConfirm.title')"
            :message="t('dock.logoutConfirm.message')"
            :confirm-text="t('dock.logoutConfirm.confirm')"
            type="danger"
            @confirm="confirmLogout"
        />

        <ConfirmDialog
            v-model="showDisconnectDialog"
            :title="t('dock.disconnectConfirm.title')"
            :message="t('dock.disconnectConfirm.message')"
            :confirm-text="t('dock.disconnectConfirm.confirm')"
            type="danger"
            @confirm="confirmDisconnect"
        />

        <div class="topbar-container">
            <TopBar
                :mode="topbarMode"
                :title="topbarTitle"
                :search-value="searchQuery"
                :active-tab="roomsTab"
                @createRoom="handleCreateRoom"
                @search="handleSearch"
                @tabChange="handleTabChange"
            />
        </div>

        <div class="content-shell">
            <Transition name="room-content" mode="out-in">
                <component
                    :is="currentSubviewComponent"
                    :key="subview"
                    :search-query="searchQuery"
                    :active-tab="roomsTab"
                    :create-room-signal="createRoomSignal"
                    @navigate="handleNavigate"
                />
            </Transition>
        </div>

        <div class="dock-container">
            <Dock
                :current-view="subview"
                @navigate="handleNavigate"
                @openSettings="showSettings = true"
                @openPlugins="showPlugins = true"
                @logout="handleLogout"
                @disconnect="handleDisconnect"
            />
        </div>
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dock from '@/components/base/Dock.vue'
import TopBar from '@/components/base/TopBar.vue'
import SettingsPanel from '@/components/base/SettingsPanel.vue'
import PluginPanel from '@/components/plugins/PluginPanel.vue'
import WindowControls from '@/components/base/WindowControls.vue'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
import RoomsView from '@/views/RoomsView.vue'
import RecentView from '@/views/RecentView.vue'
import FavoritesView from '@/views/FavoritesView.vue'
import { clearAuthStorage } from '@/utils/storage'

const { t } = useI18n()

const props = defineProps({
    subview: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['navigate'])

const showSettings = ref(false)
const showPlugins = ref(false)
const showLogoutDialog = ref(false)
const showDisconnectDialog = ref(false)
const searchQuery = ref('')
const roomsTab = ref('all')
const createRoomSignal = ref(0)

const currentSubviewComponent = computed(() => {
    if (props.subview === 'recent') return RecentView
    if (props.subview === 'favorites') return FavoritesView
    return RoomsView
})

const topbarMode = computed(() => {
    if (props.subview === 'recent') return 'recent'
    if (props.subview === 'favorites') return 'favorites'
    return 'rooms'
})

const topbarTitle = computed(() => {
    if (props.subview === 'recent') return t('recent.title')
    if (props.subview === 'favorites') return t('favorites.title')
    return ''
})

watch(() => props.subview, nextSubview => {
    searchQuery.value = ''
    if (nextSubview !== 'rooms') {
        roomsTab.value = 'all'
    }
})

function handleNavigate(view, params) {
    emit('navigate', view, params)
}

function handleSearch(value) {
    searchQuery.value = value
}

function handleTabChange(tab) {
    roomsTab.value = tab
}

function handleCreateRoom() {
    if (props.subview !== 'rooms') return
    createRoomSignal.value += 1
}

function handleLogout() {
    showLogoutDialog.value = true
}

function handleDisconnect() {
    showDisconnectDialog.value = true
}

function confirmLogout() {
    clearAuthStorage()
    emit('navigate', 'login')
}

function confirmDisconnect() {
    localStorage.removeItem('serverUrl')
    clearAuthStorage()
    emit('navigate', 'home')
}
</script>

<style scoped>
.room-workspace-view {
    width: 100%;
    height: 100%;
    background: var(--bg-primary);
    position: relative;
    overflow: hidden;
    transition: background-color 0.3s ease, color 0.3s ease;
}

.topbar-container {
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99;
}

.content-shell {
    position: absolute;
    top: 88px;
    left: 16px;
    right: 16px;
    bottom: 96px;
    overflow: hidden;
}

.dock-container {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
}

.room-content-enter-active,
.room-content-leave-active {
    transition: opacity 0.24s ease;
}

.room-content-enter-from {
    opacity: 0;
}

.room-content-leave-to {
    opacity: 0;
}

@media (max-width: 768px) {
    .content-shell {
        top: 80px;
        bottom: 88px;
    }
}
</style>

<template>
    <div class="recent-view">
        <!-- 窗口控制按钮 -->
        <WindowControls />
        
        <!-- 设置面板 -->
        <SettingsPanel v-model="showSettings" />

        <!-- 加入房间对话框 -->
        <JoinRoomDialog
            v-model="showJoinDialog"
            :room="selectedRoom"
            @joined="handleRoomJoined"
        />

        <!-- 底部 Dock 栏 -->
        <div class="dock-container">
            <Dock
                current-view="recent"
                @navigate="handleNavigate"
                @openSettings="showSettings = true"
            />
        </div>

        <!-- 顶部岛状栏 -->
        <div class="topbar-container">
            <div class="topbar">
                <div class="topbar-section">
                    <h1 class="view-title">
                        <span class="title-icon">🕐</span>
                        {{ t('recent.title') }}
                    </h1>
                </div>
                <div class="topbar-section">
                    <input
                        v-model="searchQuery"
                        type="text"
                        :placeholder="t('recent.searchPlaceholder')"
                        class="search-input"
                    />
                </div>
            </div>
        </div>

        <!-- 主内容区 -->
        <div class="main-content">
            <!-- 骨架屏加载状态 -->
            <div v-if="loading" class="rooms-grid">
                <RoomCardSkeleton v-for="n in 6" :key="n" />
            </div>

            <!-- 错误状态 -->
            <div v-else-if="error" class="error-state">
                <div class="error-icon">⚠️</div>
                <p>{{ error }}</p>
                <button @click="loadRecentRooms" class="retry-button">{{ t('common.retry') }}</button>
            </div>

            <!-- 空状态 -->
            <div v-else-if="filteredRooms.length === 0" class="empty-state">
                <div class="empty-icon">🕐</div>
                <p>{{ t('recent.empty') }}</p>
                <p class="empty-hint">{{ t('recent.emptyHint') }}</p>
            </div>

            <!-- 房间网格 -->
            <div v-else class="rooms-grid">
                <div v-for="item in filteredRooms" :key="item.room.id" class="recent-card-wrapper">
                    <RoomCard 
                        :room="item.room"
                        @click="handleRoomClick"
                    />
                    <div class="recent-info">
                        <span class="recent-time">{{ formatVisitTime(item.lastVisit) }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Dock from '@/components/base/Dock.vue'
import RoomCardSkeleton from '@/components/rooms/RoomCardSkeleton.vue'
import SettingsPanel from '@/components/base/SettingsPanel.vue'
import WindowControls from '@/components/base/WindowControls.vue'
import RoomCard from '@/components/rooms/RoomCard.vue'
import JoinRoomDialog from '@/components/rooms/JoinRoomDialog.vue'
import { apiService } from '@/services/api'
import { parseServerTimestamp } from '@/utils/time'

const { t } = useI18n()

const emit = defineEmits(['navigate'])

// 状态管理
const loading = ref(false)
const error = ref(null)
const recentRooms = ref([])
const searchQuery = ref('')
const showSettings = ref(false)
const showJoinDialog = ref(false)
const selectedRoom = ref(null)

// 从 localStorage 获取最近访问记录
function getRecentVisits() {
    try {
        const visits = localStorage.getItem('recentVisits')
        return visits ? JSON.parse(visits) : []
    } catch (e) {
        console.error('Failed to parse recent visits:', e)
        return []
    }
}

// 过滤后的房间列表
const filteredRooms = computed(() => {
    if (!searchQuery.value) {
        return recentRooms.value
    }
    const query = searchQuery.value.toLowerCase()
    return recentRooms.value.filter(item => 
        item.room.name.toLowerCase().includes(query) ||
        item.room.description?.toLowerCase().includes(query)
    )
})

// 加载最近访问的房间
async function loadRecentRooms() {
    loading.value = true
    error.value = null

    try {
        // 获取最近访问记录（按时间倒序，最多显示 20 个）
        const visits = getRecentVisits()
            .sort((a, b) => b.lastVisit - a.lastVisit)
            .slice(0, 20)

        if (visits.length === 0) {
            recentRooms.value = []
            return
        }

        // 获取所有房间信息
        const response = await apiService.getRooms()
        
        if (!response.success) {
            error.value = t('recent.loadError')
            return
        }
        
        // 转换服务器数据格式
        const roomsData = response.data?.rooms || response.data || []
        const allRooms = Array.isArray(roomsData) ? roomsData.map(room => ({
            id: room.id,
            name: room.name || '未命名房间',
            description: room.description || '',
            creator: room.owner?.username || 'Unknown',
            memberCount: Math.max(0, room.member_count || 0),
            isPrivate: Boolean(room.is_private),
            role: room.user_role || null,
            lastActive: parseServerTimestamp(room.updated_at),
            settings: room.settings || {}
        })) : []

        // 匹配访问记录和房间信息
        recentRooms.value = visits
            .map(visit => {
                const room = allRooms.find(r => r.id === visit.roomId)
                return room ? { room, lastVisit: visit.lastVisit } : null
            })
            .filter(Boolean)

    } catch (err) {
        console.error('Failed to load recent rooms:', err)
        error.value = t('recent.loadError')
    } finally {
        loading.value = false
    }
}

// 格式化访问时间
function formatVisitTime(timestamp) {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t('recent.justNow')
    if (minutes < 60) return t('recent.minutesAgo', { n: minutes })
    if (hours < 24) return t('recent.hoursAgo', { n: hours })
    if (days < 7) return t('recent.daysAgo', { n: days })
    
    return new Date(timestamp).toLocaleDateString()
}

// 处理房间点击
function handleRoomClick(room) {
    if (room.is_private) {
        selectedRoom.value = room
        showJoinDialog.value = true
    } else {
        emit('navigate', 'canvas', { roomId: room.id })
    }
}

// 处理房间加入成功
function handleRoomJoined(roomId) {
    emit('navigate', 'canvas', { roomId })
}

// 处理导航
function handleNavigate(view) {
    emit('navigate', view)
}

// 组件挂载时加载数据
onMounted(() => {
    loadRecentRooms()
})
</script>

<style scoped>
.recent-view {
    width: 100%;
    height: 100vh;
    background: var(--bg-primary);
    position: relative;
    overflow: hidden;
}

.dock-container {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
}

.topbar-container {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 90;
    width: 90%;
    max-width: 1200px;
}

.topbar {
    background: var(--bg-secondary);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: var(--shadow-lg);
}

.topbar-section {
    display: flex;
    align-items: center;
    gap: 12px;
}

.view-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
}

.title-icon {
    font-size: 24px;
}

.search-input {
    width: 300px;
    height: 36px;
    padding: 0 16px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 14px;
    transition: all 0.2s;
}

.search-input:focus {
    outline: none;
    border-color: var(--primary-color);
}

.main-content {
    padding: 120px 40px 100px;
    height: 100%;
    overflow-y: auto;
}

.rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    max-width: 1400px;
    margin: 0 auto;
}

.recent-card-wrapper {
    position: relative;
}

.recent-info {
    margin-top: 8px;
    text-align: center;
}

.recent-time {
    font-size: 12px;
    color: var(--text-secondary);
}

.error-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    gap: 16px;
}

.error-icon,
.empty-icon {
    font-size: 64px;
}

.error-state p,
.empty-state p {
    font-size: 16px;
    color: var(--text-secondary);
    margin: 0;
}

.empty-hint {
    font-size: 14px;
    color: var(--text-tertiary);
}

.retry-button {
    padding: 8px 20px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}

.retry-button:hover {
    opacity: 0.8;
}

/* 滚动条样式 */
.main-content::-webkit-scrollbar {
    width: 8px;
}

.main-content::-webkit-scrollbar-track {
    background: transparent;
}

.main-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
}
</style>

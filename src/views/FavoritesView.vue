<template>
    <div class="favorites-view">
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
                current-view="favorites"
                @navigate="handleNavigate"
                @openSettings="showSettings = true"
            />
        </div>

        <!-- 顶部岛状栏 -->
        <div class="topbar-container">
            <div class="topbar">
                <div class="topbar-section">
                    <h1 class="view-title">
                        <span class="title-icon">⭐</span>
                        {{ t('favorites.title') }}
                    </h1>
                </div>
                <div class="topbar-section">
                    <input
                        v-model="searchQuery"
                        type="text"
                        :placeholder="t('favorites.searchPlaceholder')"
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
                <button @click="loadFavorites" class="retry-button">{{ t('common.retry') }}</button>
            </div>

            <!-- 空状态 -->
            <div v-else-if="filteredRooms.length === 0" class="empty-state">
                <div class="empty-icon">⭐</div>
                <p>{{ t('favorites.empty') }}</p>
                <p class="empty-hint">{{ t('favorites.emptyHint') }}</p>
            </div>

            <!-- 房间网格 -->
            <div v-else class="rooms-grid">
                <div v-for="item in filteredRooms" :key="item.room.id" class="favorite-card-wrapper">
                    <RoomCard 
                        :room="item.room"
                        :is-favorite="true"
                        @click="handleRoomClick"
                        @unfavorite="handleUnfavorite(item.room.id)"
                    />
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

const { t } = useI18n()

const emit = defineEmits(['navigate'])

// 状态管理
const loading = ref(false)
const error = ref(null)
const favoriteRooms = ref([])
const searchQuery = ref('')
const showSettings = ref(false)
const showJoinDialog = ref(false)
const selectedRoom = ref(null)

// 从 localStorage 获取收藏列表
function getFavorites() {
    try {
        const favorites = localStorage.getItem('favoriteRooms')
        return favorites ? JSON.parse(favorites) : []
    } catch (e) {
        console.error('Failed to parse favorites:', e)
        return []
    }
}

// 保存收藏列表到 localStorage
function saveFavorites(favorites) {
    try {
        localStorage.setItem('favoriteRooms', JSON.stringify(favorites))
    } catch (e) {
        console.error('Failed to save favorites:', e)
    }
}

// 过滤后的房间列表
const filteredRooms = computed(() => {
    if (!searchQuery.value) {
        return favoriteRooms.value
    }
    const query = searchQuery.value.toLowerCase()
    return favoriteRooms.value.filter(item => 
        item.room.name.toLowerCase().includes(query) ||
        item.room.description?.toLowerCase().includes(query)
    )
})

// 加载收藏的房间
async function loadFavorites() {
    loading.value = true
    error.value = null

    try {
        // 获取收藏的房间 ID 列表
        const favorites = getFavorites()

        if (favorites.length === 0) {
            favoriteRooms.value = []
            return
        }

        // 获取所有房间信息
        const response = await apiService.getRooms()
        
        if (!response.success) {
            error.value = t('favorites.loadError')
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
            lastActive: room.updated_at ? new Date(room.updated_at).getTime() : Date.now(),
            settings: room.settings || {}
        })) : []

        // 匹配收藏记录和房间信息
        favoriteRooms.value = favorites
            .map(fav => {
                const room = allRooms.find(r => r.id === fav.roomId)
                return room ? { room, addedAt: fav.addedAt } : null
            })
            .filter(Boolean)
            .sort((a, b) => b.addedAt - a.addedAt) // 按添加时间倒序

    } catch (err) {
        console.error('Failed to load favorites:', err)
        error.value = t('favorites.loadError')
    } finally {
        loading.value = false
    }
}

// 取消收藏
function handleUnfavorite(roomId) {
    const favorites = getFavorites()
    const newFavorites = favorites.filter(fav => fav.roomId !== roomId)
    saveFavorites(newFavorites)
    
    // 更新本地状态
    favoriteRooms.value = favoriteRooms.value.filter(item => item.room.id !== roomId)
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
    loadFavorites()
})

// 暴露方法供父组件调用
defineExpose({
    loadFavorites
})
</script>

<style scoped>
.favorites-view {
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

.favorite-card-wrapper {
    position: relative;
}

.unfavorite-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 215, 0, 0.9);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.2s;
    z-index: 10;
}

.unfavorite-btn:hover {
    transform: scale(1.1);
    background: rgba(255, 215, 0, 1);
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

<template>
    <div class="rooms-view">
        <!-- 窗口控制按钮 -->
        <WindowControls />
        
        <!-- 设置面板 -->
        <SettingsPanel v-model="showSettings" />

        <!-- 退出登录确认对话框 -->
        <ConfirmDialog
            v-model="showLogoutDialog"
            :title="t('dock.logoutConfirm.title')"
            :message="t('dock.logoutConfirm.message')"
            :confirm-text="t('dock.logoutConfirm.confirm')"
            type="danger"
            @confirm="confirmLogout"
        />

        <!-- 断开连接确认对话框 -->
        <ConfirmDialog
            v-model="showDisconnectDialog"
            :title="t('dock.disconnectConfirm.title')"
            :message="t('dock.disconnectConfirm.message')"
            :confirm-text="t('dock.disconnectConfirm.confirm')"
            type="danger"
            @confirm="confirmDisconnect"
        />

        <!-- 创建房间对话框 -->
        <CreateRoomDialog
            v-model="showCreateDialog"
            @created="handleRoomCreated"
        />

        <!-- 加入房间对话框 -->
        <JoinRoomDialog
            v-model="showJoinDialog"
            :room="selectedRoom"
            @joined="handleRoomJoined"
        />

        <!-- 删除房间确认对话框 -->
        <DeleteRoomDialog
            v-model="showDeleteDialog"
            :room="selectedRoom"
            @confirm="handleDeleteConfirm"
        />

        <!-- 底部 Dock 栏 -->
        <div class="dock-container">
            <Dock
                current-view="rooms"
                @navigate="handleNavigate"
                @openSettings="showSettings = true"
                @logout="handleLogout"
                @disconnect="handleDisconnect"
            />
        </div>

        <!-- 顶部岛状栏 -->
        <div class="topbar-container">
            <TopBar
                @createRoom="handleCreateRoom"
                @search="handleSearch"
                @tabChange="handleTabChange"
            />
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
                <button @click="loadRooms" class="retry-button">{{ t('common.retry') }}</button>
            </div>

            <!-- 空状态 -->
            <div v-else-if="filteredRooms.length === 0" class="empty-state">
                <div class="empty-icon">📭</div>
                <p>{{ t('rooms.empty') }}</p>
                <button @click="handleCreateRoom" class="create-button">{{ t('rooms.createFirst') }}</button>
            </div>

            <!-- 房间网格 -->
            <div v-else class="rooms-grid">
                <RoomCard 
                    v-for="room in filteredRooms" 
                    :key="room.id" 
                    :room="room"
                    :show-delete="activeTab === 'my'"
                    @click="handleRoomClick"
                    @delete="handleDeleteClick"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Dock from '@/components/base/Dock.vue'
import TopBar from '@/components/base/TopBar.vue'
import RoomCardSkeleton from '@/components/rooms/RoomCardSkeleton.vue'
import SettingsPanel from '@/components/base/SettingsPanel.vue'
import WindowControls from '@/components/base/WindowControls.vue'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
import RoomCard from '@/components/rooms/RoomCard.vue'
import CreateRoomDialog from '@/components/rooms/CreateRoomDialog.vue'
import JoinRoomDialog from '@/components/rooms/JoinRoomDialog.vue'
import DeleteRoomDialog from '@/components/rooms/DeleteRoomDialog.vue'
import { apiService } from '@/services/api'

const { t } = useI18n()

const emit = defineEmits(['navigate'])

// 状态管理
const rooms = ref([])
const loading = ref(false)
const error = ref('')
const showSettings = ref(false)
const showCreateDialog = ref(false)
const showJoinDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedRoom = ref(null)
const showLogoutDialog = ref(false)
const showDisconnectDialog = ref(false)
const searchQuery = ref('')
const activeTab = ref('all')

// 定时刷新
let refreshInterval = null
const REFRESH_INTERVAL = 10000 // 10秒刷新一次

// 加载房间列表
async function loadRooms(silent = false) {
    // 静默刷新时不显示 loading
    if (!silent) {
        loading.value = true
    }
    error.value = ''
    
    try {
        let response
        
        // 根据 activeTab 加载不同的房间数据
        if (activeTab.value === 'all') {
            // 获取所有房间（公开+私密，需要登录）
            const userId = localStorage.getItem('user_id')
            if (!userId) {
                error.value = t('common.errors.userNotLoggedIn')
                loading.value = false
                return
            }
            // 调用专门的获取所有房间接口
            response = await apiService.getAllRooms()
        } else if (activeTab.value === 'my') {
            // 获取我创建的房间
            const userId = localStorage.getItem('user_id')
            if (!userId) {
                error.value = t('common.errors.userNotLoggedIn')
                loading.value = false
                return
            }
            response = await apiService.getRooms({ userId })
        } else if (activeTab.value === 'joined') {
            // 获取我加入的房间
            response = await apiService.getMyRooms()
        } else if (activeTab.value === 'public') {
            // 获取所有公开房间（不传userId参数，服务器会返回公开房间）
            response = await apiService.getRooms()
        } else {
            // 默认获取所有房间
            response = await apiService.getRooms()
        }
        
        if (response.success && response.data) {
            // 转换服务器数据格式，增强容错性
            const roomsData = response.data.rooms || response.data || []
            
            if (!Array.isArray(roomsData)) {
                console.warn('Invalid rooms data format:', roomsData)
                rooms.value = []
                return
            }
            
            rooms.value = roomsData.map(room => {
                try {
                    return {
                        id: room.id,
                        name: room.name || '未命名房间',
                        description: room.description || '',
                        creator: room.owner?.username || 'Unknown',
                        memberCount: Math.max(0, room.member_count || 0),
                        isPrivate: Boolean(room.is_private),
                        role: room.user_role || null,  // 不给默认值，未加入的房间角色为 null
                        lastActive: room.updated_at ? new Date(room.updated_at).getTime() : Date.now(),
                        createdAt: room.created_at,
                        settings: room.settings || {}
                    }
                } catch (err) {
                    console.error('Error parsing room data:', room, err)
                    return null
                }
            }).filter(Boolean)  // 过滤掉解析失败的房间
        } else {
            // 根据错误码显示翻译后的错误消息
            if (response.errorCode === 'USER_NOT_LOGGED_IN') {
                error.value = t('common.errors.userNotLoggedIn')
            } else {
                error.value = response.message || t('rooms.errors.loadFailed')
            }
            console.error('加载房间失败:', response.message)
        }
    } catch (err) {
        error.value = err.message || t('rooms.errors.loadFailed')
        console.error('加载房间错误:', err)
    } finally {
        loading.value = false
    }
}

// 过滤房间
const filteredRooms = computed(() => {
    let result = rooms.value
    
    // 根据搜索查询过滤
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        result = result.filter(room => 
            room.name.toLowerCase().includes(query) ||
            room.description?.toLowerCase().includes(query) ||
            room.creator.toLowerCase().includes(query)
        )
    }
    
    return result
})

// 组件挂载时加载房间
onMounted(() => {
    loadRooms()
    
    // 启动定时刷新（30秒一次）
    refreshInterval = setInterval(() => {
        // 静默刷新，不显示 loading 状态
        loadRooms(true)
    }, REFRESH_INTERVAL)
})

// 组件卸载时清理定时器
onUnmounted(() => {
    if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
    }
})

// 处理导航
function handleNavigate(view) {
    emit('navigate', view)
}

// 处理搜索
function handleSearch(query) {
    searchQuery.value = query
}

// 处理标签切换
function handleTabChange(tab) {
    activeTab.value = tab
    loadRooms()  // 重新加载房间数据
}

// 处理创建房间
function handleCreateRoom() {
    showCreateDialog.value = true
}

// 房间创建成功
function handleRoomCreated(room) {
    // 重新加载房间列表
    loadRooms()
}

// 处理房间点击
async function handleRoomClick(room) {
    console.log('[Rooms] Room click:', {
        id: room.id,
        role: room.role,
        isPrivate: room.isPrivate,
        memberCount: room.memberCount
    })
    
    // 如果已经有角色，直接进入
    if (room.role && room.role !== 'none') {
        console.log('[Rooms] User already has role:', room.role, ', entering room')
        emit('navigate', 'canvas', { roomId: room.id })
        return
    }
    
    // 如果没有角色，需要加入房间
    if (room.isPrivate) {
        // 私密房间需要密码
        console.log('[Rooms] Private room, showing join dialog')
        selectedRoom.value = room
        showJoinDialog.value = true
    } else {
        // 公开房间直接加入（不需要密码）
        console.log('[Rooms] Public room, joining automatically')
        try {
            const response = await apiService.joinRoom(room.id, '')
            if (response.success) {
                console.log('[Rooms] Successfully joined public room')
                // 更新本地房间角色
                const roomIndex = rooms.value.findIndex(r => r.id === room.id)
                if (roomIndex !== -1) {
                    const userId = localStorage.getItem('user_id')
                    rooms.value[roomIndex].role = rooms.value[roomIndex].creator === userId ? 'owner' : 'member'
                    rooms.value[roomIndex].memberCount = (rooms.value[roomIndex].memberCount || 0) + 1
                }
                // 刷新房间列表并进入
                await loadRooms()
                emit('navigate', 'canvas', { roomId: room.id })
            } else if (response.errorCode === 'ROOM_ALREADY_MEMBER') {
                // 如果已经是成员，说明列表数据过期，更新本地数据并进入
                console.log('[Rooms] Already a member, updating local data and entering')
                const roomIndex = rooms.value.findIndex(r => r.id === room.id)
                if (roomIndex !== -1) {
                    const userId = localStorage.getItem('user_id')
                    rooms.value[roomIndex].role = rooms.value[roomIndex].creator === userId ? 'owner' : 'member'
                    console.log('[Rooms] Updated local room role to:', rooms.value[roomIndex].role)
                }
                // 强制刷新后进入
                await loadRooms()
                emit('navigate', 'canvas', { roomId: room.id })
            } else {
                console.error('Failed to join public room:', response.message)
                error.value = response.message || t('rooms.errors.joinFailed')
            }
        } catch (err) {
            console.error('Error joining public room:', err)
            error.value = err.message || t('rooms.errors.joinFailed')
        }
    }
}

// 房间加入成功
async function handleRoomJoined(room) {
    console.log('[Rooms] Successfully joined room:', room.id)
    
    // 先更新本地房间数据的角色（临时修复后端 user_role 为 null 的问题）
    const roomIndex = rooms.value.findIndex(r => r.id === room.id)
    if (roomIndex !== -1) {
        // 如果是房间创建者，设置为 owner，否则设置为 member
        const userId = localStorage.getItem('user_id')
        rooms.value[roomIndex].role = rooms.value[roomIndex].creator === userId ? 'owner' : 'member'
        console.log('[Rooms] Updated local room role to:', rooms.value[roomIndex].role)
    }
    
    // 然后刷新房间列表，获取最新数据（包括成员数）
    await loadRooms()
    
    // 最后进入房间
    emit('navigate', 'canvas', { roomId: room.id })
}

// 处理删除房间点击
function handleDeleteClick(room) {
    selectedRoom.value = room
    showDeleteDialog.value = true
}

// 处理删除确认
async function handleDeleteConfirm({ roomId, password, callback }) {
    try {
        const result = await apiService.deleteRoom(roomId, password)
        
        if (result.success) {
            callback(true)
            // 刷新房间列表
            await loadRooms()
        } else {
            callback(false, result.message || t('rooms.delete.failed'))
        }
    } catch (error) {
        callback(false, error.message || t('rooms.delete.failed'))
    }
}

// 显示退出登录对话框
function handleLogout() {
    showLogoutDialog.value = true
}

// 显示断开连接对话框
function handleDisconnect() {
    showDisconnectDialog.value = true
}

// 确认退出登录
function confirmLogout() {
    emit('navigate', 'login')
}

// 确认断开连接
function confirmDisconnect() {
    emit('navigate', 'home')
}
</script>

<style scoped>
.rooms-view {
    width: 100vw;
    height: 100vh;
    background: var(--bg-primary);
    position: relative;
    overflow: hidden;
    transition: background-color 0.3s ease, color 0.3s ease;
}

/* ==================== 底部 Dock 栏容器 ==================== */
.dock-container {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
}

/* ==================== 顶部岛状栏容器 ==================== */
.topbar-container {
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99;
}

/* ==================== 主内容区 ==================== */
.main-content {
    position: absolute;
    top: 88px; /* 16px + 56px + 16px */
    left: 16px;
    right: 16px;
    bottom: 96px; /* 16px + 64px + 16px */
    overflow-y: auto;
    padding: 16px;
}

.rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    padding-bottom: 32px;
}

/* ==================== 加载、错误、空状态 ==================== */
.loading-state,
.error-state,
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 16px;
    color: var(--text-secondary);
}

.loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(99, 102, 241, 0.2);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
    font-size: 64px;
    opacity: 0.6;
}

.retry-button,
.create-button {
    padding: 10px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.retry-button:hover,
.create-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
}

.retry-button:active,
.create-button:active {
    transform: translateY(0);
}

/* ==================== 滚动条样式 ==================== */
.main-content::-webkit-scrollbar {
    width: 6px;
}

.main-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
}

.main-content::-webkit-scrollbar-track {
    background: transparent;
}

/* ==================== 暗色模式 ==================== */
.dark .dock-placeholder,
.dark .topbar-placeholder {
    background: rgba(30, 30, 30, 0.8);
    color: #ccc;
}

.dark .placeholder-card {
    background: rgba(40, 40, 40, 0.9);
}

.dark .card-header {
    color: #eee;
}

.dark .card-body {
    color: #aaa;
}

.dark .main-content::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 1200px) {
    .rooms-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .main-content {
        top: 80px;
        bottom: 88px;
    }

    .rooms-grid {
        grid-template-columns: 1fr;
        gap: 16px;
        padding: 0 16px;
    }

    .topbar-placeholder {
        min-width: auto;
        width: calc(100vw - 32px);
    }
    
    .empty-state,
    .error-state {
        padding: 40px 20px;
    }
    
    .empty-icon,
    .error-icon {
        font-size: 48px;
    }
    
    .empty-state p,
    .error-state p {
        font-size: 14px;
    }
}

@media (max-width: 480px) {
    .main-content {
        padding: 20px 0;
    }
    
    .topbar-container {
        left: 16px;
        right: 16px;
    }
}
</style>

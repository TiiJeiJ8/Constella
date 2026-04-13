<template>
    <div class="rooms-view">
        <CreateRoomDialog
            v-model="showCreateDialog"
            @created="handleRoomCreated"
        />

        <JoinRoomDialog
            v-model="showJoinDialog"
            :room="selectedRoom"
            @joined="handleRoomJoined"
        />

        <DeleteRoomDialog
            v-model="showDeleteDialog"
            :room="selectedRoom"
            @confirm="handleDeleteConfirm"
        />

        <div class="main-content">
            <div v-if="loading" class="rooms-grid">
                <RoomCardSkeleton v-for="n in 6" :key="n" />
            </div>

            <div v-else-if="error" class="error-state">
                <div class="error-icon">!</div>
                <p>{{ error }}</p>
                <button @click="loadRooms" class="retry-button">{{ t('common.retry') }}</button>
            </div>

            <div v-else-if="filteredRooms.length === 0" class="empty-state">
                <div class="empty-icon">...</div>
                <p>{{ t('rooms.empty') }}</p>
                <button @click="handleCreateRoom" class="create-button">{{ t('rooms.createFirst') }}</button>
            </div>

            <div v-else class="rooms-grid">
                <RoomCard
                    v-for="room in filteredRooms"
                    :key="room.id"
                    :room="room"
                    :show-delete="currentTab === 'my'"
                    @click="handleRoomClick"
                    @delete="handleDeleteClick"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import RoomCardSkeleton from '@/components/rooms/RoomCardSkeleton.vue'
import RoomCard from '@/components/rooms/RoomCard.vue'
import CreateRoomDialog from '@/components/rooms/CreateRoomDialog.vue'
import JoinRoomDialog from '@/components/rooms/JoinRoomDialog.vue'
import DeleteRoomDialog from '@/components/rooms/DeleteRoomDialog.vue'
import { apiService } from '@/services/api'
import { useRoomsList } from '@/composables/useRoomsList'
import { removeRoomFromLocalCollections } from '@/utils/storage'

const { t } = useI18n()
const props = defineProps({
    searchQuery: {
        type: String,
        default: ''
    },
    activeTab: {
        type: String,
        default: 'all'
    },
    createRoomSignal: {
        type: Number,
        default: 0
    }
})
const emit = defineEmits(['navigate'])

const {
    loading,
    error,
    activeTab: currentTab,
    filteredRooms,
    loadRooms,
    setSearchQuery,
    setActiveTab,
    markRoomJoined,
    removeRoom
} = useRoomsList({ t })

const showCreateDialog = ref(false)
const showJoinDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedRoom = ref(null)

function handleCreateRoom() {
    showCreateDialog.value = true
}

async function handleRoomCreated() {
    await loadRooms()
}

async function handleRoomClick(room) {
    if (room.role && room.role !== 'none') {
        emit('navigate', 'canvas', { roomId: room.id })
        return
    }

    if (room.isPrivate) {
        selectedRoom.value = room
        showJoinDialog.value = true
        return
    }

    try {
        const response = await apiService.joinRoom(room.id, '')
        if (response.success || response.errorCode === 'ROOM_ALREADY_MEMBER') {
            markRoomJoined(room.id)
            await loadRooms(true)
            emit('navigate', 'canvas', { roomId: room.id })
            return
        }

        error.value = response.message || t('joinRoom.errors.joinFailed')
    } catch (err) {
        error.value = err?.message || t('joinRoom.errors.joinFailed')
    }
}

async function handleRoomJoined(room) {
    markRoomJoined(room.id)
    await loadRooms(true)
    emit('navigate', 'canvas', { roomId: room.id })
}

function handleDeleteClick(room) {
    selectedRoom.value = room
    showDeleteDialog.value = true
}

async function handleDeleteConfirm({ roomId, password, callback }) {
    try {
        const result = await apiService.deleteRoom(roomId, password)

        if (result.success) {
            callback(true)
            removeRoom(roomId)
            removeRoomFromLocalCollections(roomId)
            await loadRooms(true)
            return
        }

        callback(false, result.message || t('rooms.delete.failed'))
    } catch (error) {
        callback(false, error.message || t('rooms.delete.failed'))
    }
}

watch(() => props.searchQuery, value => {
    setSearchQuery(value)
}, { immediate: true })

watch(() => props.activeTab, value => {
    setActiveTab(value)
}, { immediate: true })

watch(() => props.createRoomSignal, (value, previousValue) => {
    if (value !== previousValue) {
        showCreateDialog.value = true
    }
})
</script>

<style scoped>
.rooms-view {
    width: 100%;
    height: 100%;
}

.main-content {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 16px;
}

.rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    padding-bottom: 32px;
}

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

.dark .main-content::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
}

@media (max-width: 1200px) {
    .rooms-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .rooms-grid {
        grid-template-columns: 1fr;
        gap: 16px;
        padding: 0 16px;
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
}
</style>

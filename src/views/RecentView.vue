<template>
    <div class="recent-view">
        <JoinRoomDialog
            v-model="showJoinDialog"
            :room="selectedRoom"
            @joined="handleRoomJoined"
        />

        <div class="main-content">
            <div v-if="loading" class="rooms-grid">
                <RoomCardSkeleton v-for="n in 6" :key="n" />
            </div>

            <div v-else-if="error" class="error-state">
                <div class="error-icon">!</div>
                <p>{{ error }}</p>
                <button @click="loadRecentRooms" class="retry-button">{{ t('common.retry') }}</button>
            </div>

            <div v-else-if="filteredRooms.length === 0" class="empty-state">
                <p>{{ t('recent.empty') }}</p>
                <p class="empty-hint">{{ t('recent.emptyHint') }}</p>
            </div>

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
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import RoomCardSkeleton from '@/components/rooms/RoomCardSkeleton.vue'
import RoomCard from '@/components/rooms/RoomCard.vue'
import JoinRoomDialog from '@/components/rooms/JoinRoomDialog.vue'
import { apiService } from '@/services/api'
import { mapRoomCollection } from '@/utils/roomMapper'
import { getRecentVisits } from '@/utils/storage'

const { t } = useI18n()
const props = defineProps({
    searchQuery: {
        type: String,
        default: ''
    }
})
const emit = defineEmits(['navigate'])

const loading = ref(false)
const error = ref(null)
const recentRooms = ref([])
const showJoinDialog = ref(false)
const selectedRoom = ref(null)

const filteredRooms = computed(() => {
    if (!props.searchQuery) return recentRooms.value

    const query = props.searchQuery.toLowerCase()
    return recentRooms.value.filter(item =>
        item.room.name.toLowerCase().includes(query) ||
        item.room.description?.toLowerCase().includes(query)
    )
})

async function loadRecentRooms() {
    loading.value = true
    error.value = null

    try {
        const visits = getRecentVisits()
            .sort((a, b) => b.lastVisit - a.lastVisit)
            .slice(0, 20)

        if (!visits.length) {
            recentRooms.value = []
            return
        }

        const response = await apiService.getAllRooms()
        if (!response.success) {
            error.value = response.message || t('recent.loadError')
            return
        }

        const allRooms = mapRoomCollection(response.data)
        recentRooms.value = visits
            .map(visit => {
                const room = allRooms.find(item => item.id === visit.roomId)
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

function handleRoomClick(room) {
    if (room.isPrivate) {
        selectedRoom.value = room
        showJoinDialog.value = true
        return
    }

    emit('navigate', 'canvas', { roomId: room.id })
}

function handleRoomJoined(room) {
    emit('navigate', 'canvas', { roomId: room.id })
}

onMounted(() => {
    void loadRecentRooms()
})
</script>

<style scoped>
.recent-view {
    width: 100%;
    height: 100%;
}

.main-content {
    padding: 16px 40px 0;
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

.error-icon {
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

@media (max-width: 768px) {
    .main-content {
        padding: 16px 16px 0;
    }

    .rooms-grid {
        grid-template-columns: 1fr;
    }
}
</style>

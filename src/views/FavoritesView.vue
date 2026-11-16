<template>
    <div class="ct-room-collection">
        <JoinRoomDialog
            v-model="showJoinDialog"
            :room="selectedRoom"
            @joined="handleRoomJoined"
        />

        <div class="ct-room-collection-content">
            <div v-if="loading" class="ct-room-collection-grid">
                <RoomCardSkeleton v-for="n in 6" :key="n" />
            </div>

            <div v-else-if="error" class="ct-room-collection-error">
                <div class="ct-room-collection-error-icon">!</div>
                <p>{{ error }}</p>
                <button @click="loadFavorites" class="ct-room-collection-retry">{{ t('common.retry') }}</button>
            </div>

            <div v-else-if="filteredRooms.length === 0" class="ct-room-collection-empty">
                <p>{{ t('favorites.empty') }}</p>
                <p class="ct-room-collection-empty-hint">{{ t('favorites.emptyHint') }}</p>
            </div>

            <div v-else class="ct-room-collection-grid">
                <div v-for="item in filteredRooms" :key="item.room.id" class="ct-room-collection-card">
                    <RoomCard
                        :room="item.room"
                        :is-favorite="true"
                        @click="handleRoomClick"
                        @favoriteChange="handleFavoriteChange"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import '@/styles/room-collections.css'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import RoomCardSkeleton from '@/components/rooms/RoomCardSkeleton.vue'
import RoomCard from '@/components/rooms/RoomCard.vue'
import JoinRoomDialog from '@/components/rooms/JoinRoomDialog.vue'
import { apiService } from '@/services/api'
import { mapRoomCollection } from '@/utils/roomMapper'
import { getErrorMessage } from '@/utils/errorHandler'
import { getFavoriteRooms } from '@/utils/storage'

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
const favoriteRooms = ref([])
const showJoinDialog = ref(false)
const selectedRoom = ref(null)

const filteredRooms = computed(() => {
    if (!props.searchQuery) return favoriteRooms.value

    const query = props.searchQuery.toLowerCase()
    return favoriteRooms.value.filter(item =>
        item.room.name.toLowerCase().includes(query) ||
        item.room.description?.toLowerCase().includes(query)
    )
})

async function loadFavorites() {
    loading.value = true
    error.value = null

    try {
        const favorites = getFavoriteRooms()
        if (!favorites.length) {
            favoriteRooms.value = []
            return
        }

        const response = await apiService.getAllRooms()
        if (!response.success) {
            error.value = getErrorMessage(response.errorCode, t('favorites.loadError'))
            return
        }

        const allRooms = mapRoomCollection(response.data)
        favoriteRooms.value = favorites
            .map(favorite => {
                const room = allRooms.find(item => item.id === favorite.roomId)
                return room ? { room, addedAt: favorite.addedAt } : null
            })
            .filter(Boolean)
            .sort((a, b) => b.addedAt - a.addedAt)
    } catch (err) {
        console.error('Failed to load favorites:', err)
        error.value = t('favorites.loadError')
    } finally {
        loading.value = false
    }
}

function handleFavoriteChange(roomId, isFavorite) {
    if (isFavorite) return
    favoriteRooms.value = favoriteRooms.value.filter(item => item.room.id !== roomId)
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
    void loadFavorites()
})

defineExpose({
    loadFavorites
})
</script>

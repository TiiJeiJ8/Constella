import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { apiService } from '@/services/api'
import { mapRoomCollection, type RoomListItem } from '@/utils/roomMapper'
import { getUserId } from '@/utils/storage'

interface UseRoomsListOptions {
    t: (key: string) => string
    refreshInterval?: number
    enabled?: boolean
}

export function useRoomsList(options: UseRoomsListOptions) {
    const { t, refreshInterval = 10000, enabled = true } = options

    const rooms = ref<RoomListItem[]>([])
    const loading = ref(false)
    const error = ref('')
    const searchQuery = ref('')
    const activeTab = ref('all')

    let refreshTimer: number | null = null

    async function loadRooms(silent = false) {
        if (!enabled) return

        if (!silent) {
            loading.value = true
        }
        error.value = ''

        try {
            let response

            if (activeTab.value === 'all') {
                const userId = getUserId()
                if (!userId) {
                    error.value = t('common.errors.userNotLoggedIn')
                    rooms.value = []
                    return
                }
                response = await apiService.getAllRooms()
            } else if (activeTab.value === 'my') {
                const userId = getUserId()
                if (!userId) {
                    error.value = t('common.errors.userNotLoggedIn')
                    rooms.value = []
                    return
                }
                response = await apiService.getRooms({ userId })
            } else if (activeTab.value === 'joined') {
                response = await apiService.getMyRooms()
            } else if (activeTab.value === 'public') {
                response = await apiService.getRooms()
            } else {
                response = await apiService.getRooms()
            }

            if (!response.success) {
                if (response.errorCode === 'USER_NOT_LOGGED_IN') {
                    error.value = t('common.errors.userNotLoggedIn')
                } else {
                    error.value = response.message || t('rooms.errors.loadFailed')
                }
                rooms.value = []
                return
            }

            rooms.value = mapRoomCollection(response.data)
        } catch (err: any) {
            error.value = err?.message || t('rooms.errors.loadFailed')
            rooms.value = []
        } finally {
            loading.value = false
        }
    }

    const filteredRooms = computed(() => {
        if (!searchQuery.value) return rooms.value

        const query = searchQuery.value.toLowerCase()
        return rooms.value.filter(room =>
            room.name.toLowerCase().includes(query) ||
            room.description.toLowerCase().includes(query) ||
            room.creator.toLowerCase().includes(query)
        )
    })

    function setSearchQuery(query: string) {
        searchQuery.value = query
    }

    function setActiveTab(tab: string) {
        activeTab.value = tab
    }

    function markRoomJoined(roomId: string) {
        const currentUserId = getUserId()
        const room = rooms.value.find(item => item.id === roomId)
        if (!room) return

        if (room.creator === currentUserId) {
            room.role = 'owner'
        } else if (!room.role || room.role === 'none') {
            room.role = null
        }
        room.memberCount = Math.max(1, (room.memberCount || 0) + 1)
    }

    function removeRoom(roomId: string) {
        rooms.value = rooms.value.filter(room => room.id !== roomId)
    }

    function startRefresh() {
        if (!enabled || refreshTimer != null) return

        refreshTimer = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return
            void loadRooms(true)
        }, refreshInterval)
    }

    function stopRefresh() {
        if (refreshTimer != null) {
            window.clearInterval(refreshTimer)
            refreshTimer = null
        }
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            void loadRooms(true)
        }
    }

    watch(activeTab, () => {
        void loadRooms()
    })

    onMounted(() => {
        if (!enabled) return
        void loadRooms()
        startRefresh()
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onUnmounted(() => {
        stopRefresh()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    })

    return {
        rooms,
        loading,
        error,
        searchQuery,
        activeTab,
        filteredRooms,
        loadRooms,
        setSearchQuery,
        setActiveTab,
        markRoomJoined,
        removeRoom,
        startRefresh,
        stopRefresh
    }
}

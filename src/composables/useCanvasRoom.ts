import { computed, onMounted, onUnmounted, provide, ref, watch, type Ref } from 'vue'
import { useYjs, type RoomRealtimeEvent } from '@/composables/useYjs'
import { useYjsNodes } from '@/composables/useYjsNodes'
import { useYjsEdges } from '@/composables/useYjsEdges'
import { useYjsChat } from '@/composables/useYjsChat'
import { useAwareness } from '@/composables/useAwareness'
import { apiService } from '@/services/api'
import { registerPlugins } from '@/plugins/register'
import { getUserId, getUsername, recordRecentVisit } from '@/utils/storage'

interface UseCanvasRoomOptions {
    roomId: string
    t: (key: string) => string
    toast: { success: (message: string) => void; error: (message: string) => void }
    bubbleContainerRef: Ref<{ addBubble?: (message: unknown) => void } | null>
    emitNavigate: (view: string) => void
}

interface RoomCapabilities {
    can_view: boolean
    can_edit: boolean
    can_manage_members: boolean
    can_manage_room: boolean
    can_upload_assets: boolean
    can_manage_snapshots: boolean
    can_delete_room: boolean
}

const EMPTY_CAPABILITIES: RoomCapabilities = {
    can_view: false,
    can_edit: false,
    can_manage_members: false,
    can_manage_room: false,
    can_upload_assets: false,
    can_manage_snapshots: false,
    can_delete_room: false
}

function hasCapabilitiesChanged(previous: RoomCapabilities, next: RoomCapabilities) {
    return previous.can_view !== next.can_view ||
        previous.can_edit !== next.can_edit ||
        previous.can_manage_members !== next.can_manage_members ||
        previous.can_manage_room !== next.can_manage_room ||
        previous.can_upload_assets !== next.can_upload_assets ||
        previous.can_manage_snapshots !== next.can_manage_snapshots ||
        previous.can_delete_room !== next.can_delete_room
}

function requiresRealtimeReconnect(previous: RoomCapabilities, next: RoomCapabilities) {
    return previous.can_view !== next.can_view ||
        previous.can_edit !== next.can_edit
}

function getUserName(t: (key: string) => string) {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}')
    if (settings.lastName && settings.firstName) {
        const currentLocale = localStorage.getItem('locale') || 'zh-CN'
        return currentLocale === 'zh-CN'
            ? `${settings.lastName}${settings.firstName}`
            : `${settings.firstName} ${settings.lastName}`
    }

    return getUsername() || settings.userId || getUserId() || t('common.anonymous')
}

export function useCanvasRoom(options: UseCanvasRoomOptions) {
    const { roomId, t, toast, bubbleContainerRef, emitNavigate } = options
    const currentUserId = getUserId() || ''

    registerPlugins().catch(error => {
        console.error('[Plugins] Failed to register plugins:', error)
    })

    const roomName = ref('Loading Room...')
    const roomIcon = ref('#')
    const roomLoadError = ref('')
    const isRoomLoading = ref(true)
    const isRoomReady = ref(false)
    const isSyncing = ref(false)
    const isOffline = ref(false)
    const isMembersPanelOpen = ref(false)
    const isChatPanelOpen = ref(false)
    const roomRole = ref<string | null>(null)
    const roomCapabilities = ref<RoomCapabilities>({ ...EMPTY_CAPABILITIES })

    function notifyRoomMembersUpdated(event: RoomRealtimeEvent) {
        window.dispatchEvent(new CustomEvent('room-members-updated', {
            detail: event
        }))
    }

    function notifyRoomSettingsUpdated(event: RoomRealtimeEvent) {
        window.dispatchEvent(new CustomEvent('room-settings-updated', {
            detail: event
        }))
    }

    async function handleRoomEvent(event: RoomRealtimeEvent) {
        if (event.roomId !== roomId) {
            return
        }

        notifyRoomMembersUpdated(event)
        if (event.type === 'room_settings_updated') {
            notifyRoomSettingsUpdated(event)
        }

        if (event.type === 'room_members_updated' && event.targetUserId === currentUserId) {
            const stillAccessible = await syncRoomState(false)
            if (!stillAccessible || !roomCapabilities.value.can_view) {
                toast.error(localStorage.getItem('locale') === 'zh-CN' ? '你已不在此房间。正在返回房间列表。' : 'You were removed from this room. Returning to rooms.')
                yjs.disconnect()
                setTimeout(() => {
                    emitNavigate('rooms')
                }, 200)
                return
            }
            return
        }

        await refreshRoomPermissions()
    }

    const yjs = useYjs({
        roomId,
        onConnect: () => {
            isSyncing.value = false
            isOffline.value = false
            awareness.initialize()

            if (yjs.doc) {
                yjsEdges.initialize()
                yjsNodes.initialize()
                yjsChat.initialize()
            }
        },
        onDisconnect: () => {
            isOffline.value = true
            awareness.destroy()
        },
        onSync: synced => {
            isSyncing.value = !synced

            if (synced && yjs.doc) {
                yjsEdges.initialize()
                yjsNodes.initialize()
                yjsChat.initialize()
            }
        },
        onError: error => {
            console.error('[Canvas] Yjs error:', error)
            isOffline.value = true
        },
        onRoomEvent: event => {
            void handleRoomEvent(event)
        }
    })

    const awareness = useAwareness({
        provider: yjs.provider,
        userId: currentUserId || undefined,
        userName: getUserName(t)
    })

    provide('awareness', {
        otherUsers: awareness.otherUsers,
        updateTextCursor: awareness.updateTextCursor
    })

    const yjsEdges = useYjsEdges({
        getDoc: () => yjs.doc
    })

    const yjsNodes = useYjsNodes({
        getDoc: () => yjs.doc,
        additionalTrackedMaps: () => {
            const edgesMap = yjsEdges.edgesMap()
            return edgesMap ? [edgesMap] : []
        }
    })

    const yjsChat = useYjsChat({
        getDoc: () => yjs.doc,
        userId: getUserId() || 'current',
        userName: getUserName(t)
    })

    const remoteCursors = computed(() => awareness.otherUsers.value)
    const currentUsers = computed(() => {
        const users = [
            { id: getUserId() || 'current', name: getUserName(t), isMe: true }
        ]

        remoteCursors.value.forEach(cursor => {
            users.push({
                id: cursor.user?.id || String(cursor.clientId),
                name: cursor.user?.name || t('common.anonymous'),
                isMe: false
            })
        })

        return users
    })

    const chatMessages = computed(() => yjsChat.messages.value)
    const unreadCount = computed(() => yjsChat.unreadCount.value)

    async function syncRoomState(showLoading = false) {
        if (showLoading) {
            isRoomLoading.value = true
            roomLoadError.value = ''
            isRoomReady.value = false
        }

        const previousRole = roomRole.value
        const previousCapabilities = { ...roomCapabilities.value }
        const fallbackName = `Room ${roomId.slice(0, 8)}`

        try {
            const response = await apiService.getRoomById(roomId)

            if (!response.success) {
                if (showLoading) {
                    roomName.value = fallbackName
                    roomLoadError.value = response.message || t('canvas.loadError')
                }
                return false
            }

            const apiRoom = response.data?.room || response.data || {}
            const apiRoomName = apiRoom.name
            const apiRoomIcon = apiRoom.settings?.appearance?.icon
            const nextRole = response.data?.user_role || null
            const nextCapabilities = {
                ...EMPTY_CAPABILITIES,
                ...(response.data?.capabilities || {})
            }
            const permissionsChanged = previousRole !== nextRole || hasCapabilitiesChanged(previousCapabilities, nextCapabilities)
            const shouldReconnectRealtime = requiresRealtimeReconnect(previousCapabilities, nextCapabilities)

            roomName.value = typeof apiRoomName === 'string' && apiRoomName.trim()
                ? apiRoomName.trim()
                : fallbackName
            roomIcon.value = typeof apiRoomIcon === 'string' && apiRoomIcon.trim()
                ? apiRoomIcon.trim()
                : '#'
            roomRole.value = nextRole
            roomCapabilities.value = nextCapabilities

            if (showLoading) {
                isRoomReady.value = true
            }

            if (!showLoading && permissionsChanged && shouldReconnectRealtime && yjs.provider.value) {
                yjs.disconnect()
                await yjs.connect()
            }

            return true
        } catch (error) {
            console.error('[Canvas] Failed to load room:', error)
            if (showLoading) {
                roomName.value = fallbackName
                roomIcon.value = '#'
                roomLoadError.value = t('canvas.loadError')
                roomRole.value = null
                roomCapabilities.value = { ...EMPTY_CAPABILITIES }
            }
            return false
        } finally {
            if (showLoading) {
                isRoomLoading.value = false
            }
        }
    }

    async function loadRoomData() {
        return syncRoomState(true)
    }

    async function refreshRoomPermissions() {
        if (!isRoomReady.value) return
        await syncRoomState(false)
    }

    function handleExit() {
        emitNavigate('rooms')
    }

    function retryRoomLoad() {
        void initializeRoom()
    }

    async function initializeRoom() {
        yjs.disconnect()

        const loaded = await loadRoomData()
        if (!loaded) return

        recordRecentVisit(roomId)
        await yjs.connect()
    }

    function handleSendMessage(content: string) {
        if (content.trim()) {
            yjsChat.sendMessage(content)
        }
    }

    watch(() => yjsChat.messages.value.length, (newLength, oldLength) => {
        if (newLength > oldLength) {
            const latestMessage = yjsChat.messages.value[newLength - 1]
            bubbleContainerRef.value?.addBubble?.(latestMessage)
        }
    })

    watch(isChatPanelOpen, isOpen => {
        if (isOpen) {
            yjsChat.markAsRead()
        }
    })

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            void refreshRoomPermissions()
        }
    }

    onMounted(() => {
        void initializeRoom()
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onUnmounted(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        yjs.disconnect()
    })

    return {
        roomName,
        roomIcon,
        roomRole,
        roomCapabilities,
        roomLoadError,
        isRoomLoading,
        isRoomReady,
        isSyncing,
        isOffline,
        isMembersPanelOpen,
        isChatPanelOpen,
        currentUsers,
        remoteCursors,
        yjs,
        awareness,
        yjsNodes,
        yjsEdges,
        chatMessages,
        unreadCount,
        refreshRoomPermissions,
        handleExit,
        handleSendMessage,
        retryRoomLoad
    }
}

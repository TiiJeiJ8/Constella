import { computed, onMounted, onUnmounted, provide, ref, watch, type Ref } from 'vue'
import { useYjs } from '@/composables/useYjs'
import { useYjsNodes } from '@/composables/useYjsNodes'
import { useYjsEdges } from '@/composables/useYjsEdges'
import { useYjsChat } from '@/composables/useYjsChat'
import { useAwareness } from '@/composables/useAwareness'
import { apiService } from '@/services/api'
import { registerPlugins } from '@/plugins/register'
import { getAccessToken, getUserId, getUsername, recordRecentVisit } from '@/utils/storage'

interface UseCanvasRoomOptions {
    roomId: string
    t: (key: string) => string
    bubbleContainerRef: Ref<{ addBubble?: (message: unknown) => void } | null>
    emitNavigate: (view: string) => void
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
    const { roomId, t, bubbleContainerRef, emitNavigate } = options

    registerPlugins().catch(error => {
        console.error('[Plugins] Failed to register plugins:', error)
    })

    const roomName = ref('Loading Room...')
    const roomLoadError = ref('')
    const isRoomLoading = ref(true)
    const isRoomReady = ref(false)
    const isSyncing = ref(false)
    const isOffline = ref(false)
    const isMembersPanelOpen = ref(false)
    const isChatPanelOpen = ref(false)

    const yjs = useYjs({
        roomId,
        token: getAccessToken(),
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
        }
    })

    const awareness = useAwareness({
        provider: yjs.provider,
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
                id: String(cursor.clientId),
                name: cursor.user?.name || t('common.anonymous'),
                isMe: false
            })
        })

        return users
    })

    const chatMessages = computed(() => yjsChat.messages.value)
    const unreadCount = computed(() => yjsChat.unreadCount.value)

    async function loadRoomData() {
        isRoomLoading.value = true
        roomLoadError.value = ''
        isRoomReady.value = false

        const fallbackName = `Room ${roomId.slice(0, 8)}`

        try {
            const response = await apiService.getRoomById(roomId)

            if (!response.success) {
                roomName.value = fallbackName
                roomLoadError.value = response.message || t('canvas.loadError')
                return false
            }

            const apiRoomName = response.data?.room?.name || response.data?.name
            roomName.value = typeof apiRoomName === 'string' && apiRoomName.trim()
                ? apiRoomName.trim()
                : fallbackName

            isRoomReady.value = true
            return true
        } catch (error) {
            console.error('[Canvas] Failed to load room:', error)
            roomName.value = fallbackName
            roomLoadError.value = t('canvas.loadError')
            return false
        } finally {
            isRoomLoading.value = false
        }
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

    onMounted(() => {
        void initializeRoom()
    })

    onUnmounted(() => {
        yjs.disconnect()
    })

    return {
        roomName,
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
        handleExit,
        handleSendMessage,
        retryRoomLoad
    }
}

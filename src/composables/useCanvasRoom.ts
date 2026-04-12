import { computed, onMounted, provide, ref, watch, type Ref } from 'vue'
import { useYjs } from '@/composables/useYjs'
import { useYjsNodes } from '@/composables/useYjsNodes'
import { useYjsEdges } from '@/composables/useYjsEdges'
import { useYjsChat } from '@/composables/useYjsChat'
import { useAwareness } from '@/composables/useAwareness'
import { apiService } from '@/services/api'
import { registerPlugins } from '@/plugins/register'

interface UseCanvasRoomOptions {
    roomId: string
    t: (key: string) => string
    bubbleContainerRef: Ref<{ addBubble?: (message: unknown) => void } | null>
    emitNavigate: (view: string) => void
}

function getStoredToken() {
    return localStorage.getItem('accessToken') || ''
}

function getUserName(t: (key: string) => string) {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}')
    if (settings.lastName && settings.firstName) {
        const currentLocale = localStorage.getItem('locale') || 'zh-CN'
        return currentLocale === 'zh-CN'
            ? `${settings.lastName}${settings.firstName}`
            : `${settings.firstName} ${settings.lastName}`
    }

    return localStorage.getItem('username') || settings.userId || localStorage.getItem('user_id') || t('common.anonymous')
}

function recordVisit(roomId: string) {
    try {
        const visits = localStorage.getItem('recentVisits')
        let visitList = visits ? JSON.parse(visits) : []
        visitList = visitList.filter((visit: { roomId: string }) => visit.roomId !== roomId)
        visitList.unshift({
            roomId,
            lastVisit: Date.now()
        })
        localStorage.setItem('recentVisits', JSON.stringify(visitList.slice(0, 50)))
    } catch (error) {
        console.error('Failed to record visit:', error)
    }
}

export function useCanvasRoom(options: UseCanvasRoomOptions) {
    const { roomId, t, bubbleContainerRef, emitNavigate } = options

    registerPlugins().catch(error => {
        console.error('[Plugins] Failed to register plugins:', error)
    })

    const roomName = ref('Loading Room...')
    const isSyncing = ref(false)
    const isOffline = ref(false)
    const isMembersPanelOpen = ref(false)
    const isChatPanelOpen = ref(false)

    const yjs = useYjs({
        roomId,
        token: getStoredToken(),
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
        onSync: (synced) => {
            isSyncing.value = !synced

            if (synced && yjs.doc) {
                yjsEdges.initialize()
                yjsNodes.initialize()
                yjsChat.initialize()
            }
        },
        onError: (error) => {
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
        userId: localStorage.getItem('user_id') || 'current',
        userName: getUserName(t)
    })

    const remoteCursors = computed(() => awareness.otherUsers.value)
    const currentUsers = computed(() => {
        const users = [
            { id: localStorage.getItem('user_id') || 'current', name: getUserName(t), isMe: true }
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
        try {
            const fallbackName = `Room ${roomId.slice(0, 8)}`
            const response = await apiService.getRoomById(roomId)

            if (response.success) {
                const apiRoomName = response.data?.room?.name || response.data?.name
                if (typeof apiRoomName === 'string' && apiRoomName.trim()) {
                    roomName.value = apiRoomName.trim()
                    return
                }
            }

            roomName.value = fallbackName
        } catch (error) {
            console.error('[Canvas] Failed to load room:', error)
            roomName.value = `Room ${roomId.slice(0, 8)}`
        }
    }

    function handleExit() {
        emitNavigate('rooms')
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

    watch(isChatPanelOpen, (isOpen) => {
        if (isOpen) {
            yjsChat.markAsRead()
        }
    })

    onMounted(() => {
        loadRoomData()
        recordVisit(roomId)
        yjs.connect()
    })

    return {
        roomName,
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
        handleSendMessage
    }
}

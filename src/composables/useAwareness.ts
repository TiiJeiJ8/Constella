import { ref, onUnmounted, type Ref } from 'vue'
import type { WebsocketProvider } from 'y-websocket'

export interface TextCursor {
    nodeId: string
    position: number
    selectionEnd: number
}

export interface UserState {
    clientId: number
    user: {
        id?: string
        name: string
        color: string
        avatar?: string
    }
    cursor?: {
        x: number
        y: number
    }
    selection?: string[]
    textCursor?: TextCursor
}

interface UseAwarenessOptions {
    provider: Ref<WebsocketProvider | null>
    userId?: string
    userName?: string
    userColor?: string
}

const COLORS = [
    '#f56565', '#ed8936', '#ecc94b', '#48bb78',
    '#38b2ac', '#4299e1', '#667eea', '#9f7aea',
    '#ed64a6', '#fc8181', '#f6ad55', '#68d391'
]

export function useAwareness(options: UseAwarenessOptions) {
    const { provider, userId, userName, userColor } = options

    const otherUsers = ref<UserState[]>([])
    const localUser = ref({
        id: userId,
        name: userName || `User ${Math.floor(Math.random() * 1000)}`,
        color: userColor || COLORS[Math.floor(Math.random() * COLORS.length)]
    })

    let awareness: any = null

    function initialize() {
        if (!provider.value) {
            console.warn('[useAwareness] Provider not available')
            return
        }

        awareness = provider.value.awareness
        awareness.setLocalStateField('user', localUser.value)
        awareness.on('change', handleAwarenessChange)
        handleAwarenessChange()
    }

    function handleAwarenessChange() {
        if (!awareness) return

        const states = awareness.getStates() as Map<number, any>
        const localClientId = awareness.clientID
        const users: UserState[] = []

        states.forEach((state, clientId) => {
            if (clientId === localClientId) return
            if (!state.user) return

            users.push({
                clientId,
                user: state.user,
                cursor: state.cursor,
                selection: state.selection,
                textCursor: state.textCursor
            })
        })

        otherUsers.value = users
    }

    function updateCursor(x: number, y: number) {
        if (!awareness) return
        awareness.setLocalStateField('cursor', { x, y })
    }

    function clearCursor() {
        if (!awareness) return
        awareness.setLocalStateField('cursor', null)
    }

    function updateSelection(nodeIds: string[]) {
        if (!awareness) return
        awareness.setLocalStateField('selection', nodeIds)
    }

    function updateTextCursor(nodeId: string, position: number, selectionEnd: number) {
        if (!awareness) return

        if (!nodeId || position < 0) {
            awareness.setLocalStateField('textCursor', null)
        } else {
            awareness.setLocalStateField('textCursor', {
                nodeId,
                position,
                selectionEnd
            })
        }
    }

    function setUserName(name: string) {
        localUser.value.name = name
        if (awareness) {
            awareness.setLocalStateField('user', localUser.value)
        }
    }

    function destroy() {
        if (awareness) {
            awareness.off('change', handleAwarenessChange)
            awareness = null
        }
    }

    onUnmounted(() => {
        destroy()
    })

    return {
        otherUsers,
        localUser,
        initialize,
        updateCursor,
        clearCursor,
        updateSelection,
        updateTextCursor,
        setUserName,
        destroy
    }
}

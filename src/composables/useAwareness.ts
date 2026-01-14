import { ref, onUnmounted, type Ref } from 'vue'
import type { WebsocketProvider } from 'y-websocket'

/**
 * 文本编辑器光标信息
 */
export interface TextCursor {
    nodeId: string      // 编辑的节点ID
    position: number    // 光标位置
    selectionEnd: number // 选区结束位置
}

/**
 * 用户状态（Awareness）
 */
export interface UserState {
    clientId: number
    user: {
        name: string
        color: string
        avatar?: string
    }
    cursor?: {
        x: number
        y: number
    }
    selection?: string[]  // 选中的节点 IDs
    textCursor?: TextCursor  // 文本编辑器光标
}

interface UseAwarenessOptions {
    provider: Ref<WebsocketProvider | null>
    userName?: string
    userColor?: string
}

// 预设颜色列表
const COLORS = [
    '#f56565', '#ed8936', '#ecc94b', '#48bb78',
    '#38b2ac', '#4299e1', '#667eea', '#9f7aea',
    '#ed64a6', '#fc8181', '#f6ad55', '#68d391'
]

/**
 * Awareness Composable
 * 管理用户在线状态、光标位置、选中节点等信息
 */
export function useAwareness(options: UseAwarenessOptions) {
    const { provider, userName, userColor } = options

    // 其他用户状态
    const otherUsers = ref<UserState[]>([])

    // 本地用户信息
    const localUser = ref({
        name: userName || `用户 ${Math.floor(Math.random() * 1000)}`,
        color: userColor || COLORS[Math.floor(Math.random() * COLORS.length)]
    })

    // Awareness 实例
    let awareness: any = null

    /**
     * 初始化 Awareness
     */
    function initialize() {
        if (!provider.value) {
            console.warn('[useAwareness] Provider not available')
            return
        }

        awareness = provider.value.awareness

        // 设置本地用户状态
        awareness.setLocalStateField('user', localUser.value)

        // 监听 Awareness 变化
        awareness.on('change', handleAwarenessChange)

        // 初始同步
        handleAwarenessChange()

        console.log('[useAwareness] Initialized with user:', localUser.value.name)
    }

    /**
     * 处理 Awareness 变化
     */
    function handleAwarenessChange() {
        if (!awareness) return

        const states = awareness.getStates() as Map<number, any>
        const localClientId = awareness.clientID
        const users: UserState[] = []

        states.forEach((state, clientId) => {
            // 跳过本地用户
            if (clientId === localClientId) return

            if (state.user) {
                users.push({
                    clientId,
                    user: state.user,
                    cursor: state.cursor,
                    selection: state.selection,
                    textCursor: state.textCursor
                })
            }
        })

        otherUsers.value = users
    }

    /**
     * 更新本地光标位置
     */
    function updateCursor(x: number, y: number) {
        if (!awareness) return
        awareness.setLocalStateField('cursor', { x, y })
    }

    /**
     * 清除本地光标（鼠标离开画布时）
     */
    function clearCursor() {
        if (!awareness) return
        awareness.setLocalStateField('cursor', null)
    }

    /**
     * 更新选中节点
     */
    function updateSelection(nodeIds: string[]) {
        if (!awareness) return
        awareness.setLocalStateField('selection', nodeIds)
    }

    /**
     * 更新文本编辑器光标位置
     */
    function updateTextCursor(nodeId: string, position: number, selectionEnd: number) {
        if (!awareness) return
        if (!nodeId || position < 0) {
            // 清除文本光标
            awareness.setLocalStateField('textCursor', null)
        } else {
            awareness.setLocalStateField('textCursor', {
                nodeId,
                position,
                selectionEnd
            })
        }
    }

    /**
     * 更新用户名
     */
    function setUserName(name: string) {
        localUser.value.name = name
        if (awareness) {
            awareness.setLocalStateField('user', localUser.value)
        }
    }

    /**
     * 销毁
     */
    function destroy() {
        if (awareness) {
            awareness.off('change', handleAwarenessChange)
            awareness = null
        }
    }

    // 组件卸载时清理
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

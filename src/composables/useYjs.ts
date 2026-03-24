import { ref, onUnmounted, type Ref } from 'vue'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { apiService } from '../services/api'

interface UseYjsOptions {
    roomId: string
    token?: string
    onConnect?: () => void
    onDisconnect?: () => void
    onSync?: (isSynced: boolean) => void
    onError?: (error: Error) => void
}

interface UseYjsReturn {
    doc: Y.Doc
    provider: Ref<WebsocketProvider | null>
    isConnected: Ref<boolean>
    isSynced: Ref<boolean>
    connect: () => Promise<void>
    disconnect: () => void
    getMap: (key: string) => Y.Map<any>
    getArray: (key: string) => Y.Array<any>
}

/**
 * Yjs 实时协作 Composable
 * 提供 WebSocket 连接、文档同步、Awareness 等功能
 */
export function useYjs(options: UseYjsOptions): UseYjsReturn {
    const { roomId, token, onConnect, onDisconnect, onSync, onError } = options

    // 创建 Yjs 文档
    const doc = new Y.Doc()

    // 状态
    const provider = ref<WebsocketProvider | null>(null)
    const isConnected = ref(false)
    const isSynced = ref(false)

    // 获取 WebSocket URL
    const getWebSocketUrl = () => {
        // 优先从 apiService 获取服务器地址（用户在首页输入的地址）
        // 这确保了跨设备连接时使用正确的服务器 IP
        const baseUrl = apiService.getBaseUrl()

        if (baseUrl) {
            // 从 HTTP URL 转换为 WebSocket URL
            // 例如: http://192.168.1.100:3000 -> ws://192.168.1.100:3000/ws
            try {
                const url = new URL(baseUrl)
                const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
                return `${wsProtocol}//${url.host}/ws`
            } catch (e) {
                console.warn('[useYjs] Invalid baseUrl, falling back to window.location')
            }
        }

        // 回退：使用环境变量或 window.location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        let host = import.meta.env.VITE_WS_URL

        if (!host) {
            // 前端和后端端口不同时的处理
            // 开发环境：前端 5173，后端 3000
            const currentHost = window.location.hostname
            const backendPort = import.meta.env.DEV ? '3000' : window.location.port
            host = `${currentHost}:${backendPort}`
        }

        return `${protocol}//${host}/ws`
    }

    // 连接到 Yjs WebSocket 服务器
    const connect = async () => {
        if (provider.value) {
            console.warn('[useYjs] Provider already connected')
            return
        }

        try {
            const wsUrl = getWebSocketUrl()
            console.log('[useYjs] Connecting to:', wsUrl, 'Room:', roomId)

            // 如果没有传入短期 relay token，则向后端请求一个
            let relayToken = token
            if (!relayToken) {
                try {
                    const res = await apiService.getRoomRelayToken(roomId)
                    if (res.success && res.data) {
                        // 支持不同后端返回结构
                        relayToken = (res.data as any).relay_token || (res.data as any).token || (res as any).data?.relay_token
                    } else {
                        throw new Error(res.message || 'Failed to obtain relay token')
                    }
                } catch (err) {
                    console.error('[useYjs] Failed to get relay token:', err)
                    if (onError && err instanceof Error) onError(err)
                    return
                }
            }

            // 创建 WebSocket Provider，并通过 params 把 token 放入查询字符串
            provider.value = new WebsocketProvider(wsUrl, roomId, doc, {
                connect: true,
                params: relayToken ? { token: relayToken } : {}
            })

            // 监听连接状态
            provider.value.on('status', ({ status }: { status: string }) => {
                console.log('[useYjs] 📡 Status changed:', status)
                isConnected.value = status === 'connected'

                if (status === 'connected') {
                    console.log('[useYjs] ✅ WebSocket 已连接')

                    if (onConnect) {
                        onConnect()
                    }
                } else if (status === 'disconnected' && onDisconnect) {
                    console.log('[useYjs] ❌ 已断开连接')
                    onDisconnect()
                }
            })

            // 监听同步状态
            provider.value.on('sync', (synced: boolean) => {
                console.log('[useYjs] 🔄 Sync status:', synced)

                if (synced) {
                    // 诊断：检查 Y.Doc 是否包含数据
                    const nodesMap = doc.getMap('nodes')
                    const edgesMap = doc.getMap('edges')
                    const chatArray = doc.getArray('_chat_messages')

                    console.log('[useYjs] 📊 Y.Doc 内容 (同步完成):')
                    console.log('   - nodes size:', nodesMap.size)
                    console.log('   - edges size:', edgesMap.size)
                    console.log('   - chat messages length:', chatArray.length)

                    // 展示每个节点的详细信息
                    if (nodesMap.size > 0) {
                        console.log('[useYjs] ✅ 恢复成功，节点详情：')
                        const nodeIds: string[] = []
                        nodesMap.forEach((node, key) => {
                            nodeIds.push(key)
                            const x = node instanceof Y.Map ? node.get('x') : (node as any).x
                            const y = node instanceof Y.Map ? node.get('y') : (node as any).y
                            console.log(`   [${key}] 位置: (${x}, ${y})`)
                        })
                    } else {
                        console.log('[useYjs] 📭 Y.Doc 同步完成，但未找到任何节点数据（可能是新房间）')
                    }
                } else {
                    console.log('[useYjs] ⏳ 同步中...')
                }

                isSynced.value = synced
                if (onSync) {
                    onSync(synced)
                }
            })

            // 监听连接错误
            provider.value.on('connection-error', (event: Event) => {
                console.error('[useYjs] Connection error:', event)
                if (onError) {
                    const error = new Error('WebSocket connection error')
                    onError(error)
                }
            })

            // 监听连接关闭
            provider.value.on('connection-close', (event: CloseEvent | null) => {
                if (event) {
                    console.log('[useYjs] Connection closed:', event.code, event.reason)
                } else {
                    console.log('[useYjs] Connection closed')
                }
                isConnected.value = false
            })

        } catch (error) {
            console.error('[useYjs] Failed to connect:', error)
            if (onError && error instanceof Error) {
                onError(error)
            }
        }
    }

    // 断开连接
    const disconnect = () => {
        if (provider.value) {
            console.log('[useYjs] Disconnecting...')
            provider.value.destroy()
            provider.value = null
            isConnected.value = false
            isSynced.value = false
        }
    }

    // 获取 Y.Map
    const getMap = (key: string): Y.Map<any> => {
        return doc.getMap(key)
    }

    // 获取 Y.Array
    const getArray = (key: string): Y.Array<any> => {
        return doc.getArray(key)
    }

    // 组件卸载时自动断开连接
    onUnmounted(() => {
        disconnect()
    })

    return {
        doc,
        provider,
        isConnected,
        isSynced,
        connect,
        disconnect,
        getMap,
        getArray
    }
}

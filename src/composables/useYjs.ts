import { ref, onUnmounted, type Ref } from 'vue'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import * as decoding from 'lib0/decoding'
import { apiService } from '../services/api'

const messageRoomEvent = 4

export interface RoomRealtimeEvent {
    type: 'room_permissions_updated' | 'room_members_updated' | 'room_ownership_transferred' | 'room_settings_updated'
    roomId: string
    targetUserId: string
    memberId: string
    role?: string
    actorUserId: string
}

interface UseYjsOptions {
    roomId: string
    token?: string
    onConnect?: () => void
    onDisconnect?: () => void
    onSync?: (isSynced: boolean) => void
    onError?: (error: Error) => void
    onRoomEvent?: (event: RoomRealtimeEvent) => void
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

export function useYjs(options: UseYjsOptions): UseYjsReturn {
    const { roomId, token, onConnect, onDisconnect, onSync, onError, onRoomEvent } = options

    const doc = new Y.Doc()
    const provider = ref<WebsocketProvider | null>(null)
    const isConnected = ref(false)
    const isSynced = ref(false)

    const getWebSocketUrl = () => {
        const baseUrl = apiService.getBaseUrl()

        if (baseUrl) {
            try {
                const url = new URL(baseUrl)
                const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
                return `${wsProtocol}//${url.host}/ws`
            } catch {
                console.warn('[useYjs] Invalid baseUrl, falling back to window.location')
            }
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        let host = import.meta.env.VITE_WS_URL

        if (!host) {
            const currentHost = window.location.hostname
            const backendPort = import.meta.env.DEV ? '3000' : window.location.port
            host = `${currentHost}:${backendPort}`
        }

        return `${protocol}//${host}/ws`
    }

    const connect = async () => {
        if (provider.value) {
            console.warn('[useYjs] Provider already connected')
            return
        }

        try {
            const wsUrl = getWebSocketUrl()
            let relayToken = token

            if (!relayToken) {
                const res = await apiService.getRoomRelayToken(roomId)
                if (res.success && res.data) {
                    relayToken = (res.data as any).relay_token || (res.data as any).token || (res as any).data?.relay_token
                } else {
                    throw new Error(res.message || 'Failed to obtain relay token')
                }
            }

            const nextProvider = new WebsocketProvider(wsUrl, roomId, doc, {
                connect: true,
                params: relayToken ? { token: relayToken } : {}
            })

            nextProvider.messageHandlers[messageRoomEvent] = (
                _encoder: unknown,
                decoder: decoding.Decoder
            ) => {
                try {
                    const payload = decoding.readVarString(decoder)
                    const event = JSON.parse(payload) as RoomRealtimeEvent
                    onRoomEvent?.(event)
                } catch (error) {
                    console.error('[useYjs] Failed to parse room event:', error)
                }
            }

            nextProvider.on('status', ({ status }: { status: string }) => {
                isConnected.value = status === 'connected'

                if (status === 'connected') {
                    onConnect?.()
                } else if (status === 'disconnected') {
                    onDisconnect?.()
                }
            })

            nextProvider.on('sync', (synced: boolean) => {
                isSynced.value = synced
                onSync?.(synced)
            })

            nextProvider.on('connection-error', (event: Event) => {
                console.error('[useYjs] Connection error:', event)
                onError?.(new Error('WebSocket connection error'))
            })

            nextProvider.on('connection-close', (_event: CloseEvent | null) => {
                isConnected.value = false
            })

            provider.value = nextProvider
        } catch (error) {
            console.error('[useYjs] Failed to connect:', error)
            if (error instanceof Error) {
                onError?.(error)
            }
        }
    }

    const disconnect = () => {
        if (provider.value) {
            provider.value.destroy()
            provider.value = null
            isConnected.value = false
            isSynced.value = false
        }
    }

    const getMap = (key: string): Y.Map<any> => doc.getMap(key)
    const getArray = (key: string): Y.Array<any> => doc.getArray(key)

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

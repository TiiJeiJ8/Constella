import { ref, onMounted, onUnmounted } from 'vue'
import * as Y from 'yjs'

export interface ChatMessage {
    id: string
    userId: string
    userName: string
    userColor: string
    content: string
    timestamp: number
    isOwn?: boolean
}

interface UseYjsChatOptions {
    getDoc: () => Y.Doc | null
    userName: string
    userId: string
}

export function useYjsChat(options: UseYjsChatOptions) {
    const { getDoc, userName, userId } = options
    
    const messages = ref<ChatMessage[]>([])
    const unreadCount = ref(0)
    let messagesArray: Y.Array<any> | null = null
    let doc: Y.Doc | null = null
    let observer: ((event: any) => void) | null = null
    
    function initialize() {
        doc = getDoc()
        if (!doc) {
            console.warn('[useYjsChat] Document not available')
            return
        }
        
        messagesArray = doc.getArray('_chat_messages')
        
        observer = () => {
            syncFromYjs()
        }
        messagesArray.observe(observer)
        
        syncFromYjs()
        console.log('[useYjsChat] Initialized')
    }
    
    function syncFromYjs() {
        if (!messagesArray) return
        
        messages.value = messagesArray.toArray().map(item => {
            const data = item.toJSON()
            return {
                ...data,
                isOwn: data.userId === userId
            }
        })
        
        // 计算未读消息数（不是自己的消息）
        const lastReadTimestamp = Number(localStorage.getItem('lastChatRead') || 0)
        unreadCount.value = messages.value.filter(
            m => !m.isOwn && m.timestamp > lastReadTimestamp
        ).length
    }
    
    function sendMessage(content: string) {
        if (!messagesArray || !content.trim()) return
        
        const message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId,
            userName,
            userColor: getRandomColor(userId),
            content: content.trim(),
            timestamp: Date.now()
        }
        
        const ymap = new Y.Map()
        Object.entries(message).forEach(([key, value]) => {
            ymap.set(key, value)
        })
        messagesArray.push([ymap])
        
        console.log('[useYjsChat] Message sent:', message.content)
    }
    
    function deleteMessage(messageId: string) {
        if (!messagesArray) return
        const index = messages.value.findIndex(m => m.id === messageId)
        if (index !== -1) {
            messagesArray.delete(index, 1)
        }
    }
    
    function markAsRead() {
        localStorage.setItem('lastChatRead', String(Date.now()))
        unreadCount.value = 0
    }
    
    function destroy() {
        if (messagesArray && observer) {
            messagesArray.unobserve(observer)
        }
    }
    
    onMounted(initialize)
    onUnmounted(destroy)
    
    return {
        messages,
        unreadCount,
        sendMessage,
        deleteMessage,
        markAsRead,
        initialize,
        destroy
    }
}

// 根据用户ID生成稳定的颜色
function getRandomColor(userId: string): string {
    const colors = [
        '#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
        '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
    ]
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]!
}

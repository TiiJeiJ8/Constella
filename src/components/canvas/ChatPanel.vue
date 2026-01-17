<template>
    <Transition name="panel-slide">
        <div v-if="modelValue" class="chat-panel">
            <!-- 头部 -->
            <div class="chat-panel-header">
                <span class="title">{{ t('canvas.chat.title') }}</span>
                <button class="close-btn" @click="$emit('update:modelValue', false)">✕</button>
            </div>
            
            <!-- 消息列表 -->
            <div class="chat-messages" ref="messagesContainer">
                <div v-if="messages.length === 0" class="empty-state">
                    {{ t('canvas.chat.noMessages') }}
                </div>
                <div 
                    v-for="msg in messages" 
                    :key="msg.id"
                    class="message"
                    :class="{ 'own': msg.isOwn }"
                >
                    <div class="message-avatar" :style="{ background: msg.userColor }">
                        {{ msg.userName.charAt(0).toUpperCase() }}
                    </div>
                    <div class="message-body">
                        <div class="message-meta">
                            <span class="message-user">{{ msg.userName }}</span>
                            <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
                        </div>
                        <div class="message-text">{{ msg.content }}</div>
                    </div>
                </div>
            </div>
            
            <!-- 底部输入 -->
            <div class="chat-panel-footer">
                <input 
                    v-model="panelMessage"
                    :placeholder="t('canvas.chat.inputPlaceholder')"
                    @keydown.enter.prevent="handlePanelSend"
                    class="panel-input"
                />
                <button class="panel-send-btn" @click="handlePanelSend">
                    {{ t('canvas.chat.send') }}
                </button>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

interface ChatMessage {
    id: string | number
    userId?: string
    userName: string
    userColor?: string
    content: string
    timestamp: number
    isOwn?: boolean
}

const { t } = useI18n()

interface Props {
    modelValue: boolean
    messages: ChatMessage[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'send', message: string): void
}>()

const panelMessage = ref('')
const messagesContainer = ref<HTMLElement>()

// 自动滚动到最新消息
watch(() => props.messages.length, () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
    })
})

// 打开时滚动到底部
watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
        nextTick(() => {
            if (messagesContainer.value) {
                messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
            }
        })
    }
})

function handlePanelSend() {
    if (panelMessage.value.trim()) {
        emit('send', panelMessage.value.trim())
        panelMessage.value = ''
    }
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp)
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
}
</script>

<style scoped>
.chat-panel {
    position: fixed;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%);
    width: 320px;
    max-height: 500px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    z-index: 999;
    overflow: hidden;
}

.chat-panel-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
}

.close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 18px;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
}

.close-btn:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.empty-state {
    margin: auto;
    text-align: center;
    color: var(--text-secondary);
    font-size: 13px;
}

.message {
    display: flex;
    gap: 8px;
    padding: 8px;
    border-radius: 8px;
    background: var(--bg-secondary);
}

.message.own {
    flex-direction: row-reverse;
    background: rgba(96, 165, 250, 0.1);
}

.message-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
}

.message-body {
    flex: 1;
    min-width: 0;
}

.message-meta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 2px;
}

.message-user {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
}

.message-time {
    font-size: 11px;
    color: var(--text-secondary);
}

.message-text {
    font-size: 13px;
    color: var(--text-primary);
    word-wrap: break-word;
    line-height: 1.4;
}

.chat-panel-footer {
    padding: 12px;
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}

.panel-input {
    flex: 1;
    height: 32px;
    padding: 0 10px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 12px;
}

.panel-input:focus {
    outline: none;
    border-color: rgba(96, 165, 250, 0.6);
}

.panel-send-btn {
    width: 60px;
    height: 32px;
    border-radius: 4px;
    background: rgba(96, 165, 250, 0.9);
    color: white;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.2s;
}

.panel-send-btn:hover {
    background: rgba(96, 165, 250, 1);
}

.panel-send-btn:active {
    transform: scale(0.95);
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar {
    width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
    background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
}

html[data-theme='light'] .chat-messages::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
}

html[data-theme='light'] .chat-messages::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.25);
}

/* 动画 */
.panel-slide-enter-active,
.panel-slide-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-slide-enter-from,
.panel-slide-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(20px) scale(0.95);
}
</style>

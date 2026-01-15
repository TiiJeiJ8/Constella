<template>
    <Transition name="bubble" @after-leave="$emit('remove')">
        <div v-if="visible" class="chat-bubble" :style="{ bottom: `${offset}px` }">
            <div class="bubble-avatar" :style="{ background: message.userColor }">
                {{ message.userName.charAt(0).toUpperCase() }}
            </div>
            <div class="bubble-content">
                <div class="bubble-header">
                    <span class="bubble-user">{{ message.userName }}</span>
                    <button class="bubble-close" @click="close">✕</button>
                </div>
                <div class="bubble-text">{{ message.content }}</div>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ChatMessage } from '@/composables/useYjsChat'

interface Props {
    message: ChatMessage
    offset: number
}

defineProps<Props>()

const emit = defineEmits<{
    (e: 'remove'): void
}>()

const visible = ref(false)

onMounted(() => {
    // 延迟显示实现滑入效果
    requestAnimationFrame(() => {
        visible.value = true
    })
    
    // 3秒后自动关闭
    setTimeout(() => {
        close()
    }, 3000)
})

function close() {
    visible.value = false
}
</script>

<style scoped>
.chat-bubble {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    width: 280px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    padding: 10px;
    display: flex;
    gap: 8px;
    z-index: 998;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bubble-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
}

.bubble-content {
    flex: 1;
    min-width: 0;
}

.bubble-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}

.bubble-user {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
}

.bubble-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 16px;
    padding: 0;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    transition: all 0.2s;
}

.bubble-close:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

.bubble-text {
    font-size: 13px;
    color: var(--text-primary);
    word-wrap: break-word;
    line-height: 1.4;
    max-height: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
}

/* 动画 */
.bubble-enter-active,
.bubble-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bubble-enter-from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
}

.bubble-leave-to {
    opacity: 0;
    transform: translateX(-50%) scale(0.95);
}
</style>

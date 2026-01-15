<template>
    <div class="chat-bubble-container">
        <ChatBubble 
            v-for="bubble in bubbles"
            :key="bubble.id"
            :message="bubble"
            :offset="calculateOffset(bubble.id)"
            @remove="removeBubble(bubble.id)"
        />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ChatBubble from './ChatBubble.vue'
import type { ChatMessage } from '@/composables/useYjsChat'

const bubbles = ref<ChatMessage[]>([])

// 气泡基础偏移（从底部）
const BUBBLE_BASE_OFFSET = 70
const BUBBLE_HEIGHT = 90 // 估算高度包含间隔

function addBubble(message: ChatMessage) {
    bubbles.value.push(message)
    
    // 限制最多显示5个气泡
    if (bubbles.value.length > 5) {
        bubbles.value.shift()
    }
}

function removeBubble(id: string) {
    const index = bubbles.value.findIndex(b => b.id === id)
    if (index !== -1) {
        bubbles.value.splice(index, 1)
    }
}

function calculateOffset(id: string): number {
    const index = bubbles.value.findIndex(b => b.id === id)
    return BUBBLE_BASE_OFFSET + (index * BUBBLE_HEIGHT)
}

defineExpose({
    addBubble
})
</script>

<style scoped>
.chat-bubble-container {
    position: fixed;
    pointer-events: none;
}

.chat-bubble-container > * {
    pointer-events: auto;
}
</style>

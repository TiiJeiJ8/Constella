<template>
    <div class="chat-input-bar">
        <input 
            v-model="message"
            :placeholder="placeholder"
            @keydown.enter.prevent="handleSend"
            class="chat-input"
        />
        <button class="chat-send-btn" @click="handleSend" :title="t('canvas.chat.send')">
            <span>→</span>
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
    placeholder: string
}>()

const emit = defineEmits<{
    (e: 'send', message: string): void
}>()

const message = ref('')

function handleSend() {
    if (message.value.trim()) {
        emit('send', message.value.trim())
        message.value = ''
    }
}
</script>

<style scoped>
.chat-input-bar {
    display: flex;
    gap: 6px;
    align-items: center;
}

.chat-input {
    width: 160px;
    height: 28px;
    padding: 0 10px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 12px;
    transition: all 0.2s;
}

.chat-input:focus {
    outline: none;
    border-color: rgba(96, 165, 250, 0.6);
    background: var(--bg-primary);
}

.chat-input::placeholder {
    color: var(--text-secondary);
}

.chat-send-btn {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    background: rgba(96, 165, 250, 0.9);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    font-weight: 600;
    flex-shrink: 0;
}

.chat-send-btn:hover {
    background: rgba(96, 165, 250, 1);
    transform: scale(1.05);
}

.chat-send-btn:active {
    transform: scale(0.95);
}
</style>

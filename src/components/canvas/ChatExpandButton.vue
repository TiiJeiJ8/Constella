<template>
    <button class="chat-expand-btn" @click="$emit('click')" :title="t('canvas.chat.expand')">
        <span class="icon">^</span>
        <span v-if="unreadCount > 0" class="badge">{{ unreadCount }}</span>
    </button>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
    unreadCount: number
}>()

defineEmits<{
    (e: 'click'): void
}>()
</script>

<style scoped>
.chat-expand-btn {
    position: relative;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    background: transparent;
    border: 1px solid rgba(96, 165, 250, 0.4);
    color: rgba(96, 165, 250, 0.8);
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.chat-expand-btn:hover {
    background: rgba(96, 165, 250, 0.1);
    border-color: rgba(96, 165, 250, 0.6);
    color: rgba(96, 165, 250, 1);
}

.badge {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    background: #ef4444;
    color: white;
    font-size: 10px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>

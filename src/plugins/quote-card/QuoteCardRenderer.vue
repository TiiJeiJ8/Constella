<template>
    <div class="quote-card" :class="{ compact: displayMode === 'card' }">
        <div class="quote-text">“{{ quoteText }}”</div>
        <div class="quote-author">- {{ author }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RendererProps } from '../index'

const props = defineProps<RendererProps>()

const quoteText = computed(() => String(props.content?.data || '').trim() || 'Write a short quote here.')
const author = computed(() => String(props.content?.metadata?.author || '').trim() || 'Anonymous')
</script>

<style scoped>
.quote-card {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 18px 20px;
    box-sizing: border-box;
    background: linear-gradient(160deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.03));
    color: #ffffff;
}

.quote-card.compact {
    padding: 10px 12px;
}

.quote-text {
    font-size: 18px;
    line-height: 1.6;
    font-weight: 600;
    white-space: pre-wrap;
    word-break: break-word;
}

.quote-card.compact .quote-text {
    font-size: 13px;
}

.quote-author {
    margin-top: 12px;
    font-size: 13px;
    opacity: 0.82;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.quote-card.compact .quote-author {
    font-size: 11px;
}
</style>

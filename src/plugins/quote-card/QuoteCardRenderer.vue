<template>
    <div class="quote-card" :class="{ compact: displayMode === 'card' }">
        <div class="quote-text">“{{ quoteText }}”</div>
        <div class="quote-author">- {{ author }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RendererProps } from '../index'

const props = defineProps<RendererProps>()
const { t } = useI18n()

const quoteText = computed(() => String(props.content?.data || '').trim() || t('plugins.quoteCard.renderer.emptyQuote'))
const author = computed(() => String(props.content?.metadata?.author || '').trim() || t('plugins.quoteCard.renderer.anonymous'))
</script>

<style scoped>
.quote-card {
    --quote-card-surface: linear-gradient(160deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.04));
    --quote-card-text: rgba(255, 255, 255, 0.96);
    --quote-card-muted: rgba(255, 255, 255, 0.72);
    --quote-card-accent: rgba(255, 255, 255, 0.46);
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 18px 20px;
    box-sizing: border-box;
    background: var(--quote-card-surface);
    color: var(--quote-card-text);
}

.quote-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 14px;
    bottom: 14px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: var(--quote-card-accent);
}

.quote-card.compact {
    padding: 10px 12px;
}

.quote-card.compact::before {
    top: 10px;
    bottom: 10px;
}

.quote-text {
    position: relative;
    font-size: 18px;
    line-height: 1.6;
    font-weight: 600;
    color: var(--quote-card-text);
    white-space: pre-wrap;
    word-break: break-word;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}

.quote-card.compact .quote-text {
    font-size: 13px;
}

.quote-author {
    position: relative;
    margin-top: 12px;
    font-size: 13px;
    color: var(--quote-card-muted);
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.quote-card.compact .quote-author {
    font-size: 11px;
}

html[data-theme='dark'] .quote-card {
    --quote-card-surface: transparent;
    --quote-card-text: #e4e7ed;
    --quote-card-muted: #c0c4cc;
    --quote-card-accent: #409eff;
}
</style>

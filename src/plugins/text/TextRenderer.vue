<template>
    <div class="text-renderer" :class="displayMode">
        <div v-if="displayMode === 'card'" class="text-card" :style="cardStyle">
            <div class="card-title" :style="textStyle">{{ cardTitle }}</div>
            <div v-if="hasMoreContent" class="card-preview" :style="previewStyle">{{ cardPreview }}</div>
        </div>
        <div v-else class="text-full" :style="fullStyle">{{ fullText }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NodeContent, DisplayMode } from '../index'

const { t } = useI18n()

const props = defineProps<{
    content: NodeContent
    width: number
    height: number
    displayMode?: DisplayMode
    scale?: number
}>()

const displayMode = computed(() => props.displayMode || 'full')
const normalizedText = computed(() => props.content.data || '')

// 基于节点尺寸计算字体大小
const baseFontSize = computed(() => {
    const minDim = Math.min(props.width, props.height)
    // 字体大小为最小维度的一定比例，限制在合理范围内
    return Math.max(10, Math.min(24, minDim * 0.12))
})

const cardStyle = computed(() => ({
    padding: `${Math.max(8, props.height * 0.08)}px`
}))

const textStyle = computed(() => ({
    fontSize: `${baseFontSize.value}px`
}))

const previewStyle = computed(() => ({
    fontSize: `${baseFontSize.value * 0.75}px`
}))

const fullStyle = computed(() => ({
    padding: `${Math.max(8, props.height * 0.08)}px`,
    fontSize: `${Math.max(11, Math.min(18, Math.min(props.width, props.height) * 0.07))}px`
}))

// 提取标题（第一行）
const cardTitle = computed(() => {
    const text = props.content.data || ''
    const lines = text.split('\n').filter(l => l.trim())
    return lines[0] || t('canvas.node.emptyContent')
})

// 是否有更多内容
const hasMoreContent = computed(() => {
    const text = props.content.data || ''
    const lines = text.split('\n').filter(l => l.trim())
    return lines.length > 1
})

// 提取预览内容
const cardPreview = computed(() => {
    const text = props.content.data || ''
    const lines = text.split('\n').filter(l => l.trim()).slice(1)
    const preview = lines.join(' ')
    if (preview.length > 60) {
        return preview.substring(0, 60) + '...'
    }
    return preview
})

const fullText = computed(() => {
    if (!normalizedText.value.trim()) {
        return t('canvas.node.emptyContent')
    }
    return normalizedText.value
})
</script>

<style scoped>
.text-renderer {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
}

.text-card {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    overflow: hidden;
    box-sizing: border-box;
    gap: 4px;
}

.card-title {
    font-weight: 600;
    color: white;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
}

.card-preview {
    color: rgba(255, 255, 255, 0.5);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
}

.text-full {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
    text-align: left;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    color: white;
}
</style>

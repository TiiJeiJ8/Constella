<template>
    <div class="markdown-card" :style="cardStyle">
        <div class="card-title" :style="textStyle">{{ cardTitle }}</div>
        <div v-if="hasMoreContent" class="card-preview" :style="previewStyle">{{ cardPreview }}</div>
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

// 基于节点尺寸计算字体大小
const baseFontSize = computed(() => {
    const minDim = Math.min(props.width, props.height)
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

// 提取标题（第一个 # 开头的行，或第一行）
const cardTitle = computed(() => {
    const text = props.content.data || ''
    const lines = text.split('\n').filter(l => l.trim())
    
    // 找第一个标题
    for (const line of lines) {
        const match = line.match(/^#+\s*(.+)/)
        if (match) return match[1]
    }
    
    // 没有标题就用第一行，去掉 markdown 标记
    const firstLine = lines[0] || ''
    return firstLine.replace(/^#+\s*/, '').replace(/[*_`]/g, '') || t('canvas.node.emptyContent')
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
    const lines = text.split('\n').filter(l => l.trim())
    
    // 跳过标题行
    let startIndex = 0
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line && line.match(/^#+\s*/)) {
            startIndex = i + 1
            break
        }
    }
    if (startIndex === 0 && lines.length > 1) startIndex = 1
    
    // 合并内容，去除 Markdown 标记和公式
    const preview = lines.slice(startIndex)
        .join(' ')
        .replace(/\$\$[^$]+\$\$/g, '[公式]')
        .replace(/\$[^$\n]+\$/g, '[公式]')
        .replace(/[#*_`>\[\]()]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    
    if (preview.length > 60) {
        return preview.substring(0, 60) + '...'
    }
    return preview
})
</script>

<style scoped>
.markdown-card {
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
</style>

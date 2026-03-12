<template>
    <div class="markdown-renderer" :class="displayMode">
        <div v-if="displayMode === 'card'" class="markdown-card" :style="cardStyle">
            <div class="card-title" :style="textStyle">{{ cardTitle }}</div>
            <div v-if="hasMoreContent" class="card-preview" :style="previewStyle">{{ cardPreview }}</div>
        </div>
        <div v-else-if="usePlainTextLod" class="markdown-full markdown-full-plain" :style="fullStyle">{{ plainTextPreview }}</div>
        <div v-else class="markdown-full" :style="fullStyle" v-html="renderedHtml" />
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import type { NodeContent, DisplayMode } from '../index'

const { t } = useI18n()

const props = defineProps<{
    content: NodeContent
    width: number
    height: number
    displayMode?: DisplayMode
    scale?: number
    lodScaleThreshold?: number
}>()

const DEFAULT_MARKDOWN_LOD_SCALE_THRESHOLD = 0.6

let markdownParser: MarkdownIt | null = null

function getMarkdownParser() {
    if (markdownParser) return markdownParser

    const markdownUtils = new MarkdownIt().utils
    markdownParser = new MarkdownIt({
        html: false,
        breaks: true,
        linkify: true,
        typographer: true,
        highlight: function (str: string, lang: string): string {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return `<pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
                } catch (__) {}
            }

            return `<pre class="hljs"><code>${markdownUtils.escapeHtml(str)}</code></pre>`
        }
    })

    return markdownParser
}

const normalizedText = computed(() => props.content.data || '')
const displayMode = computed(() => props.displayMode || 'full')
const renderScale = computed(() => {
    const n = Number(props.scale)
    if (!Number.isFinite(n)) return 1
    return Math.max(0.01, n)
})

const lodScaleThreshold = computed(() => {
    const n = Number(props.lodScaleThreshold)
    if (!Number.isFinite(n)) return DEFAULT_MARKDOWN_LOD_SCALE_THRESHOLD
    return Math.max(0.1, Math.min(3, n))
})

const usePlainTextLod = computed(() => {
    return displayMode.value === 'full' && renderScale.value <= lodScaleThreshold.value
})

const fontSizeFromMetadata = computed(() => {
    const raw = (props.content?.metadata as any)?.fontSize
    const n = Number(raw)
    if (!Number.isFinite(n)) return null
    return Math.max(10, Math.min(48, n))
})

const baseFontSize = computed(() => {
    return fontSizeFromMetadata.value ?? 14
})
const bodyFontSize = computed(() => fontSizeFromMetadata.value ?? 14)
const codeFontSize = computed(() => Math.max(10, Math.min(20, bodyFontSize.value * 0.9)))
const panelPadding = computed(() => Math.max(6, Math.min(14, Math.round(bodyFontSize.value * 0.6))))

const cardStyle = computed(() => ({
    padding: `${panelPadding.value}px`
}))

const textStyle = computed(() => ({
    fontSize: `${baseFontSize.value}px`
}))

const previewStyle = computed(() => ({
    fontSize: `${baseFontSize.value * 0.75}px`
}))

const fullStyle = computed(() => ({
    padding: `${panelPadding.value}px`,
    fontSize: `${bodyFontSize.value}px`,
    '--code-font-size': `${codeFontSize.value}px`
}))

function stripMarkdownSyntax(line: string): string {
    return line
        .replace(/!\[[^\]]*\]\([^)]+\)/g, '[image]')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^#+\s*/, '')
        .replace(/^>\s*/, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[>*_~`]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

const meaningfulLines = computed(() => {
    return normalizedText.value
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
})

const previewSegments = computed(() => {
    const segments: string[] = []
    let inCodeBlock = false
    let skippedHeading = false

    for (const rawLine of normalizedText.value.split('\n')) {
        const line = rawLine.trim()
        if (!line) continue

        if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock
            continue
        }

        if (!skippedHeading && /^#+\s+/.test(line)) {
            skippedHeading = true
            continue
        }

        const cleaned = stripMarkdownSyntax(line)
        if (!cleaned) continue

        segments.push(cleaned)
    }

    if (!skippedHeading && segments.length > 0) {
        return segments.slice(1)
    }

    return segments
})

const cardTitle = computed(() => {
    for (const line of meaningfulLines.value) {
        const heading = line.match(/^#+\s*(.+)/)
        if (heading?.[1]) {
            return stripMarkdownSyntax(heading[1]) || t('canvas.node.emptyContent')
        }

        if (!line.startsWith('```')) {
            const cleaned = stripMarkdownSyntax(line)
            if (cleaned) return cleaned
        }
    }

    return t('canvas.node.emptyContent')
})

const hasMoreContent = computed(() => previewSegments.value.length > 0)

const cardPreview = computed(() => {
    const preview = previewSegments.value.join(' ')
    if (preview.length > 60) {
        return preview.substring(0, 60) + '...'
    }
    return preview
})

const plainTextPreview = computed(() => {
    if (!normalizedText.value.trim()) {
        return t('canvas.node.emptyContent')
    }

    const plain = normalizedText.value
        .split('\n')
        .map(line => stripMarkdownSyntax(line))
        .filter(Boolean)
        .join('\n')

    if (!plain) {
        return t('canvas.node.emptyContent')
    }

    if (plain.length > 600) {
        return plain.substring(0, 600) + '...'
    }

    return plain
})

const renderedHtml = computed(() => {
    if (usePlainTextLod.value) {
        return ''
    }

    if (!normalizedText.value.trim()) {
        return `<p class="placeholder">${t('canvas.node.emptyContent')}</p>`
    }

    return DOMPurify.sanitize(getMarkdownParser().render(normalizedText.value), {
        ADD_ATTR: ['class']
    })
})
</script>

<style scoped>
.markdown-renderer {
    width: 100%;
    height: 100%;
    color: white;
    user-select: none;
}

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

.markdown-full {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
    text-align: left;
    line-height: 1.6;
}

.markdown-full-plain {
    white-space: pre-wrap;
    word-break: break-word;
}

.markdown-full :deep(p) {
    margin: 0;
}

.markdown-full :deep(p + p),
.markdown-full :deep(p + pre),
.markdown-full :deep(pre + p),
.markdown-full :deep(ul + p),
.markdown-full :deep(p + ul),
.markdown-full :deep(h1 + p),
.markdown-full :deep(h2 + p),
.markdown-full :deep(h3 + p) {
    margin-top: 0.6em;
}

.markdown-full :deep(h1),
.markdown-full :deep(h2),
.markdown-full :deep(h3),
.markdown-full :deep(h4),
.markdown-full :deep(h5),
.markdown-full :deep(h6) {
    margin: 0;
    font-size: 1em;
    font-weight: 700;
}

.markdown-full :deep(code) {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    padding: 0.1em 0.35em;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: var(--code-font-size);
}

.markdown-full :deep(pre) {
    margin: 0.6em 0 0;
    padding: 0.8em 0.9em;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.32);
    overflow: hidden;
    white-space: pre;
}

.markdown-full :deep(pre code) {
    display: block;
    padding: 0;
    background: transparent;
    white-space: inherit;
    word-break: normal;
    overflow-wrap: normal;
    line-height: 1.5;
    tab-size: 2;
}

.markdown-full :deep(.hljs) {
    display: block;
    white-space: inherit;
    background: transparent !important;
}

.markdown-full :deep(.hljs span) {
    display: inline;
}

.markdown-full :deep(.hljs-keyword),
.markdown-full :deep(.hljs-doctag) {
    color: #c678dd;
}

.markdown-full :deep(.hljs-string),
.markdown-full :deep(.hljs-attribute) {
    color: #98c379;
}

.markdown-full :deep(.hljs-number),
.markdown-full :deep(.hljs-attr) {
    color: #d19a66;
}

.markdown-full :deep(.hljs-title),
.markdown-full :deep(.hljs-function) {
    color: #61afef;
}

.markdown-full :deep(.hljs-comment) {
    color: #7f848e;
    font-style: italic;
}

.markdown-full :deep(.hljs-literal),
.markdown-full :deep(.hljs-type),
.markdown-full :deep(.hljs-symbol) {
    color: #56b6c2;
}

.markdown-full :deep(blockquote) {
    margin: 0.6em 0 0;
    padding-left: 0.8em;
    border-left: 3px solid rgba(255, 255, 255, 0.22);
    color: rgba(255, 255, 255, 0.72);
}

.markdown-full :deep(ul),
.markdown-full :deep(ol) {
    margin: 0.6em 0 0;
    padding-left: 1.2em;
}

.markdown-full :deep(li + li) {
    margin-top: 0.2em;
}

.markdown-full :deep(a) {
    color: #7dd3fc;
    text-decoration: none;
}

.markdown-full :deep(.placeholder) {
    margin: 0;
    color: rgba(255, 255, 255, 0.38);
    font-style: italic;
}
</style>

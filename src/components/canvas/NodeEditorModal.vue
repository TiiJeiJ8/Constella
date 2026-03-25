<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div
                v-if="true"
                ref="overlayRef"
                class="editor-overlay"
                tabindex="-1"
                @click.self="handleClose"
                @keydown.esc.stop="handleClose"
                @mousemove="handleOverlayPointerMove"
                @mouseleave="handleOverlayPointerLeave"
            >
                <Transition name="modal-scale" appear>
                    <div ref="editorContainerRef" class="editor-container">
                        <div class="editor-header">
                            <div class="header-left">
                                <span class="type-icon">{{ pluginMeta?.icon || 'N' }}</span>
                                <span class="type-label">
                                    {{ pluginMeta ? (te(`canvas.nodeTypes.${pluginMeta.kind}`) ? t(`canvas.nodeTypes.${pluginMeta.kind}`) : pluginMeta.label) : t('canvas.editor.edit') }}
                                </span>
                                <div v-if="editingUsers.length > 0" class="collab-users">
                                    <div
                                        v-for="user in editingUsers"
                                        :key="user.clientId"
                                        class="collab-avatar"
                                        :style="{ backgroundColor: user.user.color }"
                                        :title="user.user.name"
                                    >
                                        {{ user.user.name.charAt(0).toUpperCase() }}
                                    </div>
                                </div>
                            </div>
                            <div v-if="isMarkdown" class="view-mode-switch" role="tablist" :aria-label="t('canvas.editor.viewMode')">
                                <button
                                    v-for="mode in viewModes"
                                    :key="mode.id"
                                    type="button"
                                    class="view-mode-btn"
                                    :class="{ active: effectiveViewMode === mode.id }"
                                    :title="mode.label"
                                    @click="viewMode = mode.id"
                                >
                                    {{ mode.label }}
                                </button>
                            </div>
                            <div class="header-actions">
                                <button
                                    v-if="canExportDocument"
                                    type="button"
                                    class="header-action-btn primary"
                                    :title="t('canvas.editor.exportAction')"
                                    @click="handleExport"
                                >
                                    {{ t('canvas.editor.exportAction') }}
                                </button>
                                <button class="close-btn" :title="t('canvas.editor.closeHint')" @click="handleClose">
                                    <span>&times;</span>
                                </button>
                            </div>
                        </div>

                        <div class="editor-body" :class="editorBodyClass">
                            <div v-if="showEditorPane" class="edit-pane">
                                <div class="pane-header-row">
                                    <div class="pane-header">{{ t('canvas.editor.edit') }}</div>
                                    <div v-if="isMarkdown && activeCodeFence" class="pane-subtools">
                                        <span class="subtool-label">Code Block</span>
                                        <button
                                            v-for="language in commonCodeLanguages"
                                            :key="language"
                                            type="button"
                                            class="code-language-chip"
                                            :class="{ active: activeCodeFence.language === language }"
                                            @click="setCurrentCodeFenceLanguage(language)"
                                        >
                                            {{ language }}
                                        </button>
                                    </div>
                                </div>

                                <div v-if="isMarkdown" class="editor-toolbar">
                                    <button
                                        v-for="action in toolbarActions"
                                        :key="action.id"
                                        type="button"
                                        class="toolbar-button"
                                        :title="action.description"
                                        @click="action.action"
                                    >
                                        <span class="toolbar-button-label">{{ action.label }}</span>
                                    </button>
                                </div>

                                <div class="textarea-wrapper">
                                    <textarea
                                        ref="textareaRef"
                                        class="editor-textarea"
                                        :value="localContent"
                                        :placeholder="placeholder"
                                        spellcheck="false"
                                        @input="handleInput"
                                        @keydown="handleKeyDown"
                                        @paste="handlePaste"
                                        @wheel="markEditorIntent"
                                        @pointerdown="markEditorIntent"
                                        @scroll="handleEditorScroll"
                                        @select="handleSelection"
                                        @click="handleCursorChange"
                                        @keyup="handleCursorChange"
                                    />
                                    <div
                                        v-for="cursor in remoteCursors"
                                        :key="cursor.clientId"
                                        class="remote-cursor"
                                        :style="cursor.style"
                                    >
                                        <div class="remote-cursor-caret" :style="{ backgroundColor: cursor.color }" />
                                        <div class="remote-cursor-label" :style="{ backgroundColor: cursor.color }">
                                            {{ cursor.name }}
                                        </div>
                                        <div
                                            v-if="cursor.selectionWidth > 0"
                                            class="remote-selection"
                                            :style="{ backgroundColor: `${cursor.color}40`, width: `${cursor.selectionWidth}ch` }"
                                        />
                                    </div>
                                </div>

                                <div
                                    v-if="showSlashMenu"
                                    ref="slashMenuRef"
                                    class="slash-menu"
                                    :style="slashMenuStyle"
                                >
                                    <div class="slash-menu-header">{{ t('canvas.editor.insertBlock') }}</div>
                                    <div class="slash-menu-scroll">
                                        <div
                                            v-for="(cmd, index) in filteredCommands"
                                            :key="cmd.id"
                                            class="slash-menu-item"
                                            :class="{ active: index === selectedCommandIndex }"
                                            @click="executeCommand(cmd)"
                                            @mouseenter="selectedCommandIndex = index"
                                        >
                                            <span class="cmd-icon" :class="cmd.iconClass">{{ cmd.icon }}</span>
                                            <div class="cmd-info">
                                                <span class="cmd-label">{{ cmd.label }}</span>
                                                <span class="cmd-desc">{{ cmd.description }}</span>
                                            </div>
                                            <span v-if="cmd.shortcut" class="cmd-shortcut">{{ cmd.shortcut }}</span>
                                        </div>
                                    </div>
                                    <div v-if="filteredCommands.length === 0" class="slash-menu-empty">
                                        {{ t('canvas.editor.noMatch') }}
                                    </div>
                                </div>

                            </div>

                            <div v-if="showPreviewPane" class="preview-pane">
                                <div class="pane-header-row preview-pane-header">
                                    <div class="pane-header">{{ t('canvas.editor.preview') }}</div>
                                    <div class="preview-stats">
                                        <span>{{ previewBlocks.length }} blocks</span>
                                        <span>{{ outlineItems.length }} headings</span>
                                    </div>
                                </div>

                                <div class="preview-layout">
                                    <div ref="previewRef" class="preview-content" @click="handlePreviewClick" @wheel="markPreviewIntent" @pointerdown="markPreviewIntent" @scroll="handlePreviewScroll">
                                        <div v-if="previewBlocks.length === 0" class="preview-empty">
                                            {{ t('canvas.editor.previewArea') }}
                                        </div>
                                        <div
                                            v-for="block in previewBlocks"
                                            :id="block.anchorId"
                                            :key="block.id"
                                            class="preview-block"
                                            :class="{ 'is-heavy': block.isHeavy, 'is-deferred': block.isDeferred, active: block.id === activePreviewBlockId }"
                                            :data-preview-block-id="block.id"
                                        >
                                            <div v-if="block.isDeferred" class="preview-block-placeholder">
                                                <span class="preview-block-badge">Lazy Render</span>
                                                <p>{{ block.summary }}</p>
                                            </div>
                                            <div v-else class="preview-block-inner" v-html="block.html" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="editor-footer">
                            <div class="footer-hint">
                                <kbd>/</kbd> {{ t('canvas.editor.footerHint') }} · <kbd>Tab</kbd> indent · <kbd>Esc</kbd> {{ t('canvas.editor.footerClose') }}
                            </div>
                            <div class="footer-right">
                                <span v-if="editingUsers.length > 0" class="collab-indicator">
                                    {{ t('canvas.editor.collaborating', { count: editingUsers.length + 1 }) }}
                                </span>
                                <span class="char-count">{{ t('canvas.editor.characters', { count: localContent.length }) }}</span>
                            </div>
                        </div>
                    </div>
                </Transition>
                <div v-if="showPreviewPane && outlineItems.length > 0" class="outline-floating-shell">
                    <button
                        type="button"
                        class="outline-toggle"
                        :class="{ open: outlineOpen, armed: outlineHintActive }"
                        @click="outlineOpen = !outlineOpen"
                    >
                        <span class="outline-toggle-icon">{{ outlineOpen ? '‹' : '›' }}</span>
                    </button>

                    <Transition name="outline-float">
                        <aside v-if="outlineOpen" class="outline-pane">
                            <div class="outline-header">Outline</div>
                            <button
                                v-for="item in outlineItems"
                                :key="item.id"
                                type="button"
                                class="outline-item"
                                :class="[`level-${item.level}`, { active: activeOutlineId === item.id }]"
                                @click="scrollToOutlineItem(item)"
                            >
                                {{ item.text }}
                            </button>
                        </aside>
                    </Transition>
                </div>
            </div>
        </Transition>
        <DocumentExportPanel
            v-model="isExportPanelOpen"
            :kind="isMarkdown ? 'markdown' : 'text'"
            :default-settings="exportPanelDefaults"
            :supports-electron-pdf="supportsElectronPdf"
            @confirm="handleExportConfirm"
        />
        <Transition name="modal-fade">
            <div
                v-if="activeImagePreview"
                ref="imageLightboxRef"
                class="image-lightbox"
                tabindex="-1"
                @click.self="closeImagePreview"
                @keydown.esc.stop="closeImagePreview"
            >
                <button type="button" class="image-lightbox-close" @click="closeImagePreview">&times;</button>
                <img
                    class="image-lightbox-media"
                    :src="activeImagePreview.src"
                    :alt="activeImagePreview.alt"
                />
                <div v-if="activeImagePreview.alt" class="image-lightbox-caption">{{ activeImagePreview.alt }}</div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import katex from 'katex'
import mermaid from 'mermaid'
import type { MermaidConfig } from 'mermaid'
// @ts-ignore
import { pluginRegistry, type NodeContent } from '@/plugins'
import DocumentExportPanel from '@/components/canvas/DocumentExportPanel.vue'
import {
    exportDocument,
    type ExportTheme,
    type ExportPanelSettings,
    type ExportPanelThemeMode
} from '@/utils/documentExport'
import { deriveDocumentTitle, sanitizeFilename } from '@/utils/markdownRender'
import { useToast } from '@/utils/useToast'
import type { UserState } from '../../composables/useAwareness'

const { t, te } = useI18n()
const toast = useToast()

type MermaidThemeMode = 'light' | 'dark'

function getMermaidThemeVariables(mode: MermaidThemeMode) {
    if (mode === 'light') {
        return {
            primaryColor: '#e8eef9',
            primaryTextColor: '#172033',
            primaryBorderColor: '#9bb2d1',
            lineColor: '#7a93b8',
            secondaryColor: '#dfe8f5',
            tertiaryColor: '#f3f6fb',
            background: '#ffffff',
            mainBkg: '#e8eef9',
            secondBkg: '#dfe8f5',
            tertiaryBkg: '#f3f6fb',
            textColor: '#172033',
            nodeBorder: '#9bb2d1',
            clusterBkg: '#f5f7fb',
            clusterBorder: '#c8d4e8',
            edgeLabelBackground: '#ffffff',
            cScale0: '#d8e7ff',
            cScale1: '#dff4ea',
            cScale2: '#fff1d6',
            cScale3: '#f4e3ff',
            cScaleLabel0: '#172033',
            cScaleLabel1: '',
            cScaleLabel2: '#4b3200',
            cScaleLabel3: '#3d1d59'
        }
    }

    return {
        primaryColor: '#1e293b',
        primaryTextColor: '#e5eefc',
        primaryBorderColor: '#5f7ba6',
        lineColor: '#8aa4d0',
        secondaryColor: '#162132',
        tertiaryColor: '#111a28',
        background: '#17181c',
        mainBkg: '#1e293b',
        secondBkg: '#162132',
        tertiaryBkg: '#111a28',
        textColor: '#e5eefc',
        nodeBorder: '#5f7ba6',
        clusterBkg: '#111a28',
        clusterBorder: '#334155',
        edgeLabelBackground: '#17181c',
        cScale0: '#26476b',
        cScale1: '#173226',
        cScale2: '#6a4f1f',
        cScale3: '#4b2e67',
        cScaleLabel0: '#eff6ff',
        cScaleLabel1: '#ecfdf5',
        cScaleLabel2: '#fff7ed',
        cScaleLabel3: '#faf5ff'
    }
}

function getMermaidConfig(mode: MermaidThemeMode): MermaidConfig {
    return {
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        themeVariables: getMermaidThemeVariables(mode)
    }
}

function getMermaidDiagramLabel(source: string): string {
    const firstMeaningfulLine = source
        .split('\n')
        .map(line => line.trim())
        .find(line => Boolean(line))
        ?.toLowerCase() ?? ''

    const labelMap: Array<[RegExp, string]> = [
        [/^mindmap\b/, 'Mindmap'],
        [/^(flowchart|graph)\b/, 'Flowchart'],
        [/^sequencediagram\b/, 'Sequence'],
        [/^classdiagram\b/, 'Class'],
        [/^erdiagram\b/, 'ERD'],
        [/^journey\b/, 'Journey'],
        [/^gantt\b/, 'Gantt'],
        [/^statediagram(?:-v2)?\b/, 'State'],
        [/^pie\b/, 'Pie'],
        [/^quadrantchart\b/, 'Quadrant'],
        [/^requirementdiagram\b/, 'Requirement'],
        [/^gitgraph\b/, 'Git Graph'],
        [/^timeline\b/, 'Timeline'],
        [/^c4context\b/, 'C4 Context'],
        [/^c4container\b/, 'C4 Container'],
        [/^c4component\b/, 'C4 Component'],
        [/^c4dynamic\b/, 'C4 Dynamic'],
        [/^c4deployment\b/, 'C4 Deployment'],
        [/^block-beta\b/, 'Block']
    ]

    const matched = labelMap.find(([pattern]) => pattern.test(firstMeaningfulLine))
    return `Mermaid · ${matched?.[1] ?? 'Diagram'}`
}

mermaid.initialize(getMermaidConfig('dark'))

interface SlashCommand {
    id: string
    icon: string
    iconClass?: string
    label: string
    description: string
    shortcut?: string
    action: () => string
}

interface RemoteCursor {
    clientId: number
    name: string
    color: string
    position: number
    selectionEnd: number
    style: { top: string; left: string }
    selectionWidth: number
}

interface PreviewBlock {
    id: string
    anchorId: string
    raw: string
    html: string
    summary: string
    isHeavy: boolean
    isDeferred: boolean
}

interface EditorBlockMetric {
    id: string
    start: number
    end: number
    length: number
}

interface OutlineItem {
    id: string
    blockId: string
    anchorId: string
    text: string
    level: number
}

interface ToolbarAction {
    id: string
    label: string
    description: string
    action: () => void
}

interface CodeFenceContext {
    language: string
    lineStart: number
    lineEnd: number
}

type EditorViewMode = 'edit' | 'split' | 'preview'

const props = defineProps<{
    nodeId: string
    content: NodeContent
}>()

const emit = defineEmits<{
    (e: 'update', nodeId: string, data: string): void
    (e: 'close'): void
}>()

const awareness = inject<{
    otherUsers: { value: UserState[] }
    updateTextCursor?: (nodeId: string, position: number, selectionEnd: number) => void
}>('awareness', { otherUsers: { value: [] } })

const overlayRef = ref<HTMLDivElement | null>(null)
const editorContainerRef = ref<HTMLDivElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const previewRef = ref<HTMLDivElement | null>(null)
const slashMenuRef = ref<HTMLDivElement | null>(null)
const imageLightboxRef = ref<HTMLDivElement | null>(null)
const localContent = ref('')
const showSlashMenu = ref(false)
const slashMenuPosition = ref({ top: 0, left: 0 })
const selectedCommandIndex = ref(0)
const slashQuery = ref('')
const slashStartPosition = ref(0)
const visiblePreviewBlockIds = ref<Set<string>>(new Set())
const outlineOpen = ref(false)
const activeOutlineId = ref('')
const outlineHintActive = ref(false)
const isExportPanelOpen = ref(false)
const viewMode = ref<EditorViewMode>('edit')
const editorSelectionStart = ref(0)
const forceSingleColumn = ref(false)
const activeImagePreview = ref<{ src: string; alt: string } | null>(null)

const previewCache = new Map<string, string>()
const mathPlaceholders = new Map<string, string>()
const codePlaceholders = new Map<string, string>()
const markdownUtils = new MarkdownIt().utils
const commonCodeLanguages = ['text', 'javascript', 'typescript', 'python', 'bash', 'sql', 'json', 'html', 'css']

let placeholderCounter = 0
let mermaidCounter = 0
let previewObserver: IntersectionObserver | null = null
let previewSyncFrame: number | null = null
let pendingEditorScrollTop = 0
let syncingSource: 'editor' | null = null
let editorLayoutResizeObserver: ResizeObserver | null = null

const VIEW_MODE_STORAGE_KEY = 'constella.node-editor.view-mode'
const SINGLE_COLUMN_BREAKPOINT = 1180

const md = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
    typographer: true,
    highlight(str: string, lang: string): string {
        if (lang === 'mermaid') {
            const id = `mermaid-${mermaidCounter++}`
            const mermaidLabel = markdownUtils.escapeHtml(getMermaidDiagramLabel(str))
            return `<div class="mermaid-wrapper"><span class="mermaid-block-lang">${mermaidLabel}</span><pre class="mermaid" id="${id}">${markdownUtils.escapeHtml(str)}</pre></div>`
        }
        const languageLabel = markdownUtils.escapeHtml(lang || 'text')
        if (lang && hljs.getLanguage(lang)) {
            try {
                return `<div class="code-block-shell"><span class="code-block-lang">${languageLabel}</span><pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre></div>`
            } catch {
                return `<div class="code-block-shell"><span class="code-block-lang">${languageLabel}</span><pre class="hljs"><code>${markdownUtils.escapeHtml(str)}</code></pre></div>`
            }
        }
        return `<div class="code-block-shell"><span class="code-block-lang">${languageLabel}</span><pre class="hljs"><code>${markdownUtils.escapeHtml(str)}</code></pre></div>`
    }
})

const defaultLinkOpen = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    if (!token) return ''
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
    return defaultLinkOpen(tokens, idx, options, env, self)
}

function renderKaTeX(tex: string, displayMode: boolean): string {
    try {
        return katex.renderToString(tex, {
            displayMode,
            throwOnError: false,
            errorColor: '#f56565',
            trust: true,
            strict: false
        })
    } catch {
        return `<span class="katex-error">${markdownUtils.escapeHtml(tex)}</span>`
    }
}

function protectCode(text: string): string {
    codePlaceholders.clear()
    text = text.replace(/(^|\n)(```[\s\S]*?```)(?=\n|$)/g, (_, prefix: string, block: string) => {
        const id = `%%CODE_BLOCK_${placeholderCounter++}%%`
        codePlaceholders.set(id, block)
        return `${prefix}${id}`
    })
    text = text.replace(/`([^`\n]+)`/g, (match: string) => {
        const id = `%%CODE_INLINE_${placeholderCounter++}%%`
        codePlaceholders.set(id, match)
        return id
    })
    return text
}

function restoreCode(text: string): string {
    codePlaceholders.forEach((replacement, placeholder) => {
        text = text.split(placeholder).join(replacement)
    })
    return text
}

function protectMath(text: string): string {
    mathPlaceholders.clear()
    placeholderCounter = 0
    text = protectCode(text)
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => {
        const id = `%%MATH_BLOCK_${placeholderCounter++}%%`
        mathPlaceholders.set(id, `<div class="katex-block">${renderKaTeX(tex.trim(), true)}</div>`)
        return id
    })
    text = text.replace(/\$([^$\n]+?)\$/g, (_, tex: string) => {
        const id = `%%MATH_INLINE_${placeholderCounter++}%%`
        mathPlaceholders.set(id, renderKaTeX(tex.trim(), false))
        return id
    })
    return restoreCode(text)
}

function restoreMath(html: string): string {
    mathPlaceholders.forEach((replacement, placeholder) => {
        html = html.split(placeholder).join(replacement)
    })
    return html
}

function sanitizeHtml(rawHtml: string): string {
    return DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['span', 'img', 'svg', 'path', 'line', 'rect', 'circle', 'g', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mroot', 'msqrt', 'mtext', 'annotation', 'math', 'foreignObject', 'polygon', 'polyline', 'ellipse', 'text', 'tspan', 'marker', 'defs', 'clipPath', 'use', 'image', 'pattern', 'linearGradient', 'radialGradient', 'stop', 'title', 'desc'],
        ADD_ATTR: ['xmlns', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'transform', 'style', 'aria-hidden', 'focusable', 'role', 'encoding', 'id', 'class', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'marker-end', 'marker-start', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight', 'fill-opacity', 'stroke-opacity', 'stroke-dasharray', 'clip-path', 'xlink:href', 'href', 'src', 'alt', 'title', 'loading', 'referrerpolicy', 'preserveAspectRatio'],
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'hr', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'svg', 'path', 'line', 'rect', 'circle', 'g', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mroot', 'msqrt', 'mtext', 'annotation', 'math', 'polygon', 'polyline', 'ellipse', 'text', 'tspan', 'marker', 'defs', 'clipPath', 'use', 'foreignObject'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'id', 'xmlns', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'transform', 'aria-hidden', 'focusable', 'role', 'encoding', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'marker-end', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight', 'src', 'alt', 'title', 'loading', 'referrerpolicy']
    })
}

function renderMarkdown(text: string): string {
    mermaidCounter = 0
    const processed = protectMath(text)
    return sanitizeHtml(restoreMath(md.render(processed)))
}

function stripMarkdownSyntax(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, 'code block')
        .replace(/`([^`\n]+)`/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        .replace(/^\s*>\s?/gm, '')
        .replace(/\$\$[\s\S]+?\$\$/g, 'formula')
        .replace(/\$([^$\n]+)\$/g, '$1')
        .replace(/\|/g, ' ')
        .replace(/\n+/g, ' ')
        .trim()
}

function summarizeBlock(text: string): string {
    const plain = stripMarkdownSyntax(text)
    return plain ? plain.slice(0, 120) : 'Heavy block will render when it enters the viewport.'
}

function hashText(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i)
        hash |= 0
    }
    return Math.abs(hash).toString(36)
}

function splitMarkdownBlocks(text: string): string[] {
    if (!text.trim()) return []
    const blocks: string[] = []
    const lines = text.split('\n')
    let current: string[] = []
    let inFence = false
    let inMath = false

    const pushCurrent = () => {
        const block = current.join('\n').trim()
        if (block) blocks.push(block)
        current = []
    }

    for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('```')) {
            current.push(line)
            inFence = !inFence
            continue
        }
        if (!inFence && trimmed === '$$') {
            current.push(line)
            inMath = !inMath
            continue
        }
        if (!inFence && !inMath && trimmed === '') {
            pushCurrent()
            continue
        }
        current.push(line)
    }

    pushCurrent()
    return blocks
}

function isHeavyBlock(text: string): boolean {
    return /```|^\$\$|^\|.*\|$/m.test(text) || text.length > 600
}

const pluginMeta = computed(() => pluginRegistry.getMeta(props.content.kind))
const isMarkdown = computed(() => props.content.kind === 'markdown')
const effectiveViewMode = computed<EditorViewMode>(() => {
    if (!isMarkdown.value) return 'edit'
    if (forceSingleColumn.value && viewMode.value === 'split') return 'edit'
    return viewMode.value
})
const viewModes = computed(() => ([
    { id: 'edit' as EditorViewMode, label: t('canvas.editor.modeEdit') },
    { id: 'split' as EditorViewMode, label: t('canvas.editor.modeSplit') },
    { id: 'preview' as EditorViewMode, label: t('canvas.editor.modePreview') }
]))
const canExportDocument = computed(() => props.content.kind === 'markdown' || props.content.kind === 'text')
const supportsElectronPdf = computed(() => Boolean(window.electron?.exportDocumentPdf))
const showEditorPane = computed(() => !isMarkdown.value || effectiveViewMode.value === 'edit' || effectiveViewMode.value === 'split')
const showPreviewPane = computed(() => isMarkdown.value && (effectiveViewMode.value === 'split' || effectiveViewMode.value === 'preview'))
const editorBodyClass = computed(() => ({
    'split-view': showEditorPane.value && showPreviewPane.value,
    'edit-only': showEditorPane.value && !showPreviewPane.value,
    'preview-only': showPreviewPane.value && !showEditorPane.value
}))
const placeholder = computed(() => isMarkdown.value ? t('canvas.editor.markdownPlaceholder') : t('canvas.editor.textPlaceholder'))
const slashMenuStyle = computed(() => ({ top: `${slashMenuPosition.value.top}px`, left: `${slashMenuPosition.value.left}px` }))
const editingUsers = computed(() => awareness.otherUsers.value.filter(user => user.selection?.includes(props.nodeId)))

const remoteCursors = computed<RemoteCursor[]>(() => {
    if (!textareaRef.value) return []
    return awareness.otherUsers.value
        .filter(user => user.textCursor?.nodeId === props.nodeId)
        .map(user => {
            const position = user.textCursor?.position ?? 0
            const selectionEnd = user.textCursor?.selectionEnd ?? position
            const { top, left } = getCaretCoordinates(position)
            return {
                clientId: user.clientId,
                name: user.user.name,
                color: user.user.color,
                position,
                selectionEnd,
                style: { top: `${top}px`, left: `${left}px` },
                selectionWidth: Math.abs(selectionEnd - position)
            }
        })
})

const activeCodeFence = computed<CodeFenceContext | null>(() => {
    const textarea = textareaRef.value
    if (!textarea || !isMarkdown.value) return null

    const cursor = textarea.selectionStart
    const lines = localContent.value.split('\n')
    let offset = 0
    let openFence: CodeFenceContext | null = null

    for (const line of lines) {
        const lineStart = offset
        const lineEnd = offset + line.length
        const trimmed = line.trim()

        if (trimmed.startsWith('```')) {
            if (!openFence) {
                openFence = {
                    language: trimmed.slice(3).trim() || 'text',
                    lineStart,
                    lineEnd
                }
            } else if (cursor >= openFence.lineStart && cursor <= lineEnd) {
                return openFence
            } else {
                openFence = null
            }
        }

        if (openFence && cursor >= openFence.lineEnd + 1 && cursor <= lineEnd) {
            return openFence
        }

        offset = lineEnd + 1
    }

    return openFence && cursor >= openFence.lineEnd + 1 ? openFence : null
})

const rawBlocks = computed(() => splitMarkdownBlocks(localContent.value))

const editorBlockMetrics = computed<EditorBlockMetric[]>(() => {
    let cursor = 0
    return rawBlocks.value.map((block, index) => {
        const foundIndex = localContent.value.indexOf(block, cursor)
        const start = foundIndex === -1 ? cursor : foundIndex
        const end = start + block.length
        cursor = end
        const id = `preview-block-${index}-${hashText(block)}`
        return {
            id,
            start,
            end,
            length: Math.max(1, end - start)
        }
    })
})

const lineStartOffsets = computed(() => {
    const offsets = [0]
    for (let index = 0; index < localContent.value.length; index += 1) {
        if (localContent.value[index] === '\n') {
            offsets.push(index + 1)
        }
    }
    return offsets
})

const outlineItems = computed<OutlineItem[]>(() => {
    const items: OutlineItem[] = []
    rawBlocks.value.forEach((block, index) => {
        const match = block.match(/^(#{1,6})\s+(.+)$/m)
        if (!match) return
        const headingMarks = match[1] ?? ''
        const headingText = match[2] ?? ''
        const blockId = `preview-block-${index}-${hashText(block)}`
        items.push({
            id: `outline-${blockId}`,
            blockId,
            anchorId: `${blockId}-anchor`,
            text: stripMarkdownSyntax(headingText),
            level: headingMarks.length
        })
    })
    return items
})

const previewBlocks = computed<PreviewBlock[]>(() => {
    return rawBlocks.value.map((block, index) => {
        const id = `preview-block-${index}-${hashText(block)}`
        const isHeavy = isHeavyBlock(block)
        const shouldDefer = isHeavy && !visiblePreviewBlockIds.value.has(id) && !previewCache.has(block)
        const html = shouldDefer
            ? ''
            : (previewCache.get(block) ?? (() => {
                const rendered = renderMarkdown(block)
                previewCache.set(block, rendered)
                return rendered
            })())

        return {
            id,
            anchorId: `${id}-anchor`,
            raw: block,
            html,
            summary: summarizeBlock(block),
            isHeavy,
            isDeferred: shouldDefer
        }
    })
})

const activePreviewBlockId = computed(() => {
    if (!isMarkdown.value || editorBlockMetrics.value.length === 0) return ''
    const cursor = Math.min(localContent.value.length, Math.max(0, editorSelectionStart.value))
    const metric = editorBlockMetrics.value.find(block => cursor <= block.end) ?? editorBlockMetrics.value[editorBlockMetrics.value.length - 1]
    return metric?.id ?? ''
})

const toolbarActions = computed<ToolbarAction[]>(() => [
    { id: 'h1', label: 'H1', description: 'Insert heading 1', action: () => prependToCurrentLine('# ') },
    { id: 'h2', label: 'H2', description: 'Insert heading 2', action: () => prependToCurrentLine('## ') },
    { id: 'bullet', label: '• List', description: 'Insert bullet list', action: () => prependToCurrentLine('- ') },
    { id: 'todo', label: 'Todo', description: 'Insert checklist item', action: () => prependToCurrentLine('- [ ] ') },
    { id: 'quote', label: 'Quote', description: 'Insert quote block', action: () => prependToCurrentLine('> ') },
    { id: 'code', label: 'Code', description: 'Insert fenced code block', action: () => insertSnippet('```\n\n```', 4) },
    { id: 'math', label: 'Math', description: 'Insert inline math', action: () => wrapSelection('$', '$', 'formula') },
    { id: 'table', label: 'Table', description: 'Insert markdown table', action: () => insertSnippet('| Col 1 | Col 2 |\n| --- | --- |\n| Item | Item |') },
    { id: 'link', label: 'Link', description: 'Wrap selection with a link', action: () => wrapSelection('[', '](https://)', 'text') },
    { id: 'flow', label: 'Flow', description: 'Insert mermaid flowchart', action: () => insertSnippet('```mermaid\nflowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Done]\n    B -->|No| D[Retry]\n```', 13) }
])

const slashCommands = computed<SlashCommand[]>(() => [
    { id: 'h1', icon: 'H1', label: t('canvas.editor.commands.h1'), description: t('canvas.editor.commands.h1Desc'), action: () => '# ' },
    { id: 'h2', icon: 'H2', label: t('canvas.editor.commands.h2'), description: t('canvas.editor.commands.h2Desc'), action: () => '## ' },
    { id: 'h3', icon: 'H3', label: t('canvas.editor.commands.h3'), description: t('canvas.editor.commands.h3Desc'), action: () => '### ' },
    { id: 'bullet', icon: '•', label: t('canvas.editor.commands.bullet'), description: t('canvas.editor.commands.bulletDesc'), action: () => '- ' },
    { id: 'numbered', icon: '1.', label: t('canvas.editor.commands.numbered'), description: t('canvas.editor.commands.numberedDesc'), action: () => '1. ' },
    { id: 'todo', icon: '☐', label: t('canvas.editor.commands.todo'), description: t('canvas.editor.commands.todoDesc'), action: () => '- [ ] ' },
    { id: 'quote', icon: '"', label: t('canvas.editor.commands.quote'), description: t('canvas.editor.commands.quoteDesc'), action: () => '> ' },
    { id: 'divider', icon: '—', label: t('canvas.editor.commands.divider'), description: t('canvas.editor.commands.dividerDesc'), action: () => '\n---\n' },
    { id: 'code', icon: '<>', iconClass: 'code-icon', label: t('canvas.editor.commands.code'), description: t('canvas.editor.commands.codeDesc'), action: () => '```\n\n```' },
    { id: 'code-js', icon: 'JS', iconClass: 'lang-js', label: t('canvas.editor.commands.codeJs'), description: t('canvas.editor.commands.codeJsDesc'), action: () => '```javascript\n\n```' },
    { id: 'code-ts', icon: 'TS', iconClass: 'lang-ts', label: t('canvas.editor.commands.codeTs'), description: t('canvas.editor.commands.codeTsDesc'), action: () => '```typescript\n\n```' },
    { id: 'code-py', icon: 'PY', iconClass: 'lang-py', label: t('canvas.editor.commands.codePy'), description: t('canvas.editor.commands.codePyDesc'), action: () => '```python\n\n```' },
    { id: 'code-java', icon: 'J', label: t('canvas.editor.commands.codeJava'), description: t('canvas.editor.commands.codeJavaDesc'), action: () => '```java\n\n```' },
    { id: 'code-css', icon: '#', iconClass: 'lang-css', label: t('canvas.editor.commands.codeCss'), description: t('canvas.editor.commands.codeCssDesc'), action: () => '```css\n\n```' },
    { id: 'code-html', icon: '<>', iconClass: 'lang-html', label: t('canvas.editor.commands.codeHtml'), description: t('canvas.editor.commands.codeHtmlDesc'), action: () => '```html\n\n```' },
    { id: 'code-sql', icon: 'DB', label: t('canvas.editor.commands.codeSql'), description: t('canvas.editor.commands.codeSqlDesc'), action: () => '```sql\n\n```' },
    { id: 'code-sh', icon: '$', label: t('canvas.editor.commands.codeSh'), description: t('canvas.editor.commands.codeShDesc'), action: () => '```bash\n\n```' },
    { id: 'code-json', icon: '{}', label: t('canvas.editor.commands.codeJson'), description: t('canvas.editor.commands.codeJsonDesc'), action: () => '```json\n\n```' },
    { id: 'math', icon: 'Σ', iconClass: 'math-icon', label: t('canvas.editor.commands.math'), description: t('canvas.editor.commands.mathDesc'), shortcut: '$...$', action: () => '$E = mc^2$' },
    { id: 'math-block', icon: '∫', iconClass: 'math-icon', label: t('canvas.editor.commands.mathBlock'), description: t('canvas.editor.commands.mathBlockDesc'), shortcut: '$$...$$', action: () => '$$\n\\int_{a}^{b} f(x) dx\n$$' },
    { id: 'mermaid-flow', icon: 'Flow', label: t('canvas.editor.commands.flowchart'), description: t('canvas.editor.commands.flowchartDesc'), action: () => '```mermaid\nflowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Done]\n    B -->|No| D[Retry]\n```' },
    { id: 'mermaid-seq', icon: 'Seq', label: t('canvas.editor.commands.sequence'), description: t('canvas.editor.commands.sequenceDesc'), action: () => '```mermaid\nsequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi\n```' },
    { id: 'mermaid-mindmap', icon: 'Map', label: t('canvas.editor.commands.mindmap'), description: t('canvas.editor.commands.mindmapDesc'), action: () => '```mermaid\nmindmap\n  root((Topic))\n    Branch One\n      Detail A\n      Detail B\n```' },
    { id: 'mermaid-class', icon: 'Cls', label: 'Class Diagram', description: 'Insert a Mermaid class diagram template', action: () => '```mermaid\nclassDiagram\n    class Animal {\n      +String name\n      +eat()\n    }\n    class Dog {\n      +bark()\n    }\n    Animal <|-- Dog\n```' },
    { id: 'mermaid-state', icon: 'State', label: 'State Diagram', description: 'Insert a Mermaid state diagram template', action: () => '```mermaid\nstateDiagram-v2\n    [*] --> Idle\n    Idle --> Loading: Fetch\n    Loading --> Success: Done\n    Loading --> Error: Fail\n    Error --> Idle: Retry\n```' },
    { id: 'mermaid-er', icon: 'ER', label: 'ER Diagram', description: 'Insert a Mermaid ER diagram template', action: () => '```mermaid\nerDiagram\n    USER ||--o{ ORDER : places\n    USER {\n      string id\n      string email\n    }\n    ORDER {\n      string id\n      float total\n    }\n```' },
    { id: 'mermaid-gantt', icon: 'Plan', label: 'Gantt Chart', description: 'Insert a Mermaid gantt chart template', action: () => '```mermaid\ngantt\n    title Product Launch\n    dateFormat  YYYY-MM-DD\n    section Design\n    Wireframes    :done,    des1, 2026-03-01,2026-03-03\n    Review        :active,  des2, 2026-03-04, 3d\n    section Build\n    API           :         dev1, after des2, 4d\n    UI Polish     :         dev2, after dev1, 3d\n```' },
    { id: 'mermaid-journey', icon: 'Path', label: 'Journey Map', description: 'Insert a Mermaid user journey template', action: () => '```mermaid\njourney\n    title User onboarding\n    section Discover\n      Visit homepage: 4: User\n      Read product story: 5: User\n    section Activate\n      Create account: 3: User\n      Finish setup: 4: User\n```' },
    { id: 'mermaid-pie', icon: 'Pie', label: 'Pie Chart', description: 'Insert a Mermaid pie chart template', action: () => '```mermaid\npie title Traffic sources\n    \"Organic\" : 42\n    \"Direct\" : 23\n    \"Social\" : 18\n    \"Email\" : 17\n```' },
    { id: 'mermaid-gitgraph', icon: 'Git', label: 'Git Graph', description: 'Insert a Mermaid git graph template', action: () => '```mermaid\ngitGraph\n    commit id: \"init\"\n    branch feature\n    checkout feature\n    commit id: \"editor\"\n    checkout main\n    merge feature\n```' },
    { id: 'mermaid-timeline', icon: 'Time', label: 'Timeline', description: 'Insert a Mermaid timeline template', action: () => '```mermaid\ntimeline\n    title Product Evolution\n    2023 : Idea\n         : First prototype\n    2024 : Private beta\n         : Team rollout\n    2025 : Public launch\n```' },
    { id: 'mermaid-quadrant', icon: 'Quad', label: 'Quadrant Chart', description: 'Insert a Mermaid quadrant chart template', action: () => '```mermaid\nquadrantChart\n    title Feature Prioritization\n    x-axis Low effort --> High effort\n    y-axis Low impact --> High impact\n    quadrant-1 Quick wins\n    quadrant-2 Big bets\n    quadrant-3 Fill-ins\n    quadrant-4 Time sinks\n    \"Search\" : [0.32, 0.82]\n    \"Sync\" : [0.76, 0.88]\n    \"Themes\" : [0.24, 0.42]\n    \"Import\" : [0.81, 0.26]\n```' },
    { id: 'mermaid-requirement', icon: 'Req', label: 'Requirement Diagram', description: 'Insert a Mermaid requirement diagram template', action: () => '```mermaid\nrequirementDiagram\n    requirement user_auth {\n      id: 1\n      text: User signs in securely\n      risk: medium\n      verifymethod: test\n    }\n    requirement session_persist {\n      id: 2\n      text: Session survives app restart\n      risk: low\n      verifymethod: analysis\n    }\n    element web_app {\n      type: application\n    }\n    web_app - satisfies -> user_auth\n    web_app - satisfies -> session_persist\n```' },
    { id: 'bold', icon: 'B', iconClass: 'bold-icon', label: t('canvas.editor.commands.bold'), description: t('canvas.editor.commands.boldDesc'), action: () => `**${t('canvas.editor.examples.bold')}**` },
    { id: 'italic', icon: 'I', iconClass: 'italic-icon', label: t('canvas.editor.commands.italic'), description: t('canvas.editor.commands.italicDesc'), action: () => `*${t('canvas.editor.examples.italic')}*` },
    { id: 'strike', icon: 'S', iconClass: 'strike-icon', label: t('canvas.editor.commands.strike'), description: t('canvas.editor.commands.strikeDesc'), action: () => `~~${t('canvas.editor.examples.strikethrough')}~~` },
    { id: 'link', icon: '🔗', label: t('canvas.editor.commands.link'), description: t('canvas.editor.commands.linkDesc'), action: () => `[${t('canvas.editor.examples.text')}](${t('canvas.editor.examples.url')})` },
    { id: 'image', icon: '🖼', label: t('canvas.editor.commands.image'), description: t('canvas.editor.commands.imageDesc'), action: () => `![${t('canvas.editor.examples.description')}](${t('canvas.editor.examples.url')})` },
    { id: 'table', icon: '▦', label: t('canvas.editor.commands.table'), description: t('canvas.editor.commands.tableDesc'), action: () => `| ${t('canvas.editor.examples.col1')} | ${t('canvas.editor.examples.col2')} | ${t('canvas.editor.examples.col3')} |\n| --- | --- | --- |\n| ${t('canvas.editor.examples.content')} | ${t('canvas.editor.examples.content')} | ${t('canvas.editor.examples.content')} |` }
])

const filteredCommands = computed(() => {
    if (!slashQuery.value) return slashCommands.value
    const query = slashQuery.value.toLowerCase()
    return slashCommands.value.filter(command => command.label.toLowerCase().includes(query) || command.id.toLowerCase().includes(query) || command.description.toLowerCase().includes(query))
})

function getCaretCoordinates(position: number): { top: number; left: number } {
    const textarea = textareaRef.value
    if (!textarea) return { top: 0, left: 0 }
    const safePosition = Math.max(0, Math.min(position, textarea.value.length))
    const text = textarea.value.slice(0, safePosition)
    const lines = text.split('\n')
    const lineIndex = Math.max(0, lines.length - 1)
    const currentLine = lines[lineIndex] ?? ''
    return {
        top: lineIndex * 27 + 20,
        left: currentLine.length * 9 + 20
    }
}

function getLineRange(value: string, index: number): { start: number; end: number; text: string } {
    const start = value.lastIndexOf('\n', index - 1) + 1
    const endIndex = value.indexOf('\n', index)
    const end = endIndex === -1 ? value.length : endIndex
    return { start, end, text: value.slice(start, end) }
}

function setEditorValue(value: string, selectionStart?: number, selectionEnd?: number) {
    localContent.value = value
    emit('update', props.nodeId, value)
    nextTick(() => {
        const textarea = textareaRef.value
        if (!textarea) return
        textarea.value = value
        if (typeof selectionStart === 'number') {
            textarea.setSelectionRange(selectionStart, selectionEnd ?? selectionStart)
        }
        checkSlashCommand(textarea)
        handleCursorChange()
        textarea.focus()
    })
}

function insertSnippet(snippet: string, cursorOffsetFromStart?: number) {
    const textarea = textareaRef.value
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = localContent.value
    const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`
    const nextCursor = cursorOffsetFromStart === undefined ? start + snippet.length : start + cursorOffsetFromStart
    setEditorValue(nextValue, nextCursor)
}

function wrapSelection(prefix: string, suffix: string, placeholderText = '') {
    const textarea = textareaRef.value
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = localContent.value
    const selected = value.slice(start, end) || placeholderText
    const nextValue = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`
    const selectionStart = start + prefix.length
    const selectionEnd = selectionStart + selected.length
    setEditorValue(nextValue, selectionStart, selectionEnd)
}

function prependToCurrentLine(prefix: string) {
    const textarea = textareaRef.value
    if (!textarea) return
    const start = textarea.selectionStart
    const range = getLineRange(localContent.value, start)
    const nextValue = `${localContent.value.slice(0, range.start)}${prefix}${range.text}${localContent.value.slice(range.end)}`
    setEditorValue(nextValue, start + prefix.length)
}

function handleInput(event: Event) {
    const target = event.target as HTMLTextAreaElement
    localContent.value = target.value
    emit('update', props.nodeId, target.value)
    checkSlashCommand(target)
    handleCursorChange()
}

function syncPreviewFromEditor() {
    const textarea = textareaRef.value
    const preview = previewRef.value
    if (!textarea || !preview) return
    const metrics = editorBlockMetrics.value
    if (metrics.length === 0) return
    pendingEditorScrollTop = textarea.scrollTop
    if (previewSyncFrame !== null) return
    previewSyncFrame = requestAnimationFrame(() => {
        const lineHeight = 27
        const anchorLine = Math.max(
            0,
            Math.min(
                lineStartOffsets.value.length - 1,
                Math.floor((pendingEditorScrollTop + (textarea.clientHeight * 0.32)) / lineHeight)
            )
        )
        const visibleCharIndex = Math.min(localContent.value.length, lineStartOffsets.value[anchorLine] ?? 0)
        let safeBlockIndex = metrics.findIndex(metric => visibleCharIndex <= metric.end)
        if (safeBlockIndex === -1) safeBlockIndex = metrics.length - 1
        const currentMetric = metrics[safeBlockIndex]
        if (!currentMetric) {
            previewSyncFrame = null
            return
        }
        const currentElement = preview.querySelector<HTMLElement>(`[data-preview-block-id="${currentMetric.id}"]`)
        if (!currentElement) {
            previewSyncFrame = null
            return
        }

        const blockProgress = Math.min(1, Math.max(0, (visibleCharIndex - currentMetric.start) / currentMetric.length))
        const currentTop = currentElement.offsetTop
        const currentHeight = currentElement.offsetHeight
        const nextMetric = safeBlockIndex < metrics.length - 1 ? metrics[safeBlockIndex + 1] : undefined
        const nextElement = safeBlockIndex < metrics.length - 1
            ? preview.querySelector<HTMLElement>(`[data-preview-block-id="${nextMetric?.id ?? ''}"]`)
            : null
        const nextTop = nextElement?.offsetTop ?? currentTop + currentHeight
        const interpolatedTop = currentTop + ((nextTop - currentTop) * blockProgress)
        const targetScrollTop = Math.max(0, interpolatedTop - (preview.clientHeight * 0.16))
        syncingSource = 'editor'
        preview.scrollTop = targetScrollTop
        updateActiveOutline()
        previewSyncFrame = null
        window.setTimeout(() => {
            if (syncingSource === 'editor') syncingSource = null
        }, 24)
    })
}

function updateActiveOutline() {
    const preview = previewRef.value
    if (!preview || outlineItems.value.length === 0) {
        activeOutlineId.value = ''
        return
    }

    const previewRect = preview.getBoundingClientRect()
    let nextActive = outlineItems.value[0]?.id ?? ''
    let bestDistance = Number.POSITIVE_INFINITY

    for (const item of outlineItems.value) {
        const element = preview.querySelector<HTMLElement>(`#${item.anchorId}`)
        if (!element) continue
        const distance = Math.abs(element.getBoundingClientRect().top - previewRect.top - 28)
        if (element.getBoundingClientRect().top - previewRect.top <= 48 && distance < bestDistance) {
            bestDistance = distance
            nextActive = item.id
        }
    }

    if (bestDistance === Number.POSITIVE_INFINITY) {
        const firstVisible = outlineItems.value.find(item => {
            const element = preview.querySelector<HTMLElement>(`#${item.anchorId}`)
            return element ? element.getBoundingClientRect().bottom > previewRect.top + 48 : false
        })
        nextActive = firstVisible?.id ?? nextActive
    }

    activeOutlineId.value = nextActive
}

function handlePreviewScroll() {
    updateActiveOutline()
}

function handleEditorScroll() {
    syncPreviewFromEditor()
}

function markEditorIntent() {
    // Keep editor interactions explicit even though preview no longer drives editor scroll.
}

function markPreviewIntent() {
    // Preview is now read-follow by default; clicking can still trigger explicit jumps.
}

function createImageFallback(img: HTMLImageElement) {
    if (img.nextElementSibling?.classList.contains('preview-image-fallback')) return
    const fallback = document.createElement('div')
    fallback.className = 'preview-image-fallback'
    const alt = img.getAttribute('alt')?.trim()
    fallback.innerHTML = `
        <span class="preview-image-fallback-badge">Image unavailable</span>
        <strong>${markdownUtils.escapeHtml(alt || 'Unable to load image')}</strong>
        <span>${markdownUtils.escapeHtml(img.currentSrc || img.src || '')}</span>
    `
    img.insertAdjacentElement('afterend', fallback)
}

function decoratePreviewImages() {
    const preview = previewRef.value
    if (!preview) return

    preview.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
        if (!img.dataset.previewEnhanced) {
            img.dataset.previewEnhanced = 'true'
            img.loading = 'lazy'
            img.referrerPolicy = 'no-referrer'
            img.addEventListener('load', () => {
                img.classList.remove('is-error')
                img.nextElementSibling?.classList.contains('preview-image-fallback') && img.nextElementSibling.remove()
            })
            img.addEventListener('error', () => {
                img.classList.add('is-error')
                createImageFallback(img)
            })
        }

        if (img.complete && img.naturalWidth === 0) {
            img.classList.add('is-error')
            createImageFallback(img)
        }
    })
}

function closeImagePreview() {
    activeImagePreview.value = null
}

function readStoredViewMode(): EditorViewMode {
    if (!isMarkdown.value) return 'edit'
    try {
        const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
        if (stored === 'edit' || stored === 'split' || stored === 'preview') {
            return stored
        }
    } catch {}
    return 'split'
}

function updateLayoutMode() {
    const width = editorContainerRef.value?.clientWidth ?? window.innerWidth
    forceSingleColumn.value = width < SINGLE_COLUMN_BREAKPOINT
}

function animateScrollTop(element: HTMLElement, targetScrollTop: number, duration = 220) {
    const start = element.scrollTop
    const delta = targetScrollTop - start
    if (Math.abs(delta) < 1) {
        element.scrollTop = targetScrollTop
        return
    }

    const startTime = performance.now()
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const step = (now: number) => {
        const progress = Math.min(1, (now - startTime) / duration)
        element.scrollTop = start + (delta * easeOutCubic(progress))
        if (progress < 1) {
            requestAnimationFrame(step)
        }
    }

    requestAnimationFrame(step)
}

function focusEditorAtOffset(offset: number) {
    const textarea = textareaRef.value
    if (!textarea) return

    const safeOffset = Math.max(0, Math.min(localContent.value.length, offset))
    const lineHeight = 27
    const lineIndex = localContent.value.slice(0, safeOffset).split('\n').length - 1
    const targetScrollTop = Math.max(0, (lineIndex * lineHeight) - (textarea.clientHeight * 0.28))

    textarea.focus()
    textarea.setSelectionRange(safeOffset, safeOffset)
    animateScrollTop(textarea, targetScrollTop)
    editorSelectionStart.value = safeOffset
    awareness.updateTextCursor?.(props.nodeId, safeOffset, safeOffset)
    window.setTimeout(() => {
        syncPreviewFromEditor()
    }, 40)
}

function focusEditorAtBlock(blockId: string) {
    const metric = editorBlockMetrics.value.find(item => item.id === blockId)
    if (!metric) return
    focusEditorAtOffset(metric.start)
}

function handleOverlayPointerMove(event: MouseEvent) {
    outlineHintActive.value = event.clientX <= 120
}

function handleOverlayPointerLeave() {
    outlineHintActive.value = false
}

function handlePreviewClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null
    const image = target?.closest('img') as HTMLImageElement | null
    if (image && !image.classList.contains('is-error')) {
        activeImagePreview.value = {
            src: image.currentSrc || image.src,
            alt: image.alt || ''
        }
        nextTick(() => imageLightboxRef.value?.focus())
        return
    }

    const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
    if (anchor) {
        event.preventDefault()
        const href = anchor.href
        if (!href) return
        if (window.electron?.openExternal) {
            window.electron.openExternal(href)
            return
        }
        window.open(href, '_blank', 'noopener,noreferrer')
        return
    }

    const blockElement = target?.closest<HTMLElement>('[data-preview-block-id]')
    const blockId = blockElement?.dataset.previewBlockId
    if (!blockId) return

    focusEditorAtBlock(blockId)
}

function handlePaste(event: ClipboardEvent) {
    if (!isMarkdown.value || !textareaRef.value) return
    const clipboardText = event.clipboardData?.getData('text/plain')?.trim()
    if (!clipboardText) return
    const textarea = textareaRef.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = localContent.value.slice(start, end)

    if (/^https?:\/\//i.test(clipboardText) && selected) {
        event.preventDefault()
        const nextValue = `${localContent.value.slice(0, start)}[${selected}](${clipboardText})${localContent.value.slice(end)}`
        setEditorValue(nextValue, start + 1, start + 1 + selected.length)
        return
    }

    if (!selected && clipboardText.includes('\n') && /[{};<>]/.test(clipboardText)) {
        event.preventDefault()
        const snippet = `\`\`\`\n${clipboardText}\n\`\`\``
        setEditorValue(`${localContent.value.slice(0, start)}${snippet}${localContent.value.slice(end)}`, start + 4)
    }
}

function handleSelection() {
    handleCursorChange()
}

function handleCursorChange() {
    const textarea = textareaRef.value
    if (!textarea) return
    editorSelectionStart.value = textarea.selectionStart
    awareness.updateTextCursor?.(props.nodeId, textarea.selectionStart, textarea.selectionEnd)
}

function checkSlashCommand(textarea: HTMLTextAreaElement) {
    const cursorPos = textarea.selectionStart
    const textBefore = textarea.value.slice(0, cursorPos)
    const lastSlashIndex = textBefore.lastIndexOf('/')
    if (lastSlashIndex !== -1) {
        const charBefore = lastSlashIndex > 0 ? textBefore[lastSlashIndex - 1] : '\n'
        if (charBefore === ' ' || charBefore === '\n' || lastSlashIndex === 0) {
            const query = textBefore.slice(lastSlashIndex + 1)
            if (!query.includes(' ') && !query.includes('\n')) {
                slashQuery.value = query
                slashStartPosition.value = lastSlashIndex
                selectedCommandIndex.value = 0
                showSlashMenu.value = true
                const rect = textarea.getBoundingClientRect()
                slashMenuPosition.value = {
                    top: Math.min(108, rect.height - 360),
                    left: 20
                }
                return
            }
        }
    }
    showSlashMenu.value = false
    slashQuery.value = ''
}

function handleTabIndent(event: KeyboardEvent): boolean {
    const textarea = textareaRef.value
    if (!textarea) return false
    event.preventDefault()
    const value = localContent.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineEndIndex = value.indexOf('\n', end)
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex
    const selectedText = value.slice(lineStart, lineEnd)
    const lines = selectedText.split('\n')

    if (event.shiftKey) {
        const updatedLines = lines.map(line => line.replace(/^ {1,2}/, ''))
        const removedChars = lines.reduce((total, line) => total + (line.match(/^ {1,2}/)?.[0].length ?? 0), 0)
        const nextValue = `${value.slice(0, lineStart)}${updatedLines.join('\n')}${value.slice(lineEnd)}`
        setEditorValue(nextValue, Math.max(lineStart, start - Math.min(2, start - lineStart)), Math.max(lineStart, end - removedChars))
    } else {
        const updatedLines = lines.map(line => `  ${line}`)
        const nextValue = `${value.slice(0, lineStart)}${updatedLines.join('\n')}${value.slice(lineEnd)}`
        setEditorValue(nextValue, start + 2, end + lines.length * 2)
    }
    return true
}

function handleListContinuation(event: KeyboardEvent): boolean {
    const textarea = textareaRef.value
    if (!textarea) return false
    const value = localContent.value
    const cursor = textarea.selectionStart
    const range = getLineRange(value, cursor)
    const currentLine = range.text

    const todoMatch = currentLine.match(/^(\s*[-*+]\s\[[ xX]\]\s)(.*)$/)
    if (todoMatch) {
        event.preventDefault()
        const prefix = todoMatch[1] ?? ''
        const content = todoMatch[2] ?? ''
        const insert = content.trim() ? `\n${prefix}` : '\n'
        setEditorValue(`${value.slice(0, cursor)}${insert}${value.slice(textarea.selectionEnd)}`, cursor + insert.length)
        return true
    }

    const bulletMatch = currentLine.match(/^(\s*[-*+]\s)(.*)$/)
    if (bulletMatch) {
        event.preventDefault()
        const prefix = bulletMatch[1] ?? ''
        const content = bulletMatch[2] ?? ''
        const insert = content.trim() ? `\n${prefix}` : '\n'
        setEditorValue(`${value.slice(0, cursor)}${insert}${value.slice(textarea.selectionEnd)}`, cursor + insert.length)
        return true
    }

    const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)$/)
    if (orderedMatch) {
        event.preventDefault()
        const prefix = orderedMatch[1] ?? ''
        const number = orderedMatch[2] ?? '0'
        const content = orderedMatch[3] ?? ''
        const insert = content.trim() ? `\n${prefix}${Number(number) + 1}. ` : '\n'
        setEditorValue(`${value.slice(0, cursor)}${insert}${value.slice(textarea.selectionEnd)}`, cursor + insert.length)
        return true
    }

    const quoteMatch = currentLine.match(/^(\s*>\s?)(.*)$/)
    if (quoteMatch) {
        event.preventDefault()
        const prefix = quoteMatch[1] ?? ''
        const content = quoteMatch[2] ?? ''
        const insert = content.trim() ? `\n${prefix}` : '\n'
        setEditorValue(`${value.slice(0, cursor)}${insert}${value.slice(textarea.selectionEnd)}`, cursor + insert.length)
        return true
    }

    return false
}

function handlePairing(event: KeyboardEvent): boolean {
    const textarea = textareaRef.value
    if (!textarea || !isMarkdown.value || event.ctrlKey || event.metaKey || event.altKey) return false
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = localContent.value
    const selected = value.slice(start, end)
    const nextChar = value[start]

    if ((event.key === '"' || event.key === "'" || event.key === ')' || event.key === ']' || event.key === '}' || event.key === '`') && !selected && nextChar === event.key) {
        event.preventDefault()
        setEditorValue(value, start + 1)
        return true
    }

    if (event.key === '[') {
        event.preventDefault()
        if (selected) {
            setEditorValue(`${value.slice(0, start)}[${selected}]()${value.slice(end)}`, end + 3)
        } else {
            setEditorValue(`${value.slice(0, start)}[]()${value.slice(end)}`, start + 1)
        }
        return true
    }

    if (event.key === '`') {
        event.preventDefault()
        if (selected) {
            wrapSelection('`', '`')
        } else {
            setEditorValue(`${value.slice(0, start)}\`\`${value.slice(end)}`, start + 1)
        }
        return true
    }

    if (event.key === '$') {
        event.preventDefault()
        if (selected) {
            wrapSelection('$', '$')
        } else {
            setEditorValue(`${value.slice(0, start)}$${'$'}${value.slice(end)}`, start + 1)
        }
        return true
    }

    if (event.key === '*' && selected) {
        event.preventDefault()
        wrapSelection('**', '**')
        return true
    }

    const pairs: Record<string, string> = {
        '(': ')',
        '{': '}',
        '"': '"',
        "'": "'"
    }

    const closing = pairs[event.key]
    if (!closing) return false

    event.preventDefault()
    const nextValue = `${value.slice(0, start)}${event.key}${selected}${closing}${value.slice(end)}`
    const selectionStart = start + 1
    setEditorValue(nextValue, selectionStart, selected ? selectionStart + selected.length : selectionStart)
    return true
}

function handleKeyDown(event: KeyboardEvent) {
    if (showSlashMenu.value) {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            selectedCommandIndex.value = Math.min(selectedCommandIndex.value + 1, filteredCommands.value.length - 1)
            scrollCommandIntoView()
            return
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault()
            selectedCommandIndex.value = Math.max(selectedCommandIndex.value - 1, 0)
            scrollCommandIntoView()
            return
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault()
            const command = filteredCommands.value[selectedCommandIndex.value]
            if (command) executeCommand(command)
            return
        }
        if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            showSlashMenu.value = false
            return
        }
    }

    if (isMarkdown.value && event.key === 'Tab' && handleTabIndent(event)) return
    if (isMarkdown.value && event.key === 'Enter' && handleListContinuation(event)) return
    if (handlePairing(event)) return

    if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        handleClose()
    }
}

function scrollCommandIntoView() {
    nextTick(() => {
        const menu = slashMenuRef.value
        if (!menu) return
        menu.querySelector('.slash-menu-item.active')?.scrollIntoView({ block: 'nearest' })
    })
}

function executeCommand(command: SlashCommand) {
    const textarea = textareaRef.value
    if (!textarea) return
    const insertText = command.action()
    const before = localContent.value.slice(0, slashStartPosition.value)
    const after = localContent.value.slice(textarea.selectionStart)
    const nextValue = `${before}${insertText}${after}`
    showSlashMenu.value = false
    slashQuery.value = ''
    let nextCursor = before.length + insertText.length
    if ((insertText.includes('```') || insertText.includes('$$')) && insertText.includes('\n')) {
        nextCursor = before.length + insertText.indexOf('\n') + 1
    }
    setEditorValue(nextValue, nextCursor)
}

function setCurrentCodeFenceLanguage(language: string) {
    const context = activeCodeFence.value
    if (!context) return
    const nextValue = `${localContent.value.slice(0, context.lineStart)}\`\`\`${language}${localContent.value.slice(context.lineEnd)}`
    setEditorValue(nextValue, textareaRef.value?.selectionStart ?? context.lineEnd)
}

function scrollToOutlineItem(item: OutlineItem) {
    activeOutlineId.value = item.id
    previewRef.value?.querySelector<HTMLElement>(`#${item.anchorId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    focusEditorAtBlock(item.blockId)
}

async function renderMermaidDiagrams() {
    await nextTick()
    const preview = previewRef.value
    if (!preview) return
    const mermaidElements = preview.querySelectorAll('.mermaid')
    if (mermaidElements.length > 0) {
        try {
            const themeMode: MermaidThemeMode = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
            mermaid.initialize(getMermaidConfig(themeMode))
            await mermaid.run({
                nodes: mermaidElements as NodeListOf<HTMLElement>,
                suppressErrors: true
            })
        } catch (error) {
            console.warn('[Mermaid] Render error:', error)
        }
    }
    decoratePreviewImages()
}

function setupPreviewObserver() {
    previewObserver?.disconnect()
    previewObserver = null
    const root = previewRef.value
    if (!root) return
    if (!('IntersectionObserver' in window)) {
        visiblePreviewBlockIds.value = new Set(previewBlocks.value.map(block => block.id))
        return
    }

    previewObserver = new IntersectionObserver((entries) => {
        const nextIds = new Set(visiblePreviewBlockIds.value)
        let changed = false
        entries.forEach(entry => {
            const id = (entry.target as HTMLElement).dataset.previewBlockId
            if (!id) return
            if (entry.isIntersecting && !nextIds.has(id)) {
                nextIds.add(id)
                changed = true
            }
        })
        if (changed) visiblePreviewBlockIds.value = nextIds
    }, {
        root,
        rootMargin: '180px 0px'
    })

    root.querySelectorAll<HTMLElement>('[data-preview-block-id]').forEach(element => {
        previewObserver?.observe(element)
    })

    updateActiveOutline()
}

function handleClose() {
    awareness.updateTextCursor?.('', -1, -1)
    emit('close')
}

function getExportTheme(): ExportTheme {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function getDefaultExportFileName() {
    return sanitizeFilename(deriveDocumentTitle(localContent.value, isMarkdown.value ? 'markdown' : 'text'))
}

const exportPanelDefaults = computed<ExportPanelSettings>(() => ({
    format: isMarkdown.value ? 'pdf' : 'txt',
    fileName: getDefaultExportFileName(),
    pdfTheme: 'current',
    pdfOrientation: 'portrait',
    pdfIncludeTitle: true,
    txtMode: 'plain'
}))

function resolveExportTheme(themeMode: ExportPanelThemeMode): ExportTheme {
    return themeMode === 'current' ? getExportTheme() : themeMode
}

function handleExport() {
    if (!canExportDocument.value) {
        toast.error(t('canvas.editor.exportUnsupported'))
        return
    }

    isExportPanelOpen.value = true
}

async function handleExportConfirm(settings: ExportPanelSettings) {
    const format = settings.format
    const fileName = sanitizeFilename(settings.fileName, getDefaultExportFileName())

    try {
        const result = await exportDocument(format, {
            kind: isMarkdown.value ? 'markdown' : 'text',
            content: localContent.value,
            title: deriveDocumentTitle(localContent.value, isMarkdown.value ? 'markdown' : 'text'),
            fileName,
            theme: resolveExportTheme(settings.pdfTheme),
            includeTitle: settings.pdfIncludeTitle,
            orientation: settings.pdfOrientation,
            textMode: settings.txtMode
        })

        if (result.canceled) {
            return
        }

        if (format === 'pdf' && !window.electron?.exportDocumentPdf) {
            toast.success(t('canvas.editor.exportPdfReady'))
            return
        }

        if (result.filePath) {
            toast.success(t('canvas.editor.exportSavedTo', { path: result.filePath }))
            return
        }

        if (result.fileName) {
            toast.success(t('canvas.editor.exportSavedAs', { name: result.fileName }))
            return
        }

        if (format === 'pdf') {
            toast.success(t('canvas.editor.exportPdfSaved'))
            return
        }

        toast.success(t('canvas.toast.exportSuccess', { format: format.toUpperCase() }))
    } catch (error) {
        console.error('[NodeEditorModal] Document export failed:', error)
        toast.error(t('canvas.toast.exportFailed'))
    }
}

onMounted(() => {
    localContent.value = props.content.data || ''
    viewMode.value = readStoredViewMode()
    nextTick(() => {
        overlayRef.value?.focus()
        textareaRef.value?.focus()
        editorSelectionStart.value = textareaRef.value?.selectionStart ?? 0
        updateLayoutMode()
        setupPreviewObserver()
        renderMermaidDiagrams()
    })
    if (typeof ResizeObserver !== 'undefined' && editorContainerRef.value) {
        editorLayoutResizeObserver = new ResizeObserver(() => {
            updateLayoutMode()
        })
        editorLayoutResizeObserver.observe(editorContainerRef.value)
    } else {
        window.addEventListener('resize', updateLayoutMode)
    }
    if (!document.querySelector('link[href*="katex"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
        document.head.appendChild(link)
    }
})

watch(() => props.content.data, (newData) => {
    if (newData !== localContent.value) {
        localContent.value = newData || ''
    }
})

watch(() => props.content.kind, (kind) => {
    viewMode.value = kind === 'markdown' ? readStoredViewMode() : 'edit'
})

watch(viewMode, (mode) => {
    if (!isMarkdown.value) return
    try {
        window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
    } catch {}
})

watch(rawBlocks, async () => {
    visiblePreviewBlockIds.value = new Set()
    activeOutlineId.value = outlineItems.value[0]?.id ?? ''
    await nextTick()
    setupPreviewObserver()
    renderMermaidDiagrams()
}, { flush: 'post' })

watch(visiblePreviewBlockIds, () => {
    renderMermaidDiagrams()
}, { flush: 'post' })

watch(outlineItems, (items) => {
    if (!items.some(item => item.id === activeOutlineId.value)) {
        activeOutlineId.value = items[0]?.id ?? ''
    }
})

onUnmounted(() => {
    if (previewSyncFrame !== null) {
        cancelAnimationFrame(previewSyncFrame)
    }
    previewObserver?.disconnect()
    editorLayoutResizeObserver?.disconnect()
    window.removeEventListener('resize', updateLayoutMode)
    awareness.updateTextCursor?.('', -1, -1)
})
</script>

<style scoped>
.editor-overlay { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0, 0, 0, 0.85); }
.editor-container { width: 100%; height: 100%; max-width: 1440px; max-height: 100%; display: flex; flex-direction: column; overflow: hidden; border-radius: 16px; background: #17181c; box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5); }
.editor-header, .editor-footer { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; background: rgba(255, 255, 255, 0.03); }
.editor-header { border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.editor-footer { border-top: 1px solid rgba(255, 255, 255, 0.08); }
.header-left, .header-actions, .footer-right, .collab-users, .pane-header-row, .pane-subtools, .editor-toolbar, .preview-stats, .view-mode-switch { display: flex; align-items: center; }
.header-left { gap: 10px; }
.view-mode-switch { gap: 6px; padding: 4px; border-radius: 999px; background: rgba(255, 255, 255, 0.05); }
.view-mode-btn { min-width: 74px; height: 32px; padding: 0 14px; border: none; border-radius: 999px; background: transparent; color: rgba(255, 255, 255, 0.58); cursor: pointer; font-size: 12px; font-weight: 700; transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease; }
.view-mode-btn:hover { color: rgba(255, 255, 255, 0.9); }
.view-mode-btn.active { background: rgba(96, 165, 250, 0.18); color: #dbeafe; box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.16); }
.header-actions { gap: 10px; }
.type-icon { font-size: 20px; }
.type-label { font-size: 16px; font-weight: 600; color: rgba(255, 255, 255, 0.92); }
.collab-users { gap: 0; margin-left: 14px; padding-left: 14px; border-left: 1px solid rgba(255, 255, 255, 0.08); }
.collab-avatar { width: 28px; height: 28px; margin-left: -8px; border: 2px solid #17181c; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 700; }
.collab-avatar:first-child { margin-left: 0; }
.header-action-btn { min-width: 56px; height: 32px; padding: 0 12px; border: none; border-radius: 8px; background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.72); cursor: pointer; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; transition: background 0.15s ease, color 0.15s ease; }
.header-action-btn.primary { background: rgba(96, 165, 250, 0.16); color: #dbeafe; }
.close-btn { width: 32px; height: 32px; border: none; border-radius: 8px; background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.72); cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
.header-action-btn:hover,
.close-btn:hover { color: #fff; background: rgba(255, 255, 255, 0.14); }
.editor-body { flex: 1; min-height: 0; display: flex; overflow: hidden; }
.editor-body.split-view { gap: 1px; background: rgba(255, 255, 255, 0.08); }
.editor-body.edit-only .edit-pane,
.editor-body.preview-only .preview-pane { flex: 1 1 100%; }
.editor-body.preview-only {
    background:
        radial-gradient(circle at top, rgba(96, 165, 250, 0.08), transparent 38%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0));
}
.editor-body.split-view .edit-pane { flex: 0 1 52%; }
.editor-body.split-view .preview-pane { flex: 0 1 48%; }
.edit-pane, .preview-pane { min-width: 0; display: flex; flex: 1; flex-direction: column; position: relative; background: #17181c; }
.editor-body.preview-only .preview-pane-header { justify-content: center; padding: 18px 24px 8px; border-bottom: none; background: transparent; }
.editor-body.preview-only .preview-stats { display: none; }
.editor-body.preview-only .preview-layout { padding: 8px 28px 32px; background: transparent; }
.editor-body.preview-only .preview-content {
    width: min(100%, 940px);
    margin: 0 auto 12px;
    padding: 44px 52px 60px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 28px;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.025)),
        rgba(15, 18, 24, 0.7);
    box-shadow: 0 28px 80px rgba(0, 0, 0, 0.28);
}
.pane-header-row { justify-content: space-between; gap: 12px; padding: 10px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
.pane-header { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255, 255, 255, 0.45); }
.pane-subtools, .preview-stats { flex-wrap: wrap; gap: 8px; font-size: 11px; color: rgba(255, 255, 255, 0.42); }
.subtool-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255, 255, 255, 0.35); }
.editor-toolbar { gap: 8px; flex-wrap: wrap; padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.015)); }
.toolbar-button, .code-language-chip, .outline-item, .outline-toggle { border: none; cursor: pointer; transition: background 0.22s ease, color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease, opacity 0.22s ease; }
.toolbar-button { padding: 6px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.76); }
.toolbar-button:hover, .code-language-chip:hover, .outline-item:hover, .outline-toggle:hover { transform: translateY(-1px); background: rgba(96, 165, 250, 0.16); color: #dbeafe; box-shadow: 0 10px 24px rgba(37, 99, 235, 0.16); }
.toolbar-button-label { font-size: 12px; font-weight: 600; }
.code-language-chip { padding: 3px 9px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.72); font-size: 10px; line-height: 1.45; text-transform: lowercase; }
.code-language-chip.active { background: rgba(96, 165, 250, 0.22); color: #dbeafe; }
.textarea-wrapper { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.editor-textarea, .preview-content { width: 100%; height: 100%; padding: 20px; overflow-y: auto; font-size: 15px; line-height: 1.8; }
.editor-textarea { resize: none; border: none; outline: none; background: transparent; color: rgba(255, 255, 255, 0.92); caret-color: #60a5fa; font-family: 'JetBrains Mono', 'Fira Code', monospace; }
.editor-textarea::placeholder { color: rgba(255, 255, 255, 0.25); }
.preview-layout { position: relative; flex: 1; min-height: 0; display: flex; }
.outline-floating-shell { position: absolute; top: 50%; left: 28px; z-index: 12; display: flex; align-items: center; gap: 10px; transform: translateY(-50%); }
.outline-toggle { display: inline-flex; align-items: center; justify-content: center; width: 28px; min-height: 120px; padding: 14px 0; border-radius: 999px; opacity: 0.72; background: rgba(20, 24, 31, 0.58); color: rgba(255, 255, 255, 0.68); backdrop-filter: blur(16px); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16); }
.outline-toggle.armed { background: rgba(20, 24, 31, 0.78); color: rgba(255, 255, 255, 0.9); box-shadow: 0 16px 32px rgba(0, 0, 0, 0.22); }
.outline-toggle.open { opacity: 1; background: rgba(59, 130, 246, 0.2); color: #dbeafe; box-shadow: 0 14px 34px rgba(37, 99, 235, 0.18); }
.outline-toggle-icon { font-size: 18px; line-height: 1; }
.outline-pane { width: 240px; max-height: min(66vh, 560px); overflow-y: auto; flex-shrink: 0; display: flex; flex-direction: column; gap: 6px; padding: 14px 12px 14px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 18px; background: rgba(20, 24, 31, 0.82); box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24); backdrop-filter: blur(18px); }
.outline-header { margin-bottom: 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255, 255, 255, 0.35); }
.outline-item { width: 100%; padding: 8px 10px; border-radius: 10px; background: transparent; color: rgba(255, 255, 255, 0.68); text-align: left; font-size: 12px; line-height: 1.4; }
.outline-item.active { background: rgba(96, 165, 250, 0.16); color: #dbeafe; box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.16); }
.outline-item.level-2 { padding-left: 18px; }
.outline-item.level-3, .outline-item.level-4, .outline-item.level-5, .outline-item.level-6 { padding-left: 26px; }
.preview-content { flex: 1; min-width: 0; color: rgba(255, 255, 255, 0.92); scroll-behavior: smooth; }
.preview-empty { color: rgba(255, 255, 255, 0.34); font-style: italic; }
.preview-block { position: relative; margin-bottom: 18px; border-radius: 14px; opacity: 0; transform: translateY(10px) scale(0.992); animation: preview-block-enter 0.26s ease forwards; transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.22s ease; }
.preview-block:hover { transform: translateY(-1px); }
.preview-block.active { background: linear-gradient(135deg, rgba(96, 165, 250, 0.045), rgba(96, 165, 250, 0.015)); box-shadow: 0 0 0 1px rgba(147, 197, 253, 0.08), 0 8px 18px rgba(37, 99, 235, 0.04); }
.preview-block.is-heavy:not(.is-deferred) { background: transparent; }
.preview-block-placeholder, .preview-block-inner { border-radius: 14px; }
.preview-block-placeholder { position: relative; padding: 18px 18px 18px 20px; border: 1px solid rgba(255, 255, 255, 0.08); background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(96, 165, 250, 0.04)); color: rgba(255, 255, 255, 0.64); overflow: hidden; }
.preview-block-placeholder::before { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 15%, rgba(255, 255, 255, 0.06) 45%, transparent 75%); transform: translateX(-120%); animation: placeholder-sheen 2.4s ease-in-out infinite; }
.preview-block-placeholder p { position: relative; margin: 0; line-height: 1.6; }
.preview-block-badge { position: relative; display: inline-flex; margin-bottom: 8px; padding: 4px 8px; border-radius: 999px; background: rgba(96, 165, 250, 0.18); color: #bfdbfe; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.remote-cursor { position: absolute; z-index: 10; pointer-events: none; }
.remote-cursor-caret { width: 2px; height: 20px; animation: cursor-blink 1s ease-in-out infinite; }
.remote-cursor-label { position: absolute; top: -18px; left: 0; padding: 2px 6px; border-radius: 4px; color: #fff; font-size: 10px; font-weight: 600; white-space: nowrap; }
.remote-selection { position: absolute; top: 0; left: 2px; height: 20px; border-radius: 2px; }
.slash-menu { position: absolute; left: 20px; z-index: 30; width: min(360px, calc(100% - 40px)); overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; background: rgba(20, 20, 24, 0.96); box-shadow: 0 18px 42px rgba(0, 0, 0, 0.32); backdrop-filter: blur(16px); }
.slash-menu-header { padding: 12px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255, 255, 255, 0.42); }
.slash-menu-scroll { max-height: 320px; overflow-y: auto; padding: 8px; }
.slash-menu-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; cursor: pointer; }
.slash-menu-item:hover, .slash-menu-item.active { background: rgba(255, 255, 255, 0.06); }
.cmd-icon { width: 28px; height: 28px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.75); font-size: 12px; font-weight: 700; }
.cmd-icon.code-icon { color: #61afef; }
.cmd-icon.lang-js { color: #f7df1e; background: rgba(247, 223, 30, 0.12); }
.cmd-icon.lang-ts { color: #60a5fa; background: rgba(96, 165, 250, 0.14); }
.cmd-icon.lang-py { color: #93c5fd; background: rgba(59, 130, 246, 0.16); }
.cmd-icon.lang-css { color: #38bdf8; background: rgba(56, 189, 248, 0.16); }
.cmd-icon.lang-html { color: #fb7185; background: rgba(251, 113, 133, 0.16); }
.cmd-icon.math-icon { color: #c4b5fd; background: rgba(196, 181, 253, 0.14); }
.cmd-icon.bold-icon { font-weight: 800; }
.cmd-icon.italic-icon { font-style: italic; }
.cmd-icon.strike-icon { text-decoration: line-through; }
.cmd-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.cmd-label { color: rgba(255, 255, 255, 0.92); font-size: 13px; }
.cmd-desc { color: rgba(255, 255, 255, 0.42); font-size: 11px; }
.cmd-shortcut { padding: 2px 6px; border-radius: 4px; background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.35); font-size: 10px; font-family: 'JetBrains Mono', monospace; }
.slash-menu-empty { padding: 18px 14px; color: rgba(255, 255, 255, 0.42); text-align: center; }
.footer-hint, .char-count, .collab-indicator { font-size: 12px; }
.footer-hint, .char-count { color: rgba(255, 255, 255, 0.42); }
.collab-indicator { color: #4ade80; }
.footer-hint kbd { display: inline-block; margin: 0 3px; padding: 3px 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.1); font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.preview-content :deep(h1) { margin: 0.5em 0; font-size: 1.8em; font-weight: 700; }
.preview-content :deep(h2) { margin: 0.5em 0; font-size: 1.45em; font-weight: 700; }
.preview-content :deep(h3) { margin: 0.5em 0; font-size: 1.18em; font-weight: 700; }
.preview-content :deep(p) { margin: 0.85em 0; }
.preview-content :deep(code) { padding: 2px 6px; border-radius: 5px; background: rgba(255, 255, 255, 0.08); font-size: 0.92em; font-family: 'JetBrains Mono', monospace; }
.preview-content :deep(.hljs) { color: #d6deeb; background: transparent; }
.preview-content :deep(.hljs-keyword), .preview-content :deep(.hljs-selector-tag), .preview-content :deep(.hljs-literal), .preview-content :deep(.hljs-title.function_) { color: #c792ea; }
.preview-content :deep(.hljs-string), .preview-content :deep(.hljs-attr), .preview-content :deep(.hljs-template-string) { color: #c3e88d; }
.preview-content :deep(.hljs-number), .preview-content :deep(.hljs-symbol), .preview-content :deep(.hljs-bullet) { color: #f78c6c; }
.preview-content :deep(.hljs-comment), .preview-content :deep(.hljs-quote) { color: #7f8c98; font-style: italic; }
.preview-content :deep(.hljs-variable), .preview-content :deep(.hljs-title), .preview-content :deep(.hljs-property) { color: #82aaff; }
.preview-content :deep(.hljs-type), .preview-content :deep(.hljs-built_in), .preview-content :deep(.hljs-class .hljs-title) { color: #ffcb6b; }
.preview-content :deep(.hljs-meta), .preview-content :deep(.hljs-meta .hljs-keyword), .preview-content :deep(.hljs-doctag) { color: #89ddff; }
.preview-content :deep(.code-block-shell) { position: relative; margin: 1em 0; border-radius: 14px; background: transparent; border: none; box-shadow: none; overflow: visible; }
.preview-content :deep(.code-block-lang) { position: absolute; top: 10px; left: 12px; z-index: 1; display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.68); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.preview-content :deep(pre) { margin: 0; padding: 38px 16px 16px; overflow-x: auto; border-radius: 14px; background: rgba(15, 18, 24, 0.72); border: 1px solid rgba(255, 255, 255, 0.06); white-space: pre-wrap; }
.preview-content :deep(pre code) { display: block; padding: 0; background: transparent; white-space: pre-wrap; }
.preview-content :deep(blockquote) { margin: 1em 0; padding-left: 16px; border-left: 4px solid rgba(255, 255, 255, 0.18); color: rgba(255, 255, 255, 0.7); }
.preview-content :deep(ul), .preview-content :deep(ol) { margin: 0.8em 0; padding-left: 1.5em; }
.preview-content :deep(a) { color: #60a5fa; text-decoration: none; }
.preview-content :deep(img) { display: block; max-width: min(100%, 780px); max-height: min(52vh, 560px); width: auto; height: auto; margin: 1.1em auto; border-radius: 16px; box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18); background: rgba(255, 255, 255, 0.03); object-fit: contain; cursor: zoom-in; transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease; }
.preview-content :deep(img:hover) { transform: translateY(-1px); box-shadow: 0 22px 44px rgba(0, 0, 0, 0.22); }
.preview-content :deep(img.is-error) { display: none; }
.preview-content :deep(.preview-image-fallback) { display: flex; flex-direction: column; gap: 6px; margin: 1em auto; padding: 16px 18px; border: 1px dashed rgba(255, 255, 255, 0.18); border-radius: 14px; background: rgba(255, 255, 255, 0.03); color: rgba(255, 255, 255, 0.7); }
.preview-content :deep(.preview-image-fallback strong) { color: rgba(255, 255, 255, 0.9); font-size: 13px; }
.preview-content :deep(.preview-image-fallback span:last-child) { font-size: 12px; line-height: 1.45; word-break: break-all; }
.preview-content :deep(.preview-image-fallback-badge) { display: inline-flex; align-self: flex-start; padding: 4px 8px; border-radius: 999px; background: rgba(248, 113, 113, 0.14); color: #fecaca; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.preview-content :deep(hr) { margin: 1.5em 0; border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); }
.preview-content :deep(table) { width: 100%; margin: 1em 0; border-collapse: collapse; }
.preview-content :deep(th), .preview-content :deep(td) { padding: 8px 12px; border: 1px solid rgba(255, 255, 255, 0.1); }
.preview-content :deep(th) { font-weight: 700; background: rgba(255, 255, 255, 0.04); }
.preview-content :deep(.katex-block) { display: flex; justify-content: center; margin: 1.2em 0; padding: 1em; border-radius: 12px; background: rgba(255, 255, 255, 0.03); overflow-x: auto; }
.preview-content :deep(.katex-error) { padding: 2px 6px; border-radius: 6px; color: #fca5a5; background: rgba(239, 68, 68, 0.1); }
.preview-content :deep(.mermaid-wrapper) { position: relative; margin: 1.25em 0; padding: 38px 18px 18px; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px; background: rgba(255, 255, 255, 0.03); overflow: auto; break-inside: avoid; }
.preview-content :deep(.mermaid-block-lang) { position: absolute; top: 10px; left: 12px; z-index: 1; display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.68); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.preview-content :deep(.mermaid) { display: flex; justify-content: center; min-width: fit-content; }
.preview-content :deep(.mermaid svg) { display: block; width: auto !important; max-width: 100%; height: auto; margin: 0 auto; }
.preview-content :deep(.mermaid text),
.preview-content :deep(.mermaid .label),
.preview-content :deep(.mermaid .nodeLabel),
.preview-content :deep(.mermaid .edgeLabel),
.preview-content :deep(.mermaid .edgeLabel p),
.preview-content :deep(.mermaid .edgeLabel span),
.preview-content :deep(.mermaid .cluster-label text),
.preview-content :deep(.mermaid .cluster-label span),
.preview-content :deep(.mermaid .mindmap-node .label),
.preview-content :deep(.mermaid .mindmap-node text),
.preview-content :deep(.mermaid .mindmap-node foreignObject),
.preview-content :deep(.mermaid .mindmap-node foreignObject div) { fill: #e5eefc !important; color: #e5eefc !important; }
.preview-content :deep(.mermaid .edgeLabel rect),
.preview-content :deep(.mermaid .labelBkg) { fill: rgba(23, 24, 28, 0.92) !important; }
.preview-content :deep(.mermaid .edgePath path),
.preview-content :deep(.mermaid .flowchart-link),
.preview-content :deep(.mermaid .relationshipLine),
.preview-content :deep(.mermaid .messageLine0),
.preview-content :deep(.mermaid .messageLine1),
.preview-content :deep(.mermaid .mindmap-link),
.preview-content :deep(.mermaid .section-edge) { stroke: #8aa4d0 !important; }
.preview-content :deep(.mermaid .arrowheadPath),
.preview-content :deep(.mermaid marker path) { fill: #8aa4d0 !important; stroke: #8aa4d0 !important; }
.preview-content :deep(.mermaid .node rect),
.preview-content :deep(.mermaid .node circle),
.preview-content :deep(.mermaid .node ellipse),
.preview-content :deep(.mermaid .node polygon),
.preview-content :deep(.mermaid .node path),
.preview-content :deep(.mermaid .cluster rect),
.preview-content :deep(.mermaid .cluster polygon),
.preview-content :deep(.mermaid .mindmap-node rect),
.preview-content :deep(.mermaid .mindmap-node circle),
.preview-content :deep(.mermaid .mindmap-node path) { stroke: rgba(191, 219, 254, 0.34) !important; }
.preview-content :deep(.mermaid .cluster rect),
.preview-content :deep(.mermaid .cluster polygon) { fill: rgba(17, 26, 40, 0.78) !important; }
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 1) rect),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 1) circle),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 1) path) { fill: #26476b !important; }
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 2) rect),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 2) circle),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 2) path) { fill: #1f5a4c !important; }
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 3) rect),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 3) circle),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 3) path) { fill: #6a4f1f !important; }
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 4) rect),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 4) circle),
.preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 4) path) { fill: #4b2e67 !important; }
.preview-content::-webkit-scrollbar, .editor-textarea::-webkit-scrollbar, .slash-menu-scroll::-webkit-scrollbar { width: 8px; }
.preview-content::-webkit-scrollbar-track, .editor-textarea::-webkit-scrollbar-track, .slash-menu-scroll::-webkit-scrollbar-track { background: transparent; }
.preview-content::-webkit-scrollbar-thumb, .editor-textarea::-webkit-scrollbar-thumb, .slash-menu-scroll::-webkit-scrollbar-thumb { border-radius: 4px; background: rgba(255, 255, 255, 0.16); }
.preview-content::-webkit-scrollbar-thumb:hover, .editor-textarea::-webkit-scrollbar-thumb:hover, .slash-menu-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.24); }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-scale-enter-active { transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-scale-leave-active { transition: all 0.16s ease-in; }
.modal-scale-enter-from { opacity: 0; transform: scale(0.96); }
.modal-scale-leave-to { opacity: 0; transform: scale(0.985); }
@keyframes cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes preview-block-enter { from { opacity: 0; transform: translateY(10px) scale(0.992); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes placeholder-sheen { from { transform: translateX(-120%); } to { transform: translateX(120%); } }
.outline-float-enter-active, .outline-float-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.outline-float-enter-from, .outline-float-leave-to { opacity: 0; transform: translateX(-10px) scale(0.98); }
.image-lightbox { position: fixed; inset: 0; z-index: 10040; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 32px; background: rgba(5, 8, 14, 0.82); backdrop-filter: blur(12px); }
.image-lightbox-close { position: absolute; top: 20px; right: 24px; width: 40px; height: 40px; border: none; border-radius: 999px; background: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.88); font-size: 28px; line-height: 1; cursor: pointer; }
.image-lightbox-media { max-width: min(92vw, 1440px); max-height: calc(100vh - 120px); border-radius: 18px; box-shadow: 0 26px 60px rgba(0, 0, 0, 0.35); object-fit: contain; background: rgba(255, 255, 255, 0.04); }
.image-lightbox-caption { max-width: min(90vw, 960px); padding: 10px 14px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.86); font-size: 13px; line-height: 1.4; text-align: center; }
html[data-theme='light'] .editor-overlay { background: rgba(0, 0, 0, 0.45); }
html[data-theme='light'] .editor-container, html[data-theme='light'] .edit-pane, html[data-theme='light'] .preview-pane { background: #ffffff; }
html[data-theme='light'] .editor-container { box-shadow: 0 25px 80px rgba(0, 0, 0, 0.18); }
html[data-theme='light'] .editor-header, html[data-theme='light'] .editor-footer { background: rgba(0, 0, 0, 0.02); }
html[data-theme='light'] .editor-header, html[data-theme='light'] .pane-header-row, html[data-theme='light'] .editor-footer, html[data-theme='light'] .outline-pane { border-color: rgba(0, 0, 0, 0.08); }
html[data-theme='light'] .type-label, html[data-theme='light'] .editor-textarea, html[data-theme='light'] .preview-content, html[data-theme='light'] .cmd-label { color: rgba(0, 0, 0, 0.9); }
html[data-theme='light'] .pane-header, html[data-theme='light'] .preview-stats, html[data-theme='light'] .subtool-label, html[data-theme='light'] .outline-header, html[data-theme='light'] .footer-hint, html[data-theme='light'] .char-count, html[data-theme='light'] .cmd-desc, html[data-theme='light'] .cmd-shortcut, html[data-theme='light'] .slash-menu-header, html[data-theme='light'] .slash-menu-empty { color: rgba(0, 0, 0, 0.48); }
html[data-theme='light'] .editor-body.preview-only {
    background:
        radial-gradient(circle at top, rgba(59, 130, 246, 0.08), transparent 38%),
        linear-gradient(180deg, rgba(0, 0, 0, 0.015), rgba(0, 0, 0, 0));
}
html[data-theme='light'] .editor-body.preview-only .preview-content {
    border-color: rgba(15, 23, 42, 0.08);
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.92)),
        #ffffff;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
}
html[data-theme='light'] .view-mode-switch { background: rgba(0, 0, 0, 0.04); }
html[data-theme='light'] .view-mode-btn { color: rgba(15, 23, 42, 0.52); }
html[data-theme='light'] .view-mode-btn:hover { color: rgba(15, 23, 42, 0.84); }
html[data-theme='light'] .view-mode-btn.active { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.12); }
html[data-theme='light'] .collab-users { border-color: rgba(0, 0, 0, 0.08); }
html[data-theme='light'] .collab-avatar { border-color: #ffffff; }
html[data-theme='light'] .header-action-btn, html[data-theme='light'] .close-btn, html[data-theme='light'] .toolbar-button, html[data-theme='light'] .code-language-chip, html[data-theme='light'] .cmd-icon { background: rgba(0, 0, 0, 0.06); color: rgba(0, 0, 0, 0.72); }
html[data-theme='light'] .header-action-btn.primary { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; }
html[data-theme='light'] .toolbar-button:hover, html[data-theme='light'] .code-language-chip:hover, html[data-theme='light'] .outline-item:hover, html[data-theme='light'] .outline-toggle:hover { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; }
html[data-theme='light'] .code-language-chip.active { background: rgba(59, 130, 246, 0.16); color: #1d4ed8; }
html[data-theme='light'] .editor-body.split-view { background: rgba(0, 0, 0, 0.08); }
html[data-theme='light'] .editor-toolbar { border-color: rgba(0, 0, 0, 0.06); background: linear-gradient(180deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.015)); }
html[data-theme='light'] .editor-textarea::placeholder { color: rgba(0, 0, 0, 0.3); }
html[data-theme='light'] .outline-toggle { opacity: 0.78; background: rgba(255, 255, 255, 0.88); color: rgba(15, 23, 42, 0.62); box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08); }
html[data-theme='light'] .outline-toggle.armed { background: rgba(255, 255, 255, 0.98); color: rgba(15, 23, 42, 0.86); box-shadow: 0 14px 30px rgba(0, 0, 0, 0.12); }
html[data-theme='light'] .outline-toggle.open { opacity: 1; background: rgba(59, 130, 246, 0.14); color: #1d4ed8; }
html[data-theme='light'] .outline-pane { border-color: rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.9); }
html[data-theme='light'] .outline-item { color: rgba(0, 0, 0, 0.72); }
html[data-theme='light'] .outline-item.active { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.12); }
html[data-theme='light'] .preview-block.is-heavy:not(.is-deferred) { background: transparent; }
html[data-theme='light'] .preview-block.active { background: linear-gradient(135deg, rgba(59, 130, 246, 0.04), rgba(59, 130, 246, 0.015)); box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.07), 0 8px 18px rgba(37, 99, 235, 0.035); }
html[data-theme='light'] .preview-block-placeholder { border-color: rgba(0, 0, 0, 0.12); background: rgba(0, 0, 0, 0.02); color: rgba(0, 0, 0, 0.62); }
html[data-theme='light'] .preview-block-badge { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
html[data-theme='light'] .slash-menu { border-color: rgba(0, 0, 0, 0.12); background: rgba(255, 255, 255, 0.96); box-shadow: 0 18px 42px rgba(0, 0, 0, 0.12); }
html[data-theme='light'] .slash-menu-item:hover, html[data-theme='light'] .slash-menu-item.active { background: rgba(0, 0, 0, 0.05); }
html[data-theme='light'] .footer-hint kbd, html[data-theme='light'] .cmd-shortcut { background: rgba(0, 0, 0, 0.06); }
html[data-theme='light'] .preview-content :deep(code) { background: rgba(0, 0, 0, 0.06); }
html[data-theme='light'] .preview-content :deep(.hljs) { color: #24292f; }
html[data-theme='light'] .preview-content :deep(.hljs-keyword), html[data-theme='light'] .preview-content :deep(.hljs-selector-tag), html[data-theme='light'] .preview-content :deep(.hljs-literal), html[data-theme='light'] .preview-content :deep(.hljs-title.function_) { color: #8250df; }
html[data-theme='light'] .preview-content :deep(.hljs-string), html[data-theme='light'] .preview-content :deep(.hljs-attr), html[data-theme='light'] .preview-content :deep(.hljs-template-string) { color: #116329; }
html[data-theme='light'] .preview-content :deep(.hljs-number), html[data-theme='light'] .preview-content :deep(.hljs-symbol), html[data-theme='light'] .preview-content :deep(.hljs-bullet) { color: #bc4c00; }
html[data-theme='light'] .preview-content :deep(.hljs-comment), html[data-theme='light'] .preview-content :deep(.hljs-quote) { color: #6e7781; font-style: italic; }
html[data-theme='light'] .preview-content :deep(.hljs-variable), html[data-theme='light'] .preview-content :deep(.hljs-title), html[data-theme='light'] .preview-content :deep(.hljs-property) { color: #0550ae; }
html[data-theme='light'] .preview-content :deep(.hljs-type), html[data-theme='light'] .preview-content :deep(.hljs-built_in), html[data-theme='light'] .preview-content :deep(.hljs-class .hljs-title) { color: #953800; }
html[data-theme='light'] .preview-content :deep(.hljs-meta), html[data-theme='light'] .preview-content :deep(.hljs-meta .hljs-keyword), html[data-theme='light'] .preview-content :deep(.hljs-doctag) { color: #0a7ea4; }
html[data-theme='light'] .preview-content :deep(.code-block-shell) { background: #f3f4f6; border: none; box-shadow: none; overflow: hidden; }
html[data-theme='light'] .preview-content :deep(.code-block-lang) { background: rgba(255, 255, 255, 0.72); color: rgba(15, 23, 42, 0.52); }
html[data-theme='light'] .preview-content :deep(pre) { background: transparent; border: none; }
html[data-theme='light'] .preview-content :deep(pre code) { background: transparent; box-shadow: none; }
html[data-theme='light'] .preview-content :deep(blockquote) { border-left-color: rgba(0, 0, 0, 0.2); color: rgba(0, 0, 0, 0.68); }
html[data-theme='light'] .preview-content :deep(th), html[data-theme='light'] .preview-content :deep(td) { border-color: rgba(0, 0, 0, 0.1); }
html[data-theme='light'] .preview-content :deep(th) { background: rgba(0, 0, 0, 0.04); }
html[data-theme='light'] .preview-content :deep(hr) { border-top-color: rgba(0, 0, 0, 0.1); }
html[data-theme='light'] .preview-content :deep(img) { background: rgba(0, 0, 0, 0.02); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08); }
html[data-theme='light'] .preview-content :deep(.preview-image-fallback) { border-color: rgba(0, 0, 0, 0.14); background: rgba(0, 0, 0, 0.02); color: rgba(0, 0, 0, 0.62); }
html[data-theme='light'] .preview-content :deep(.preview-image-fallback strong) { color: rgba(0, 0, 0, 0.82); }
html[data-theme='light'] .preview-content :deep(.preview-image-fallback-badge) { background: rgba(239, 68, 68, 0.1); color: #b91c1c; }
html[data-theme='light'] .image-lightbox { background: rgba(241, 245, 249, 0.82); }
html[data-theme='light'] .image-lightbox-close { background: rgba(15, 23, 42, 0.08); color: rgba(15, 23, 42, 0.86); }
html[data-theme='light'] .image-lightbox-media { background: rgba(255, 255, 255, 0.78); box-shadow: 0 22px 52px rgba(15, 23, 42, 0.18); }
html[data-theme='light'] .image-lightbox-caption { background: rgba(255, 255, 255, 0.88); color: rgba(15, 23, 42, 0.84); }
html[data-theme='light'] .preview-content :deep(.katex-block) { background: rgba(0, 0, 0, 0.03); }
html[data-theme='light'] .preview-content :deep(.mermaid-wrapper) { border-color: rgba(0, 0, 0, 0.08); background: rgba(0, 0, 0, 0.02); }
html[data-theme='light'] .preview-content :deep(.mermaid-block-lang) { background: rgba(255, 255, 255, 0.72); color: rgba(15, 23, 42, 0.52); }
html[data-theme='light'] .preview-content :deep(.mermaid text),
html[data-theme='light'] .preview-content :deep(.mermaid .label),
html[data-theme='light'] .preview-content :deep(.mermaid .nodeLabel),
html[data-theme='light'] .preview-content :deep(.mermaid .edgeLabel),
html[data-theme='light'] .preview-content :deep(.mermaid .edgeLabel p),
html[data-theme='light'] .preview-content :deep(.mermaid .edgeLabel span),
html[data-theme='light'] .preview-content :deep(.mermaid .cluster-label text),
html[data-theme='light'] .preview-content :deep(.mermaid .cluster-label span),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node .label),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node text),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node foreignObject),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node foreignObject div) { fill: #172033 !important; color: #172033 !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .edgeLabel rect),
html[data-theme='light'] .preview-content :deep(.mermaid .labelBkg) { fill: rgba(255, 255, 255, 0.96) !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .edgePath path),
html[data-theme='light'] .preview-content :deep(.mermaid .flowchart-link),
html[data-theme='light'] .preview-content :deep(.mermaid .relationshipLine),
html[data-theme='light'] .preview-content :deep(.mermaid .messageLine0),
html[data-theme='light'] .preview-content :deep(.mermaid .messageLine1),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-link),
html[data-theme='light'] .preview-content :deep(.mermaid .section-edge) { stroke: #7a93b8 !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .arrowheadPath),
html[data-theme='light'] .preview-content :deep(.mermaid marker path) { fill: #7a93b8 !important; stroke: #7a93b8 !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .node rect),
html[data-theme='light'] .preview-content :deep(.mermaid .node circle),
html[data-theme='light'] .preview-content :deep(.mermaid .node ellipse),
html[data-theme='light'] .preview-content :deep(.mermaid .node polygon),
html[data-theme='light'] .preview-content :deep(.mermaid .node path),
html[data-theme='light'] .preview-content :deep(.mermaid .cluster rect),
html[data-theme='light'] .preview-content :deep(.mermaid .cluster polygon),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node rect),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node circle),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node path) { stroke: rgba(122, 147, 184, 0.46) !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .cluster rect),
html[data-theme='light'] .preview-content :deep(.mermaid .cluster polygon) { fill: rgba(245, 247, 251, 0.96) !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 1) rect),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 1) circle),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 1) path) { fill: #d8e7ff !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 2) rect),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 2) circle),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 2) path) { fill: #dff4ea !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 3) rect),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 3) circle),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 3) path) { fill: #fff1d6 !important; }
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 4) rect),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 4) circle),
html[data-theme='light'] .preview-content :deep(.mermaid .mindmap-node:nth-of-type(4n + 4) path) { fill: #f4e3ff !important; }
html[data-theme='light'] .preview-content::-webkit-scrollbar-thumb, html[data-theme='light'] .editor-textarea::-webkit-scrollbar-thumb, html[data-theme='light'] .slash-menu-scroll::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.14); }
html[data-theme='light'] .preview-content::-webkit-scrollbar-thumb:hover, html[data-theme='light'] .editor-textarea::-webkit-scrollbar-thumb:hover, html[data-theme='light'] .slash-menu-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.22); }
</style>

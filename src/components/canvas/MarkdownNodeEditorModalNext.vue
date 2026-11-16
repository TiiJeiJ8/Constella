<template>
    <Teleport to="body">
        <div
            v-if="isOpen"
            class="md-next-layer"
            :class="[`code-theme-${editorPreferences.codeTheme}`, { 'outline-hidden': !editorPreferences.showOutline }]"
            :style="editorPreferenceStyle"
            @click.self="closeEditor"
        >
            <section class="md-next-dialog" aria-label="Markdown editor">
                <header class="md-next-header">
                    <div>
                        <div class="md-next-title">{{ t('canvas.markdownEditor.title') }}</div>
                        <div class="md-next-meta">{{ t('canvas.markdownEditor.stats', { words: wordCount, chars: charCount }) }}</div>
                    </div>
                    <div class="md-next-actions">
                        <div class="md-next-action-group">
                            <button type="button" class="md-next-icon-btn" :title="t('canvas.markdownEditor.import')" :aria-label="t('canvas.markdownEditor.import')" :disabled="readOnlyMode" @click="triggerImport">
                                <UploadIcon />
                            </button>
                            <button type="button" class="md-next-icon-btn" :title="t('canvas.markdownEditor.export')" :aria-label="t('canvas.markdownEditor.export')" @click="openExportPanel">
                                <DownloadIcon />
                            </button>
                        </div>
                        <div class="md-next-action-group history">
                            <button type="button" class="md-next-icon-btn" :title="t('canvas.markdownEditor.undo')" :aria-label="t('canvas.markdownEditor.undo')" :disabled="readOnlyMode" @click="runUndo">
                                <RollbackIcon />
                            </button>
                            <button type="button" class="md-next-icon-btn redo" :title="t('canvas.markdownEditor.redo')" :aria-label="t('canvas.markdownEditor.redo')" :disabled="readOnlyMode" @click="runRedo">
                                <RollbackIcon />
                            </button>
                        </div>
                        <div class="md-next-action-group">
                            <button type="button" class="md-next-icon-btn" :title="t('canvas.markdownEditor.find')" :aria-label="t('canvas.markdownEditor.find')" @click="openSearch()">
                                <SearchIcon />
                            </button>
                            <button type="button" class="md-next-icon-btn" :class="{ active: settingsOpen }" :title="t('canvas.markdownEditor.settings.title')" :aria-label="t('canvas.markdownEditor.settings.title')" @click="toggleSettings">
                                <SettingIcon />
                            </button>
                            <button type="button" class="md-next-icon-btn md-next-close" :title="t('canvas.markdownEditor.close')" :aria-label="t('canvas.markdownEditor.close')" @click="closeEditor">
                                <CloseIcon />
                            </button>
                        </div>
                    </div>
                    <input
                        ref="importInputRef"
                        class="md-next-file-input"
                        type="file"
                        accept=".md,.markdown,.mdown,.mkd,text/markdown,text/plain"
                        @change="handleImportFileChange"
                    />
                </header>

                <div v-if="searchOpen" class="md-next-search" :class="{ expanded: replaceMode }" role="dialog" :aria-label="t('canvas.markdownEditor.searchPanel')">
                    <div class="md-next-search-row">
                        <button type="button" class="md-next-search-disclosure" :class="{ expanded: replaceMode }" :title="t('canvas.markdownEditor.toggleReplace')" :aria-label="t('canvas.markdownEditor.toggleReplace')" @click="replaceMode = !replaceMode">
                            <ChevronDownIcon />
                        </button>
                        <div class="md-next-search-field">
                            <input
                                ref="searchInputRef"
                                v-model="findText"
                                type="search"
                                :placeholder="t('canvas.markdownEditor.find')"
                                :aria-invalid="searchInvalid"
                                @keydown.enter.prevent="event => event.shiftKey ? findPrevious() : findNext()"
                                @keydown.esc.prevent="closeSearch"
                            />
                            <div class="md-next-inline-options">
                                <button type="button" :class="{ active: searchCaseSensitive }" :title="t('canvas.markdownEditor.caseSensitive')" :aria-pressed="searchCaseSensitive" @click="searchCaseSensitive = !searchCaseSensitive">Aa</button>
                                <button type="button" :class="{ active: searchWholeWord }" :title="t('canvas.markdownEditor.wholeWord')" :aria-pressed="searchWholeWord" @click="searchWholeWord = !searchWholeWord">ab</button>
                                <button type="button" :class="{ active: searchRegex }" :title="t('canvas.markdownEditor.regex')" :aria-pressed="searchRegex" @click="searchRegex = !searchRegex">.*</button>
                            </div>
                        </div>
                        <span class="md-next-search-count" :class="{ empty: !matchCount || searchInvalid }">{{ searchLabel }}</span>
                        <button type="button" class="md-next-search-icon" :title="t('canvas.markdownEditor.previous')" :aria-label="t('canvas.markdownEditor.previous')" :disabled="!matchCount || searchInvalid" @click="findPrevious">
                            <ChevronUpIcon />
                        </button>
                        <button type="button" class="md-next-search-icon" :title="t('canvas.markdownEditor.next')" :aria-label="t('canvas.markdownEditor.next')" :disabled="!matchCount || searchInvalid" @click="findNext">
                            <ChevronDownIcon />
                        </button>
                        <button type="button" class="md-next-search-icon" :title="t('canvas.markdownEditor.close')" :aria-label="t('canvas.markdownEditor.close')" @click="closeSearch">
                            <CloseIcon />
                        </button>
                    </div>
                    <div v-if="replaceMode" class="md-next-search-row md-next-replace-row">
                        <span class="md-next-replace-indent" />
                        <input
                            v-model="replaceText"
                            type="text"
                            :placeholder="t('canvas.markdownEditor.replaceWith')"
                            :disabled="readOnlyMode"
                            @keydown.enter.prevent="replaceOne"
                            @keydown.esc.prevent="closeSearch"
                        />
                        <button type="button" class="md-next-replace-action" :title="t('canvas.markdownEditor.replace')" :disabled="!canReplace" @click="replaceOne">AB</button>
                        <button type="button" class="md-next-replace-action" :title="t('canvas.markdownEditor.replaceAll')" :disabled="!canReplace" @click="replaceAll">AB+</button>
                    </div>
                </div>

                <div v-if="settingsOpen" class="md-next-settings" role="dialog" :aria-label="t('canvas.markdownEditor.settings.title')">
                    <div class="md-next-settings-head">
                        <div>
                            <div class="md-next-settings-title">{{ t('canvas.markdownEditor.settings.title') }}</div>
                            <div class="md-next-settings-subtitle">{{ t('canvas.markdownEditor.settings.subtitle') }}</div>
                        </div>
                        <button type="button" class="md-next-search-icon" :title="t('canvas.markdownEditor.close')" :aria-label="t('canvas.markdownEditor.close')" @click="settingsOpen = false">
                            <CloseIcon />
                        </button>
                    </div>
                    <label class="md-next-setting-row">
                        <span>{{ t('canvas.markdownEditor.settings.fontSize') }}</span>
                        <div class="md-next-setting-control">
                            <input v-model.number="editorPreferences.fontSize" type="range" min="14" max="22" step="1" @input="persistEditorPreferences" />
                            <output>{{ editorPreferences.fontSize }}px</output>
                        </div>
                    </label>
                    <label class="md-next-setting-row">
                        <span>{{ t('canvas.markdownEditor.settings.lineHeight') }}</span>
                        <div class="md-next-setting-control">
                            <input v-model.number="editorPreferences.lineHeight" type="range" min="1.4" max="2.1" step="0.05" @input="persistEditorPreferences" />
                            <output>{{ editorPreferences.lineHeight.toFixed(2) }}</output>
                        </div>
                    </label>
                    <label class="md-next-setting-row compact">
                        <span>{{ t('canvas.markdownEditor.settings.showOutline') }}</span>
                        <input v-model="editorPreferences.showOutline" type="checkbox" @change="persistEditorPreferences" />
                    </label>
                    <label class="md-next-setting-row">
                        <span>{{ t('canvas.markdownEditor.settings.codeTheme') }}</span>
                        <select v-model="editorPreferences.codeTheme" @change="persistEditorPreferences">
                            <option value="github">{{ t('canvas.markdownEditor.settings.codeThemeGithub') }}</option>
                            <option value="soft">{{ t('canvas.markdownEditor.settings.codeThemeSoft') }}</option>
                            <option value="contrast">{{ t('canvas.markdownEditor.settings.codeThemeContrast') }}</option>
                        </select>
                    </label>
                </div>

                <div class="md-next-body">
                    <main class="md-next-editor-wrap">
                        <div ref="editorRef" class="md-next-editor" />
                        <div v-if="editorError" class="md-next-error">
                            <strong>{{ t('canvas.markdownEditor.prepareFailed') }}</strong>
                            <span>{{ editorError }}</span>
                        </div>
                        <div v-else-if="!editorReady" class="md-next-loading">{{ t('canvas.markdownEditor.preparing') }}</div>
                    </main>
                    <aside v-if="editorPreferences.showOutline" ref="outlineRef" class="md-next-outline">
                        <div class="md-next-outline-title">{{ t('canvas.markdownEditor.outline') }}</div>
                        <button
                            v-for="item in outlineItems"
                            :key="item.slug"
                            type="button"
                            class="md-next-outline-item"
                            :class="{ active: item.slug === activeOutlineSlug }"
                            :style="{ paddingLeft: `${8 + (item.level - 1) * 12}px` }"
                            @click="scrollToHeading(item)"
                        >
                            {{ item.title }}
                        </button>
                        <div v-if="outlineItems.length === 0" class="md-next-empty">{{ t('canvas.markdownEditor.noHeadings') }}</div>
                    </aside>
                </div>
            </section>
            <MarkdownExportPanel
                v-model="exportPanelOpen"
                :default-settings="exportPanelDefaults"
                :supports-electron-pdf="supportsElectronPdf"
                @confirm="handleExportConfirm"
            />
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    CodeBlockLanguageSelector,
    InlineFormatToolbar,
    LinkTools,
    Muya,
    ParagraphFrontButton,
    ParagraphFrontMenu,
    ParagraphQuickInsertMenu,
    PreviewToolBar,
    TableColumnToolbar,
    TableDragBar,
    TableRowColumMenu,
    zhCN
} from '@muyajs/core'
import {
    ChevronDownIcon,
    ChevronUpIcon,
    CloseIcon,
    DownloadIcon,
    RollbackIcon,
    SearchIcon,
    SettingIcon,
    UploadIcon
} from 'tdesign-icons-vue-next'
import MarkdownExportPanel from '@/components/canvas/MarkdownExportPanel.vue'
import type { NodeContent } from '@/plugins'
import {
    createDefaultMarkdownExportSettings,
    exportMarkdownDocument,
    type MarkdownExportSettings
} from '@/utils/markdownExport'
import { deriveDocumentTitle, sanitizeFilename } from '@/utils/markdownRender'
import { useToast } from '@/utils/useToast'

const { t } = useI18n()
const toast = useToast()

const props = defineProps<{
    nodeId: string
    content: NodeContent
    allNodes?: unknown[]
    readOnly?: boolean
    canUploadAssets?: boolean
    uploadAsset?: (file: File) => Promise<string>
}>()

const emit = defineEmits<{
    (e: 'update', nodeId: string, data: string): void
    (e: 'close'): void
    (e: 'jump-to-node', nodeId: string): void
}>()

type OutlineItem = { title: string; level: number; slug: string }
type EditorCodeTheme = 'github' | 'soft' | 'contrast'
type EditorPreferences = {
    fontSize: number
    lineHeight: number
    showOutline: boolean
    codeTheme: EditorCodeTheme
}

const SEARCH_DEBOUNCE_MS = 220
const EDITOR_PREFERENCES_STORAGE_KEY = 'constella.markdownEditor.preferences.v1'
const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
    fontSize: 16,
    lineHeight: 1.72,
    showOutline: true,
    codeTheme: 'github'
}

const editorRef = ref<HTMLElement | null>(null)
const outlineRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const importInputRef = ref<HTMLInputElement | null>(null)
const isOpen = ref(true)
const editorReady = ref(false)
const editorError = ref('')
const localText = ref(props.content.data || '')
const committedText = ref(props.content.data || '')
const searchOpen = ref(false)
const replaceMode = ref(false)
const settingsOpen = ref(false)
const exportPanelOpen = ref(false)
const findText = ref('')
const replaceText = ref('')
const searchCaseSensitive = ref(false)
const searchWholeWord = ref(false)
const searchRegex = ref(false)
const matchCount = ref(0)
const activeMatch = ref(0)
const outlineItems = ref<OutlineItem[]>([])
const activeOutlineSlug = ref('')
const editorPreferences = ref<EditorPreferences>(loadEditorPreferences())

let muya: any = null
let saveTimer: number | null = null
let searchTimer: number | null = null
let outlineUpdateFrame: number | null = null
let outlineScrollFrame: number | null = null
let outlineScrollToken = 0
let pendingSelectionPayload: any = null
let applyingExternalText = false
let historyCommandToken = 0
let themeObserver: MutationObserver | null = null
let currentMermaidTheme = getEditorMermaidTheme()
let guardedEditorHost: HTMLElement | null = null

const readOnlyMode = computed(() => Boolean(props.readOnly))
const charCount = computed(() => localText.value.length)
const wordCount = computed(() => localText.value.trim().match(/[\p{L}\p{N}_-]+/gu)?.length ?? 0)
const searchLabel = computed(() => {
    if (searchInvalid.value) return t('canvas.markdownEditor.invalidRegex')
    if (!findText.value) return t('canvas.markdownEditor.searchReady')
    if (!matchCount.value) return t('canvas.markdownEditor.searchNoMatch')
    return `${activeMatch.value}/${matchCount.value}`
})
const searchInvalid = computed(() => searchRegex.value && findText.value.length > 0 && !isValidRegex(findText.value))
const searchOptions = computed(() => ({
    isCaseSensitive: searchCaseSensitive.value,
    isWholeWord: searchWholeWord.value,
    isRegexp: searchRegex.value,
    selectHighlight: false
}))
const canReplace = computed(() => Boolean(replaceMode.value && !readOnlyMode.value && matchCount.value && !searchInvalid.value))
const supportsElectronPdf = computed(() => Boolean(window.electron?.exportDocumentPdf))
const exportPanelDefaults = computed<MarkdownExportSettings>(() => ({
    ...createDefaultMarkdownExportSettings(localText.value),
    fileName: getDefaultExportFileName()
}))
const editorPreferenceStyle = computed(() => ({
    '--md-editor-user-font-size': `${editorPreferences.value.fontSize}px`,
    '--md-editor-user-line-height': String(editorPreferences.value.lineHeight)
}))

onMounted(async () => {
    window.addEventListener('keydown', handleWindowKeydown, true)
    watchAppTheme()
    await nextTick()
    createEditor()
})

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleWindowKeydown, true)
    detachReadonlyGuards()
    themeObserver?.disconnect()
    themeObserver = null
    clearScheduledSearch()
    cancelScheduledOutlineRefresh()
    cancelScheduledOutlineScroll()
    flushChanges()
    destroyEditor()
})

watch(() => props.content.data, value => {
    const nextText = value || ''
    if (nextText === localText.value) return
    localText.value = nextText
    committedText.value = nextText
    if (!muya) return
    applyingExternalText = true
    try {
        writeEditorContent(nextText, { preserveUndo: false, autoFocus: false })
    } finally {
        applyingExternalText = false
    }
    refreshOutline()
})

watch(findText, () => {
    if (searchOpen.value) scheduleSearch()
})

watch([searchCaseSensitive, searchWholeWord, searchRegex], () => {
    if (searchOpen.value) runSearch()
})

watch(() => editorPreferences.value.showOutline, visible => {
    if (visible) {
        nextTick(() => scheduleActiveOutlineScroll())
    } else {
        cancelScheduledOutlineScroll()
    }
})

watch(readOnlyMode, () => {
    applyReadonly()
})

function loadEditorPreferences(): EditorPreferences {
    try {
        const raw = window.localStorage.getItem(EDITOR_PREFERENCES_STORAGE_KEY)
        if (!raw) return { ...DEFAULT_EDITOR_PREFERENCES }
        const parsed = JSON.parse(raw) as Partial<EditorPreferences>
        return normalizeEditorPreferences(parsed)
    } catch {
        return { ...DEFAULT_EDITOR_PREFERENCES }
    }
}

function normalizeEditorPreferences(input: Partial<EditorPreferences>): EditorPreferences {
    const fontSize = Number(input.fontSize)
    const lineHeight = Number(input.lineHeight)
    const codeTheme = input.codeTheme
    return {
        fontSize: Number.isFinite(fontSize) ? Math.min(22, Math.max(14, Math.round(fontSize))) : DEFAULT_EDITOR_PREFERENCES.fontSize,
        lineHeight: Number.isFinite(lineHeight) ? Math.min(2.1, Math.max(1.4, Math.round(lineHeight * 100) / 100)) : DEFAULT_EDITOR_PREFERENCES.lineHeight,
        showOutline: typeof input.showOutline === 'boolean' ? input.showOutline : DEFAULT_EDITOR_PREFERENCES.showOutline,
        codeTheme: codeTheme === 'soft' || codeTheme === 'contrast' || codeTheme === 'github' ? codeTheme : DEFAULT_EDITOR_PREFERENCES.codeTheme
    }
}

function persistEditorPreferences() {
    editorPreferences.value = normalizeEditorPreferences(editorPreferences.value)
    try {
        window.localStorage.setItem(EDITOR_PREFERENCES_STORAGE_KEY, JSON.stringify(editorPreferences.value))
    } catch {
        // Local preference persistence is best-effort.
    }
}

function toggleSettings() {
    settingsOpen.value = !settingsOpen.value
}

function createEditor() {
    const host = editorRef.value
    if (!host) return

    editorReady.value = false
    editorError.value = ''

    try {
        installMuyaPlugins()
        const existingTools = new Set(document.body.children)
        muya = new Muya(host, {
            markdown: localText.value,
            math: true,
            frontMatter: true,
            codeBlockLineNumbers: true,
            autoPairBracket: !readOnlyMode.value,
            autoPairMarkdownSyntax: !readOnlyMode.value,
            autoPairQuote: !readOnlyMode.value,
            mermaidTheme: currentMermaidTheme,
            imageAction: persistEditorImage
        })
        muya.locale(zhCN)
        muya.on('json-change', handleEditorChange)
        muya.on('selection-change', handleSelectionChange)
        muya.init()
        // Plugins mount their tools during init(), outside the scoped editor theme.
        for (const element of Array.from(document.body.children)) {
            if (!existingTools.has(element) && element.matches('.mu-float-wrapper, .mu-front-button-wrapper')) {
                element.classList.add('ct-muya-theme')
            }
        }
        applyReadonly()
        refreshOutline()
        requestAnimationFrame(() => {
            editorReady.value = true
            if (!readOnlyMode.value) muya?.focus?.()
        })
    } catch (error) {
        console.error('[MarkdownNodeEditorModalNext] createEditor failed:', error)
        editorError.value = formatEditorError(error)
        editorReady.value = true
        muya = null
    }
}

function destroyEditor() {
    muya?.off?.('selection-change', handleSelectionChange)
    detachReadonlyGuards()
    cancelScheduledOutlineRefresh()
    cancelScheduledOutlineScroll()
    muya?.destroy?.()
    muya = null
}

function getEditorMermaidTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default'
}

function watchAppTheme() {
    themeObserver?.disconnect()
    themeObserver = new MutationObserver(() => syncMermaidTheme())
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    })
}

function syncMermaidTheme() {
    const nextTheme = getEditorMermaidTheme()
    if (nextTheme === currentMermaidTheme) return
    currentMermaidTheme = nextTheme
    if (!muya?.setOptions) return
    muya.setOptions({ mermaidTheme: nextTheme }, true)
}

function handleEditorChange() {
    if (!muya || applyingExternalText) return
    if (readOnlyMode.value) {
        restoreReadonlyContent()
        return
    }
    localText.value = muya.getMarkdown()
    refreshOutline()
    scheduleSave()
    if (searchOpen.value && findText.value) refreshSearchCount()
}

function scheduleSave() {
    if (saveTimer != null) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
        saveTimer = null
        flushChanges()
    }, 420)
}

function clearScheduledSave() {
    if (saveTimer == null) return
    window.clearTimeout(saveTimer)
    saveTimer = null
}

function flushChanges() {
    if (readOnlyMode.value) return
    const nextText = readEditorMarkdown()
    localText.value = nextText
    if (nextText === committedText.value) return
    committedText.value = nextText
    emit('update', props.nodeId, nextText)
}

function replaceEditorContent(nextText: string) {
    localText.value = nextText
    committedText.value = nextText
    clearScheduledSave()
    writeEditorContent(nextText, { preserveUndo: true, autoFocus: true })
    emit('update', props.nodeId, nextText)
    refreshOutline()
}

function readEditorMarkdown() {
    try {
        return muya?.getMarkdown?.() ?? localText.value
    } catch (error) {
        console.error('[MarkdownNodeEditorModalNext] getMarkdown failed:', error)
        return localText.value
    }
}

function writeEditorContent(nextText: string, options: { preserveUndo: boolean; autoFocus: boolean }) {
    if (!muya) {
        recreateEditorFromText(nextText)
        return
    }

    try {
        if (options.preserveUndo && typeof muya.replaceContent === 'function') {
            muya.replaceContent(nextText)
        } else {
            muya.setContent(nextText, options.autoFocus)
        }
        editorError.value = ''
        return
    } catch (error) {
        console.error('[MarkdownNodeEditorModalNext] writeEditorContent failed:', error)
    }

    try {
        muya.setContent(nextText, options.autoFocus)
        forceRenderCurrentDocument()
        editorError.value = ''
        return
    } catch (error) {
        console.error('[MarkdownNodeEditorModalNext] setContent fallback failed:', error)
        editorError.value = formatEditorError(error)
        recreateEditorFromText(nextText)
    }
}

function recreateEditorFromText(nextText: string) {
    const host = editorRef.value
    if (!host) return
    destroyEditor()
    host.replaceChildren()
    localText.value = nextText
    editorReady.value = false
    requestAnimationFrame(() => createEditor())
}

function formatEditorError(error: unknown) {
    if (error instanceof Error) {
        const stackLines = error.stack?.split('\n').slice(0, 4).join('\n')
        return stackLines || error.message || error.name
    }
    return String(error || t('canvas.markdownEditor.unknownError'))
}

function applyReadonly() {
    const host = getEditorHost()
    if (!host) return
    attachReadonlyGuards(host)
    host.classList.toggle('md-next-readonly-host', readOnlyMode.value)
    host.querySelectorAll('[contenteditable]').forEach(element => {
        element.setAttribute('contenteditable', readOnlyMode.value ? 'false' : 'true')
    })
}

function attachReadonlyGuards(host: HTMLElement) {
    if (guardedEditorHost === host) return
    detachReadonlyGuards()
    guardedEditorHost = host
    host.addEventListener('beforeinput', blockReadonlyMutation, true)
    host.addEventListener('paste', blockReadonlyMutation, true)
    host.addEventListener('cut', blockReadonlyMutation, true)
    host.addEventListener('drop', blockReadonlyMutation, true)
    host.addEventListener('keydown', blockReadonlyKeydown, true)
}

function detachReadonlyGuards() {
    const host = guardedEditorHost
    if (!host) return
    host.removeEventListener('beforeinput', blockReadonlyMutation, true)
    host.removeEventListener('paste', blockReadonlyMutation, true)
    host.removeEventListener('cut', blockReadonlyMutation, true)
    host.removeEventListener('drop', blockReadonlyMutation, true)
    host.removeEventListener('keydown', blockReadonlyKeydown, true)
    host.classList.remove('md-next-readonly-host')
    guardedEditorHost = null
}

function blockReadonlyMutation(event: Event) {
    if (!readOnlyMode.value) return
    event.preventDefault()
    event.stopPropagation()
}

function blockReadonlyKeydown(event: KeyboardEvent) {
    if (!readOnlyMode.value) return
    if (!isReadonlyMutationKey(event)) return
    event.preventDefault()
    event.stopPropagation()
}

function isReadonlyMutationKey(event: KeyboardEvent) {
    const key = event.key.toLowerCase()
    const mod = event.ctrlKey || event.metaKey
    if (mod) {
        return !['a', 'c', 'f'].includes(key)
    }
    if (event.altKey) return false
    if (key.length === 1) return true
    return [
        'backspace',
        'delete',
        'enter',
        'tab'
    ].includes(key)
}

function restoreReadonlyContent() {
    const nextText = committedText.value
    if (localText.value !== nextText) {
        localText.value = nextText
    }
    applyingExternalText = true
    try {
        writeEditorContent(nextText, { preserveUndo: false, autoFocus: false })
    } finally {
        applyingExternalText = false
    }
    applyReadonly()
    refreshOutline()
    if (searchOpen.value && findText.value) refreshSearchCount()
}

function closeEditor() {
    clearScheduledSave()
    flushChanges()
    isOpen.value = false
    window.setTimeout(() => emit('close'), 100)
}

function handleWindowKeydown(event: KeyboardEvent) {
    if (!isOpen.value) return
    const key = event.key.toLowerCase()
    const mod = event.ctrlKey || event.metaKey

    if (mod && key === 'f') {
        event.preventDefault()
        event.stopPropagation()
        openSearch()
        return
    }
    if (mod && key === 'h') {
        event.preventDefault()
        event.stopPropagation()
        openSearch(true)
        return
    }
    if (mod && key === 's') {
        event.preventDefault()
        event.stopPropagation()
        flushChanges()
        return
    }
    if (mod && key === 'z') {
        event.preventDefault()
        event.stopPropagation()
        event.shiftKey ? void runRedo() : void runUndo()
        return
    }
    if (mod && key === 'y') {
        event.preventDefault()
        event.stopPropagation()
        void runRedo()
        return
    }
    if (!mod && (event.key === 'Backspace' || event.key === 'Delete') && shouldReplaceWholeDocumentOnDelete()) {
        event.preventDefault()
        event.stopPropagation()
        replaceWholeDocumentWithHistory('')
        return
    }
    if (event.key === 'Escape') {
        searchOpen.value ? closeSearch() : closeEditor()
    }
}

function triggerImport() {
    if (readOnlyMode.value) return
    importInputRef.value?.click()
}

function resetImportInput() {
    if (importInputRef.value) {
        importInputRef.value.value = ''
    }
}

async function handleImportFileChange(event: Event) {
    if (readOnlyMode.value) {
        resetImportInput()
        return
    }

    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) {
        resetImportInput()
        return
    }

    const lowerName = file.name.toLowerCase()
    const supportedExtensions = ['.md', '.markdown', '.mdown', '.mkd']
    const hasSupportedExtension = supportedExtensions.some(extension => lowerName.endsWith(extension))
    if (!hasSupportedExtension) {
        toast.error(t('canvas.editor.importInvalidType'))
        resetImportInput()
        return
    }

    try {
        const text = (await file.text()).replace(/^\uFEFF/, '')
        replaceEditorContent(text)
        toast.success(t('canvas.editor.importSuccess', { name: file.name }))
    } catch (error) {
        console.error('[MarkdownNodeEditorModalNext] Markdown import failed:', error)
        toast.error(t('canvas.editor.importFailed'))
    } finally {
        resetImportInput()
    }
}

function getDefaultExportFileName() {
    return sanitizeFilename(deriveDocumentTitle(localText.value, 'markdown'))
}

function openExportPanel() {
    flushChanges()
    exportPanelOpen.value = true
}

async function handleExportConfirm(settings: MarkdownExportSettings) {
    const content = readEditorMarkdown()
    const fileName = sanitizeFilename(settings.fileName, getDefaultExportFileName())

    try {
        const result = await exportMarkdownDocument(content, {
            ...settings,
            fileName,
            title: settings.title || deriveDocumentTitle(content, 'markdown')
        })

        if (result.canceled) return
        if (settings.format === 'pdf' && !window.electron?.exportDocumentPdf) {
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
        toast.success(t('canvas.toast.exportSuccess', { format: settings.format.toUpperCase() }))
    } catch (error) {
        console.error('[MarkdownNodeEditorModalNext] Markdown export failed:', error)
        toast.error(t('canvas.toast.exportFailed'))
    }
}

async function persistEditorImage(state: { src?: string; alt?: string; title?: string }) {
    const src = state.src || ''
    if (!src || /^https?:\/\//i.test(src) || src.startsWith('constella://')) return src
    if (!props.uploadAsset || props.canUploadAssets === false) return src

    try {
        if (src.startsWith('data:')) {
            const file = await dataUrlToFile(src, state.alt || 'pasted-image')
            return await props.uploadAsset(file) || src
        }
    } catch (error) {
        console.error('[MarkdownNodeEditorModalNext] Image upload failed:', error)
        toast.error(t('canvas.toast.uploadFailed'))
    }

    return src
}

async function dataUrlToFile(dataUrl: string, fallbackName: string) {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    const extension = getImageExtension(blob.type)
    const safeName = sanitizeFilename(fallbackName, 'pasted-image')
    return new File([blob], `${safeName}.${extension}`, { type: blob.type || 'image/png' })
}

function getImageExtension(mimeType: string) {
    switch (mimeType) {
        case 'image/jpeg':
            return 'jpg'
        case 'image/gif':
            return 'gif'
        case 'image/webp':
            return 'webp'
        case 'image/svg+xml':
            return 'svg'
        case 'image/png':
        default:
            return 'png'
    }
}

async function syncAfterCommand() {
    await waitForAnimationFrame()
    await waitForAnimationFrame()
    if (!muya) return
    forceRenderCurrentDocument()
    await waitForAnimationFrame()
    localText.value = readEditorMarkdown()
    refreshOutline()
    scheduleSave()
    if (searchOpen.value) refreshSearchCount()
}

function forceRenderCurrentDocument() {
    if (!muya) return
    if (typeof muya.setOptions === 'function') {
        muya.setOptions({}, true)
        return
    }

    const state = muya.getState?.()
    if (state && muya.editor?.scrollPage?.updateState) {
        muya.editor.scrollPage.updateState(state)
    }
}

function waitForAnimationFrame() {
    return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

async function runHistoryCommand(action: 'undo' | 'redo') {
    if (readOnlyMode.value || !muya) return

    const token = ++historyCommandToken
    clearScheduledSave()

    // Muya batches normal typing into history on requestAnimationFrame.
    // Waiting here makes fast Ctrl+Z after typing hit the fresh undo entry.
    await waitForAnimationFrame()
    await waitForAnimationFrame()
    if (!muya || token !== historyCommandToken) return

    muya.editor?.history?.cutoff?.()
    const history = muya.editor?.history
    const canRun = action === 'undo' ? history?.canUndo?.() : history?.canRedo?.()
    if (canRun === false) return

    action === 'undo' ? muya.undo?.() : muya.redo?.()
    void syncAfterCommand()
}

function runUndo() {
    return runHistoryCommand('undo')
}

function runRedo() {
    return runHistoryCommand('redo')
}

function replaceWholeDocumentWithHistory(nextText: string) {
    if (readOnlyMode.value || !muya) return
    clearScheduledSave()
    writeEditorContent(nextText, { preserveUndo: true, autoFocus: true })
    void syncAfterCommand()
}

function shouldReplaceWholeDocumentOnDelete() {
    const host = getEditorHost()
    if (!muya || !host || readOnlyMode.value) return false
    if (!localText.value.trim()) return false

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false

    const anchorNode = selection.anchorNode
    const focusNode = selection.focusNode
    if (!anchorNode || !focusNode) return false
    if (!host.contains(anchorNode) || !host.contains(focusNode)) return false

    const selectedText = selection.toString().replace(/\r\n/g, '\n').trim()
    const documentText = host.innerText.replace(/\r\n/g, '\n').trim()
    return Boolean(selectedText && documentText && selectedText === documentText)
}

function openSearch(showReplace = false) {
    searchOpen.value = true
    replaceMode.value = showReplace || replaceMode.value
    nextTick(() => {
        searchInputRef.value?.focus()
        searchInputRef.value?.select()
        runSearch()
    })
}

function closeSearch() {
    clearScheduledSearch()
    muya?.search?.('', { selectHighlight: false })
    searchOpen.value = false
    matchCount.value = 0
    activeMatch.value = 0
    requestAnimationFrame(() => muya?.focus?.())
}

function runSearch() {
    clearScheduledSearch()
    if (!muya) return
    if (searchInvalid.value) {
        muya.search('', { selectHighlight: false })
        matchCount.value = 0
        activeMatch.value = 0
        return
    }
    muya.search(findText.value, searchOptions.value)
    refreshSearchCount()
}

function scheduleSearch() {
    clearScheduledSearch()
    searchTimer = window.setTimeout(() => {
        searchTimer = null
        runSearch()
    }, SEARCH_DEBOUNCE_MS)
}

function clearScheduledSearch() {
    if (searchTimer === null) return
    window.clearTimeout(searchTimer)
    searchTimer = null
}

function refreshSearchCount() {
    const searchModule = muya?.editor?.searchModule
    const matches = searchModule?.matches
    const index = searchModule?.index
    matchCount.value = Array.isArray(matches) ? matches.length : 0
    activeMatch.value = matchCount.value && typeof index === 'number' ? index + 1 : 0
}

function findNext() {
    if (!muya || !findText.value || searchInvalid.value) return
    if (searchTimer !== null) runSearch()
    muya.find('next')
    refreshSearchCount()
}

function findPrevious() {
    if (!muya || !findText.value || searchInvalid.value) return
    if (searchTimer !== null) runSearch()
    muya.find('previous')
    refreshSearchCount()
}

function replaceOne() {
    if (!canReplace.value || !muya) return
    if (searchTimer !== null) runSearch()
    muya.replace(replaceText.value, {
        ...searchOptions.value,
        isSingle: true
    })
    void syncAfterCommand()
}

function replaceAll() {
    if (!canReplace.value || !muya) return
    if (searchTimer !== null) runSearch()
    const replacedCount = matchCount.value
    muya.replace(replaceText.value, {
        ...searchOptions.value,
        isSingle: false
    })
    if (replacedCount) {
        toast.success(t('canvas.markdownEditor.replaceCount', { count: replacedCount }))
    }
    void syncAfterCommand()
}

function isValidRegex(value: string) {
    try {
        new RegExp(value)
        return true
    } catch {
        return false
    }
}

function refreshOutline() {
    const toc = muya?.getTOC?.() || []
    outlineItems.value = toc.map((item: any, index: number) => ({
        title: String(item.content || item.text || '').trim() || t('canvas.markdownEditor.untitledHeading'),
        level: Number(item.lvl || item.level || 1),
        slug: String(item.slug || `heading-${index}`)
    }))
    scheduleActiveOutlineRefresh()
}

function scrollToHeading(item: OutlineItem) {
    const resolved = resolveOutlineHeading(item)
    if (!resolved.target) return

    setActiveOutlineSlug(item.slug, false)
    const focusedBlock = focusHeadingByOutlineIndex(resolved.index)
    window.requestAnimationFrame(() => {
        scrollEditorToHeading((focusedBlock?.domNode as HTMLElement | null) || resolved.target)
    })
}

function cleanHeading(text: string) {
    return text.replace(/^#+\s*/, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function getEditorHost() {
    return (muya?.domNode instanceof HTMLElement ? muya.domNode : editorRef.value) as HTMLElement | null
}

function resolveOutlineHeading(item: OutlineItem) {
    const host = getEditorHost()
    const headings = host ? Array.from(host.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')) : []
    const index = outlineItems.value.findIndex(candidate => candidate.slug === item.slug)
    const indexedTarget = index >= 0 ? headings[index] : null
    const fallbackTarget = headings.find(heading => cleanHeading(heading.innerText) === cleanHeading(item.title)) || null
    const block = index >= 0 ? getTopLevelHeadingBlocks()[index] || null : null

    return {
        index,
        target: indexedTarget || fallbackTarget,
        block
    }
}

function scrollEditorToHeading(target: HTMLElement | null, behavior: ScrollBehavior = 'smooth') {
    const host = getEditorHost()
    if (!host || !target) return

    const topGap = 24
    const hostRect = host.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    host.scrollTo({
        top: Math.max(0, host.scrollTop + targetRect.top - hostRect.top - topGap),
        behavior
    })
}

function focusHeadingByOutlineIndex(index: number) {
    if (index < 0) return null

    const block = getTopLevelHeadingBlocks()[index]
    const content = block?.firstContentInDescendant?.() || block?.children?.head
    if (!content?.setCursor) return block || null

    const offset = getHeadingCursorOffset(block, content)
    content.domNode?.focus?.({ preventScroll: true })
    content.setCursor(offset, offset, true)
    return block || null
}

function getHeadingCursorOffset(block: any, content: any) {
    if (block?.blockName !== 'atx-heading') return 0
    return /^ {0,3}#{1,6}(?:\s+|$)/.exec(String(content?.text || ''))?.[0].length ?? 0
}

function handleSelectionChange(payload?: any) {
    scheduleActiveOutlineRefresh(payload)
}

function scheduleActiveOutlineRefresh(payload?: any) {
    if (payload) pendingSelectionPayload = payload
    if (outlineUpdateFrame != null) return

    outlineUpdateFrame = window.requestAnimationFrame(() => {
        outlineUpdateFrame = null
        refreshActiveOutline(pendingSelectionPayload)
        pendingSelectionPayload = null
    })
}

function cancelScheduledOutlineRefresh() {
    if (outlineUpdateFrame == null) return
    window.cancelAnimationFrame(outlineUpdateFrame)
    outlineUpdateFrame = null
    pendingSelectionPayload = null
}

function refreshActiveOutline(payload?: any) {
    if (!outlineItems.value.length) {
        setActiveOutlineSlug('', false)
        return
    }

    const activeBlock = payload?.focusBlock
        || payload?.anchorBlock
        || muya?.editor?.activeContentBlock
        || muya?.editor?.selection?.focusBlock
        || muya?.editor?.selection?.anchorBlock
    const activeHeading = findOwningHeadingBlock(activeBlock)
    const slug = activeHeading ? getOutlineSlugForHeadingBlock(activeHeading) : getOutlineSlugFromDomSelection()
    setActiveOutlineSlug(slug || '', true)
}

function setActiveOutlineSlug(slug: string, shouldFollow: boolean) {
    const changed = activeOutlineSlug.value !== slug
    activeOutlineSlug.value = slug
    if (slug && shouldFollow && (changed || !isActiveOutlineItemVisible())) {
        scheduleActiveOutlineScroll()
    }
}

function scheduleActiveOutlineScroll() {
    const token = ++outlineScrollToken
    if (outlineScrollFrame != null) window.cancelAnimationFrame(outlineScrollFrame)

    void nextTick(() => {
        if (token !== outlineScrollToken) return
        outlineScrollFrame = window.requestAnimationFrame(() => {
            outlineScrollFrame = null
            if (token !== outlineScrollToken) return
            scrollActiveOutlineItemIntoView()
        })
    })
}

function cancelScheduledOutlineScroll() {
    outlineScrollToken += 1
    if (outlineScrollFrame == null) return
    window.cancelAnimationFrame(outlineScrollFrame)
    outlineScrollFrame = null
}

function scrollActiveOutlineItemIntoView() {
    const outline = outlineRef.value
    const activeItem = outline?.querySelector<HTMLElement>('.md-next-outline-item.active')
    if (!outline || !activeItem) return

    const margin = 14
    const outlineRect = outline.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()
    const upperLimit = outlineRect.top + margin
    const lowerLimit = outlineRect.bottom - margin

    if (itemRect.top < upperLimit) {
        outline.scrollTo({
            top: outline.scrollTop - (upperLimit - itemRect.top),
            behavior: 'smooth'
        })
    } else if (itemRect.bottom > lowerLimit) {
        outline.scrollTo({
            top: outline.scrollTop + (itemRect.bottom - lowerLimit),
            behavior: 'smooth'
        })
    }
}

function isActiveOutlineItemVisible() {
    const outline = outlineRef.value
    const activeItem = outline?.querySelector<HTMLElement>('.md-next-outline-item.active')
    if (!outline || !activeItem) return false

    const margin = 14
    const outlineRect = outline.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()
    return itemRect.top >= outlineRect.top + margin && itemRect.bottom <= outlineRect.bottom - margin
}

function findOwningHeadingBlock(block: any) {
    const topBlock = block?.outMostBlock || findOutMostBlock(block)
    if (!topBlock) return null
    if (isOutlineHeadingBlock(topBlock)) return topBlock

    let cursor = topBlock.prev
    while (cursor) {
        if (isOutlineHeadingBlock(cursor)) return cursor
        cursor = cursor.prev
    }

    return null
}

function findOutMostBlock(block: any) {
    let cursor = block
    while (cursor?.parent && !cursor.parent.isScrollPage) {
        cursor = cursor.parent
    }
    return cursor || null
}

function getOutlineSlugForHeadingBlock(headingBlock: any) {
    const headingBlocks = getTopLevelHeadingBlocks()
    const headingIndex = headingBlocks.indexOf(headingBlock)
    return headingIndex >= 0 ? outlineItems.value[headingIndex]?.slug || '' : ''
}

function getTopLevelHeadingBlocks() {
    const children = muya?.editor?.scrollPage?.children
    if (!children) return []

    if (typeof children.iterator === 'function') {
        return Array.from(children.iterator()).filter(isOutlineHeadingBlock)
    }

    const headings = []
    let cursor = children.head
    while (cursor) {
        if (isOutlineHeadingBlock(cursor)) headings.push(cursor)
        cursor = cursor.next
    }
    return headings
}

function isOutlineHeadingBlock(block: any) {
    return block?.blockName === 'atx-heading' || block?.blockName === 'setext-heading'
}

function getOutlineSlugFromDomSelection() {
    const host = getEditorHost()
    const selection = document.getSelection()
    const anchorNode = selection?.anchorNode
    if (!host || !anchorNode || !host.contains(anchorNode)) return ''

    const anchorElement = anchorNode.nodeType === Node.ELEMENT_NODE
        ? anchorNode as Element
        : anchorNode.parentElement
    const currentElement = anchorElement?.closest('h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,table,.mu-content')
    if (!currentElement) return ''

    const headings = Array.from(host.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6'))
    let activeIndex = -1
    for (let index = 0; index < headings.length; index += 1) {
        const heading = headings[index]
        if (!heading) continue
        if (heading === currentElement || heading.contains(currentElement)) {
            activeIndex = index
            break
        }

        if (heading.compareDocumentPosition(currentElement) & Node.DOCUMENT_POSITION_FOLLOWING) {
            activeIndex = index
            continue
        }

        break
    }

    return activeIndex >= 0 ? outlineItems.value[activeIndex]?.slug || '' : ''
}

function installMuyaPlugins() {
    const ctor = Muya as typeof Muya & { __constellaNextPlugins?: boolean }
    if (ctor.__constellaNextPlugins) return
    ctor.__constellaNextPlugins = true
    Muya.use(InlineFormatToolbar)
    Muya.use(CodeBlockLanguageSelector)
    Muya.use(LinkTools, {
        jumpClick: (linkInfo: { href?: string } | null) => {
            const href = linkInfo?.href
            if (!href || !/^https?:\/\//.test(href)) return
            window.electron?.openExternal?.(href) ?? window.open(href, '_blank', 'noopener,noreferrer')
        }
    })
    Muya.use(ParagraphFrontButton)
    Muya.use(ParagraphFrontMenu)
    Muya.use(ParagraphQuickInsertMenu)
    Muya.use(TableColumnToolbar)
    Muya.use(TableDragBar)
    Muya.use(TableRowColumMenu)
    Muya.use(PreviewToolBar)
}
</script>

<style scoped src="./MarkdownNodeEditorModalNext.theme.css"></style>
<style scoped src="./MarkdownNodeEditorModalNext.css"></style>
<style scoped src="./MarkdownNodeEditorModalNext.muya.css"></style>
<style scoped src="./MarkdownNodeEditorModalNext.syntax.css"></style>

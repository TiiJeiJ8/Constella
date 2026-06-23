<template>
    <Teleport to="body">
        <div v-if="isOpen" class="md-next-layer" @click.self="closeEditor">
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

                <div class="md-next-body">
                    <main class="md-next-editor-wrap">
                        <div ref="editorRef" class="md-next-editor" />
                        <div v-if="editorError" class="md-next-error">
                            <strong>{{ t('canvas.markdownEditor.prepareFailed') }}</strong>
                            <span>{{ editorError }}</span>
                        </div>
                        <div v-else-if="!editorReady" class="md-next-loading">{{ t('canvas.markdownEditor.preparing') }}</div>
                    </main>
                    <aside ref="outlineRef" class="md-next-outline">
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
const SEARCH_DEBOUNCE_MS = 220

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

watch(readOnlyMode, () => {
    applyReadonly()
})

function createEditor() {
    const host = editorRef.value
    if (!host) return

    editorReady.value = false
    editorError.value = ''

    try {
        installMuyaPlugins()
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

<style scoped>
.md-next-layer {
    --md-editor-backdrop: var(--dialog-backdrop);
    --md-editor-panel: var(--dialog-bg);
    --md-editor-shell: var(--dialog-bg);
    --md-editor-workspace: var(--bg-primary);
    --md-editor-text: var(--dialog-text);
    --md-editor-muted: var(--dialog-muted);
    --md-editor-faint: var(--dialog-placeholder);
    --md-editor-border: var(--dialog-border);
    --md-editor-control-border: var(--dialog-control-border);
    --md-editor-control-bg: var(--dialog-control-bg);
    --md-editor-control-hover: var(--dialog-control-hover);
    --md-editor-control-active: var(--dialog-focus);
    --md-editor-accent: var(--dialog-primary);
    --md-editor-code-bg: rgba(15, 23, 42, 0.06);
    --md-editor-quote-bg: rgba(15, 23, 42, 0.035);
    --md-editor-selection: var(--dialog-focus);
    --md-editor-focus: var(--dialog-focus);
    --md-editor-shadow: var(--dialog-shadow);
    --themeColor: var(--md-editor-accent);
    --highlightColor: color-mix(in srgb, var(--md-editor-accent) 42%, transparent);
    --selectionColor: var(--md-editor-selection);
    --editorColor: var(--md-editor-text);
    --editorColor80: color-mix(in srgb, var(--md-editor-text) 84%, transparent);
    --editorColor60: color-mix(in srgb, var(--md-editor-text) 68%, transparent);
    --editorColor50: color-mix(in srgb, var(--md-editor-text) 58%, transparent);
    --editorColor40: color-mix(in srgb, var(--md-editor-text) 48%, transparent);
    --editorColor30: color-mix(in srgb, var(--md-editor-text) 42%, transparent);
    --editorColor10: color-mix(in srgb, var(--md-editor-text) 16%, transparent);
    --editorColor04: color-mix(in srgb, var(--md-editor-text) 7%, transparent);
    --editorBgColor: var(--md-editor-workspace);
    --deleteColor: var(--dialog-danger);
    --iconColor: var(--md-editor-muted);
    --codeBgColor: var(--md-editor-code-bg);
    --codeBlockBgColor: var(--md-editor-code-bg);
    --inputBgColor: var(--md-editor-control-bg);
    --tableBorderColor: var(--md-editor-border);
    --buttonFontColor: var(--md-editor-muted);
    --buttonBgColor: var(--md-editor-control-bg);
    --buttonBorder: 1px solid var(--md-editor-control-border);
    --buttonBgColorHover: var(--md-editor-control-hover);
    --buttonBorderHover: 1px solid color-mix(in srgb, var(--md-editor-accent) 36%, transparent);
    --buttonBgColorActive: var(--md-editor-control-active);
    --buttonBorderActive: var(--buttonBorder);
    --floatFontColor: var(--md-editor-text);
    --floatBgColor: var(--md-editor-panel);
    --floatHoverColor: var(--md-editor-control-hover);
    --floatBorderColor: var(--md-editor-border);
    --floatShadow: rgba(15, 23, 42, 0.18);
    --linkColor: var(--md-editor-accent);
    --headingColor: var(--md-editor-text);
    --h1Color: var(--md-editor-text);
    --h2Color: var(--md-editor-text);
    --h3Color: var(--md-editor-text);
    --h4Color: var(--md-editor-text);
    --h5Color: var(--md-editor-text);
    --h6Color: var(--md-editor-text);
    --blockquoteTextColor: color-mix(in srgb, var(--md-editor-text) 72%, transparent);
    --blockquoteBorderColor: var(--md-editor-accent);
    --hrColor: var(--md-editor-border);
    --strongColor: var(--md-editor-text);
    --emColor: var(--md-editor-accent);
    --listMarkerColor: var(--md-editor-accent);
    --theme-color: var(--themeColor);
    --highlight-color: var(--highlightColor);
    --selection-color: var(--selectionColor);
    --editor-color: var(--editorColor);
    --editor-color-80: var(--editorColor80);
    --editor-color-60: var(--editorColor60);
    --editor-color-50: var(--editorColor50);
    --editor-color-40: var(--editorColor40);
    --editor-color-30: var(--editorColor30);
    --editor-color-10: var(--editorColor10);
    --editor-color-04: var(--editorColor04);
    --editor-bg-color: var(--editorBgColor);
    --delete-color: var(--deleteColor);
    --icon-color: var(--iconColor);
    --code-bg-color: var(--codeBgColor);
    --code-block-bg-color: var(--codeBlockBgColor);
    --input-bg-color: var(--inputBgColor);
    --table-border-color: var(--tableBorderColor);
    --button-font-color: var(--buttonFontColor);
    --button-bg-color: var(--buttonBgColor);
    --button-border: var(--buttonBorder);
    --button-bg-color-hover: var(--buttonBgColorHover);
    --button-border-hover: var(--buttonBorderHover);
    --button-bg-color-active: var(--buttonBgColorActive);
    --button-border-active: var(--buttonBorderActive);
    --button-border-focus: var(--buttonBorderHover);
    --float-font-color: var(--floatFontColor);
    --float-bg-color: var(--floatBgColor);
    --float-hover-color: var(--floatHoverColor);
    --float-border-color: var(--floatBorderColor);
    --float-shadow: var(--floatShadow);
    --link-color: var(--linkColor);
    --heading-color: var(--headingColor);
    --h1-color: var(--h1Color);
    --h2-color: var(--h2Color);
    --h3-color: var(--h3Color);
    --h4-color: var(--h4Color);
    --h5-color: var(--h5Color);
    --h6-color: var(--h6Color);
    --blockquote-text-color: var(--blockquoteTextColor);
    --blockquote-border-color: var(--blockquoteBorderColor);
    --strong-color: var(--strongColor);
    --em-color: var(--emColor);
    --list-marker-color: var(--listMarkerColor);
    --hr-color: var(--hrColor);
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: var(--md-editor-backdrop);
    backdrop-filter: blur(8px);
    animation: md-next-fade-in 140ms ease-out;
}

.md-next-dialog {
    position: relative;
    width: min(1280px, calc(100vw - 48px));
    height: min(880px, calc(100vh - 48px));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--md-editor-control-border);
    border-radius: 8px;
    background: var(--md-editor-shell);
    color: var(--md-editor-text);
    box-shadow: var(--md-editor-shadow);
    animation: md-next-pop-in 180ms cubic-bezier(0.2, 0.9, 0.2, 1);
}

.md-next-header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--md-editor-border);
    background: var(--md-editor-panel);
    min-height: 54px;
    box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03);
}

.md-next-title {
    font-size: 15px;
    font-weight: 760;
    letter-spacing: 0;
}

.md-next-meta,
.md-next-empty {
    color: var(--md-editor-muted);
    font-size: 12px;
}

.md-next-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.md-next-action-group {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px;
    border: 1px solid var(--md-editor-border);
    border-radius: 8px;
    background: color-mix(in srgb, var(--md-editor-shell) 78%, var(--md-editor-panel));
}

.md-next-action-group.history {
    margin-left: 4px;
    margin-right: 4px;
}

.md-next-file-input {
    display: none;
}

.md-next-icon-btn,
.md-next-search button {
    height: 32px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--md-editor-muted);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
}

.md-next-icon-btn {
    width: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
}

.md-next-icon-btn svg {
    width: 17px;
    height: 17px;
}

.md-next-icon-btn.redo svg {
    transform: scaleX(-1);
}

.md-next-icon-btn:disabled,
.md-next-search button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.md-next-icon-btn:not(:disabled):hover,
.md-next-search button:not(:disabled):hover {
    border-color: color-mix(in srgb, var(--md-editor-accent) 32%, transparent);
    background: var(--md-editor-control-hover);
    color: var(--md-editor-accent);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
}

.md-next-icon-btn:not(:disabled):active,
.md-next-search button:not(:disabled):active {
    transform: translateY(0);
    box-shadow: none;
}

.md-next-close {
    width: 32px;
    padding: 0;
    line-height: 1;
}

.md-next-search {
    position: absolute;
    top: 58px;
    right: 8px;
    z-index: 12;
    width: min(460px, calc(100% - 16px));
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 5px 6px;
    border-left: 2px solid var(--md-editor-border);
    border-radius: 0 0 0 6px;
    background: var(--floatBgColor);
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.14);
    backdrop-filter: blur(10px);
    animation: md-next-search-in 120ms ease-out;
}

.md-next-search-row {
    display: flex;
    align-items: center;
    gap: 3px;
    min-height: 24px;
}

.md-next-search button {
    height: 24px;
    border: 0;
    border-radius: 3px;
    color: var(--md-editor-muted);
    font-size: 12px;
}

.md-next-search button:not(:disabled):hover {
    background: color-mix(in srgb, var(--md-editor-control-hover) 82%, transparent);
    color: var(--md-editor-text);
    transform: none;
    box-shadow: none;
}

.md-next-search-disclosure {
    flex: 0 0 auto;
    width: 23px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.md-next-search-disclosure svg {
    width: 14px;
    height: 14px;
    transition: transform 120ms ease;
}

.md-next-search-disclosure:not(.expanded) svg {
    transform: rotate(-90deg);
}

.md-next-search-field {
    min-width: 0;
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    gap: 4px;
    height: 25px;
    padding: 0 2px 0 7px;
    border: 0;
    border-radius: 4px;
    background: var(--md-editor-control-bg);
    transition: box-shadow 120ms ease, background 120ms ease;
}

.md-next-search-field:focus-within {
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-editor-accent) 56%, transparent);
}

.md-next-search input {
    min-width: 0;
    height: 25px;
    padding: 0 7px;
    border: 0;
    border-radius: 4px;
    background: var(--md-editor-control-bg);
    color: var(--md-editor-text);
    font-size: 12px;
    outline: none;
    transition: box-shadow 120ms ease, background 120ms ease;
}

.md-next-search-field input {
    flex: 1 1 auto;
    height: 23px;
    padding: 0;
    background: transparent;
    box-shadow: none;
}

.md-next-search input:focus {
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-editor-accent) 56%, transparent);
}

.md-next-search-field input:focus {
    box-shadow: none;
}

.md-next-search input[aria-invalid="true"] {
    color: #f87171;
}

.md-next-inline-options {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 1px;
}

.md-next-inline-options button {
    min-width: 21px;
    height: 21px;
    padding: 0 3px;
    font-weight: 700;
    line-height: 1;
}

.md-next-inline-options button.active {
    background: color-mix(in srgb, var(--md-editor-accent) 22%, transparent);
    color: var(--md-editor-text);
    box-shadow: inset 0 -1px 0 var(--md-editor-accent);
}

.md-next-search-count {
    flex: 0 0 auto;
    min-width: 74px;
    padding: 0 3px;
    color: var(--md-editor-muted);
    font-size: 12px;
    text-align: left;
    white-space: nowrap;
}

.md-next-search-count.empty {
    color: var(--md-editor-faint);
}

.md-next-search-icon {
    width: 24px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.md-next-search-icon svg {
    width: 14px;
    height: 14px;
}

.md-next-search-icon.active,
.md-next-replace-action.active {
    border-color: color-mix(in srgb, var(--md-editor-accent) 42%, transparent);
    background: color-mix(in srgb, var(--md-editor-accent) 16%, transparent);
    color: var(--md-editor-accent);
}

.md-next-replace-row input {
    flex: 1 1 auto;
    margin-left: 0;
}

.md-next-replace-indent {
    flex: 0 0 auto;
    width: 23px;
}

.md-next-replace-action {
    min-width: 26px;
    padding: 0 4px;
    white-space: nowrap;
    font-weight: 750;
}

.md-next-body {
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 240px;
}

.md-next-editor-wrap {
    position: relative;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--md-editor-panel);
}

.md-next-editor {
    height: 100%;
    overflow: auto;
    scroll-behavior: smooth;
    background: var(--md-editor-workspace);
}

.md-next-editor :deep(.mu-container) {
    max-width: 900px;
    min-height: 100%;
    margin: 0 auto;
    padding: 42px 52px 72px;
    color: var(--md-editor-text);
    font-size: 16px;
    line-height: 1.72;
    transition: max-width 160ms ease, padding 160ms ease;
}

.md-next-editor :deep(.mu-container),
.md-next-editor :deep(.mu-editor),
.md-next-editor :deep(.mu-content),
.md-next-editor :deep(.ag-root),
.md-next-editor :deep(.ag-editor) {
    background: var(--md-editor-workspace) !important;
}

.md-next-editor :deep(.mu-paragraph),
.md-next-editor :deep(.mu-paragraph span),
.md-next-editor :deep(.mu-paragraph li),
.md-next-editor :deep(.mu-paragraph p),
.md-next-editor :deep(.ag-container) {
    color: inherit;
}

.md-next-editor :deep(h1),
.md-next-editor :deep(h2),
.md-next-editor :deep(h3),
.md-next-editor :deep(h4),
.md-next-editor :deep(h5),
.md-next-editor :deep(h6),
.md-next-editor :deep(.ag-heading),
.md-next-editor :deep(.ag-header),
.md-next-editor :deep(.mu-heading) {
    color: var(--md-editor-text) !important;
    letter-spacing: 0;
}

.md-next-editor :deep(p),
.md-next-editor :deep(li),
.md-next-editor :deep(ol),
.md-next-editor :deep(ul),
.md-next-editor :deep(.ag-paragraph),
.md-next-editor :deep(.ag-list),
.md-next-editor :deep(.ag-list-item),
.md-next-editor :deep(.mu-paragraph) {
    color: var(--md-editor-text) !important;
}

.md-next-editor :deep(a) {
    color: var(--md-editor-accent) !important;
}

.md-next-editor :deep(:not(pre) > code),
.md-next-editor :deep(.ag-inline-code) {
    color: var(--md-editor-text) !important;
    background: var(--md-editor-code-bg);
}

.md-next-editor :deep(pre),
.md-next-editor :deep(.mu-code-block),
.md-next-editor :deep(.mu-diagram-container),
.md-next-editor :deep(.mu-frontmatter),
.md-next-editor :deep(.mu-html-container),
.md-next-editor :deep(.mu-math-container),
.md-next-editor :deep(.ag-code-block),
.md-next-editor :deep(.ag-fence) {
    color: color-mix(in srgb, var(--md-editor-text) 84%, transparent);
    background: var(--md-editor-code-bg);
    font-weight: 400;
}

.md-next-editor :deep(.mu-code),
.md-next-editor :deep(.mu-codeblock-content),
.md-next-editor :deep(code[class*='language-']) {
    color: color-mix(in srgb, var(--md-editor-text) 86%, transparent);
    background: transparent !important;
    font-family: 'Cascadia Mono', Consolas, 'SFMono-Regular', Menlo, monospace;
    font-weight: 400 !important;
    white-space: pre;
    word-break: normal;
    overflow-wrap: normal;
    tab-size: 4;
}

.md-next-editor :deep(blockquote),
.md-next-editor :deep(.ag-blockquote) {
    color: var(--md-editor-text) !important;
    border-left-color: var(--md-editor-border) !important;
    background: var(--md-editor-quote-bg);
}

.md-next-editor :deep(table),
.md-next-editor :deep(th),
.md-next-editor :deep(td) {
    color: var(--md-editor-text) !important;
    border-color: var(--md-editor-border) !important;
}

.md-next-editor :deep(th) {
    background: var(--md-editor-code-bg);
}

.md-next-editor :deep(.katex),
.md-next-editor :deep(.katex *),
.md-next-editor :deep(.math),
.md-next-editor :deep(.math *) {
    color: var(--md-editor-text) !important;
}

.md-next-editor :deep(hr) {
    border-color: var(--md-editor-border) !important;
}

.md-next-editor :deep(.ag-front-icon),
.md-next-editor :deep(.ag-hidden),
.md-next-editor :deep(.ag-selection),
.md-next-editor :deep(.ag-markdown),
.md-next-editor :deep(.ag-list-marker),
.md-next-editor :deep(.ag-bullet),
.md-next-editor :deep(.ag-ordered-list-marker),
.md-next-editor :deep(.ag-placeholder),
.md-next-editor :deep(.mu-placeholder) {
    color: var(--md-editor-faint) !important;
}

.md-next-editor :deep(.mu-show-quick-insert-hint .mu-paragraph.mu-active > .mu-paragraph-content:first-of-type::after),
.md-next-editor :deep(.mu-show-quick-insert-hint .mu-paragraph.mu-active > .mu-paragraph-content:first-of-type:empty::after) {
    color: var(--editor-color-50);
}

.md-next-editor :deep(::selection) {
    background: var(--md-editor-selection);
}

.md-next-editor :deep(.ag-selected),
.md-next-editor :deep(.ag-selection),
.md-next-editor :deep(.mu-selection) {
    background: var(--md-editor-selection) !important;
}

.md-next-editor :deep(.token.comment),
.md-next-editor :deep(.token.prolog),
.md-next-editor :deep(.token.doctype),
.md-next-editor :deep(.token.cdata) {
    color: #6a737d;
    font-style: italic;
}

.md-next-editor :deep(.token.punctuation) {
    color: #6e7781;
}

.md-next-editor :deep(.token.property),
.md-next-editor :deep(.token.tag),
.md-next-editor :deep(.token.boolean),
.md-next-editor :deep(.token.number),
.md-next-editor :deep(.token.constant),
.md-next-editor :deep(.token.symbol),
.md-next-editor :deep(.token.deleted) {
    color: #bc4c00;
}

.md-next-editor :deep(.token.selector),
.md-next-editor :deep(.token.attr-name),
.md-next-editor :deep(.token.string),
.md-next-editor :deep(.token.char),
.md-next-editor :deep(.token.builtin),
.md-next-editor :deep(.token.inserted) {
    color: #116329;
}

.md-next-editor :deep(.token.operator),
.md-next-editor :deep(.token.entity),
.md-next-editor :deep(.token.url),
.md-next-editor :deep(.language-css .token.string),
.md-next-editor :deep(.style .token.string) {
    color: #953800;
}

.md-next-editor :deep(.token.atrule),
.md-next-editor :deep(.token.attr-value),
.md-next-editor :deep(.token.keyword) {
    color: #0550ae;
}

.md-next-editor :deep(.token.function),
.md-next-editor :deep(.token.class-name) {
    color: #8250df;
}

.md-next-editor :deep(.token.regex),
.md-next-editor :deep(.token.important),
.md-next-editor :deep(.token.variable) {
    color: #b35900;
}

.md-next-editor :deep(.token.important),
.md-next-editor :deep(.token.bold) {
    font-weight: 400;
}

.md-next-editor :deep(.token.italic) {
    font-style: italic;
}

.md-next-editor :deep(.mu-diagram-preview) {
    color: var(--md-editor-text);
    background: var(--md-editor-panel);
    border: 1px solid var(--md-editor-border);
    border-radius: 6px;
}

.md-next-editor :deep(.mu-diagram-preview svg) {
    max-width: 100%;
}

.md-next-loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--md-editor-panel) 88%, transparent);
    color: var(--md-editor-muted);
    font-size: 13px;
    font-weight: 650;
    animation: md-next-pulse 1.2s ease-in-out infinite;
}

.md-next-error {
    position: absolute;
    inset: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    border: 1px solid color-mix(in srgb, #ef4444 42%, var(--md-editor-border));
    border-radius: 8px;
    background: color-mix(in srgb, #ef4444 8%, var(--md-editor-panel));
    color: var(--md-editor-text);
    text-align: center;
}

.md-next-error strong {
    color: #f87171;
    font-size: 14px;
}

.md-next-error span {
    max-width: 620px;
    color: var(--md-editor-muted);
    font-size: 12px;
    line-height: 1.5;
    overflow-wrap: anywhere;
}

.md-next-outline {
    min-height: 0;
    overflow: auto;
    padding: 12px;
    border-left: 1px solid var(--md-editor-border);
    background: var(--md-editor-panel);
}

.md-next-outline-title {
    margin-bottom: 8px;
    color: var(--md-editor-muted);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
}

.md-next-outline-item {
    width: 100%;
    min-height: 32px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: color-mix(in srgb, var(--md-editor-text) 78%, var(--md-editor-muted));
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease;
}

.md-next-outline-item:hover {
    border-color: var(--md-editor-border);
    background: var(--md-editor-shell);
    color: var(--md-editor-accent);
    transform: translateX(2px);
}

.md-next-outline-item.active {
    border-color: color-mix(in srgb, var(--md-editor-accent) 42%, transparent);
    background: color-mix(in srgb, var(--md-editor-accent) 13%, var(--md-editor-panel));
    color: var(--md-editor-accent);
    box-shadow: inset 2px 0 0 var(--md-editor-accent);
    font-weight: 700;
}

.md-next-outline-item.active:hover {
    background: color-mix(in srgb, var(--md-editor-accent) 16%, var(--md-editor-panel));
}

html[data-theme='dark'] .md-next-layer {
    --md-editor-workspace: #1a1a1a;
    --md-editor-faint: var(--dialog-placeholder);
    --md-editor-code-bg: rgba(0, 0, 0, 0.22);
    --md-editor-quote-bg: rgba(0, 0, 0, 0.14);
    --themeColor: var(--color-primary);
    --floatBgColor: rgba(28, 28, 28, 0.95);
    --float-bg-color: var(--floatBgColor);
}

html[data-theme='dark'] .md-next-editor :deep(.token.comment),
html[data-theme='dark'] .md-next-editor :deep(.token.prolog),
html[data-theme='dark'] .md-next-editor :deep(.token.doctype),
html[data-theme='dark'] .md-next-editor :deep(.token.cdata) {
    color: #8f9aa7;
    font-style: italic;
}

html[data-theme='dark'] .md-next-editor :deep(.token.punctuation) {
    color: #c8d3df;
}

html[data-theme='dark'] .md-next-editor :deep(.token.selector),
html[data-theme='dark'] .md-next-editor :deep(.token.tag) {
    color: #ff7b93;
}

html[data-theme='dark'] .md-next-editor :deep(.token.property),
html[data-theme='dark'] .md-next-editor :deep(.token.boolean),
html[data-theme='dark'] .md-next-editor :deep(.token.number),
html[data-theme='dark'] .md-next-editor :deep(.token.constant),
html[data-theme='dark'] .md-next-editor :deep(.token.symbol),
html[data-theme='dark'] .md-next-editor :deep(.token.attr-name),
html[data-theme='dark'] .md-next-editor :deep(.token.deleted) {
    color: #ffb86c;
}

html[data-theme='dark'] .md-next-editor :deep(.token.string),
html[data-theme='dark'] .md-next-editor :deep(.token.char),
html[data-theme='dark'] .md-next-editor :deep(.token.attr-value),
html[data-theme='dark'] .md-next-editor :deep(.token.builtin),
html[data-theme='dark'] .md-next-editor :deep(.token.inserted) {
    color: #8bdc7f;
}

html[data-theme='dark'] .md-next-editor :deep(.token.operator),
html[data-theme='dark'] .md-next-editor :deep(.token.entity),
html[data-theme='dark'] .md-next-editor :deep(.token.url),
html[data-theme='dark'] .md-next-editor :deep(.language-css .token.string),
html[data-theme='dark'] .md-next-editor :deep(.style .token.string) {
    color: #56d4dd;
}

html[data-theme='dark'] .md-next-editor :deep(.token.atrule),
html[data-theme='dark'] .md-next-editor :deep(.token.keyword) {
    color: #c792ea;
}

html[data-theme='dark'] .md-next-editor :deep(.token.function),
html[data-theme='dark'] .md-next-editor :deep(.token.class-name) {
    color: #82aaff;
}

html[data-theme='dark'] .md-next-editor :deep(.token.regex),
html[data-theme='dark'] .md-next-editor :deep(.token.important),
html[data-theme='dark'] .md-next-editor :deep(.token.variable) {
    color: #f78c6c;
}

html[data-theme='dark'] .md-next-editor :deep(.mu-diagram-preview) {
    background: #2d2d2d;
}

html[data-theme='dark'] .md-next-editor :deep(.mu-diagram-preview .messageText),
html[data-theme='dark'] .md-next-editor :deep(.mu-diagram-preview .loopText),
html[data-theme='dark'] .md-next-editor :deep(.mu-diagram-preview .label),
html[data-theme='dark'] .md-next-editor :deep(.mu-diagram-preview .nodeLabel),
html[data-theme='dark'] .md-next-editor :deep(.mu-diagram-preview .edgeLabel),
html[data-theme='dark'] .md-next-editor :deep(.mu-diagram-preview text),
html[data-theme='dark'] .md-next-editor :deep(.mu-diagram-preview foreignObject) {
    color: #e4e7ed !important;
    fill: #e4e7ed !important;
}

html[data-theme='dark'] .md-next-editor :deep(.mu-diagram-preview .edgePath .path),
html[data-theme='dark'] .md-next-editor :deep(.mu-diagram-preview .flowchart-link),
html[data-theme='dark'] .md-next-editor :deep(.mu-diagram-preview line),
html[data-theme='dark'] .md-next-editor :deep(.mu-diagram-preview path) {
    stroke: #c0c4cc;
}

@keyframes md-next-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes md-next-pop-in {
    from {
        opacity: 0;
        transform: translateY(8px) scale(0.985);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes md-next-pulse {
    0%, 100% { opacity: 0.62; }
    50% { opacity: 1; }
}

@keyframes md-next-search-in {
    from {
        opacity: 0;
        transform: translateY(-6px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 860px) {
    .md-next-body {
        grid-template-columns: minmax(0, 1fr);
    }

    .md-next-outline {
        display: none;
    }

    .md-next-search {
        top: 58px;
        right: 0;
        width: min(100%, 460px);
    }

    .md-next-search-row {
        flex-wrap: wrap;
    }

    .md-next-search-field,
    .md-next-replace-row input {
        flex: 1 1 240px;
    }

    .md-next-search-count {
        min-width: 70px;
    }
}
</style>

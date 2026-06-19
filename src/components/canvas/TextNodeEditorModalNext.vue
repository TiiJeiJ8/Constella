<template>
    <Teleport to="body">
        <div v-if="isOpen" class="text-next-layer" @click.self="closeEditor">
            <section class="text-next-dialog" :aria-label="t('canvas.textEditor.title')">
                <header class="text-next-header">
                    <div>
                        <div class="text-next-title">{{ t('canvas.textEditor.title') }}</div>
                        <div class="text-next-meta">{{ t('canvas.textEditor.stats', { lines: lineCount, chars: charCount }) }}</div>
                    </div>
                    <div class="text-next-actions">
                        <div class="text-next-action-group">
                            <button type="button" class="text-next-icon-btn" :title="t('canvas.textEditor.import')" :aria-label="t('canvas.textEditor.import')" :disabled="readOnlyMode" @click="triggerImport">
                                <UploadIcon />
                            </button>
                            <div ref="exportMenuRef" class="text-next-menu-wrap">
                                <button type="button" class="text-next-icon-btn" :title="t('canvas.textEditor.export')" :aria-label="t('canvas.textEditor.export')" @click="toggleExportMenu">
                                    <DownloadIcon />
                                </button>
                                <div v-if="exportMenuOpen" class="text-next-export-menu">
                                    <button type="button" @click="exportText('txt')">{{ t('canvas.textEditor.exportTxt') }}</button>
                                    <button type="button" @click="exportText('pdf')">{{ t('canvas.textEditor.exportPdf') }}</button>
                                </div>
                            </div>
                        </div>
                        <div class="text-next-action-group history">
                            <button type="button" class="text-next-icon-btn" :title="t('canvas.textEditor.undo')" :aria-label="t('canvas.textEditor.undo')" :disabled="readOnlyMode || !canUndo" @click="runUndo">
                                <RollbackIcon />
                            </button>
                            <button type="button" class="text-next-icon-btn redo" :title="t('canvas.textEditor.redo')" :aria-label="t('canvas.textEditor.redo')" :disabled="readOnlyMode || !canRedo" @click="runRedo">
                                <RollbackIcon />
                            </button>
                        </div>
                        <button type="button" class="text-next-icon-btn text-next-close" :title="t('canvas.textEditor.close')" :aria-label="t('canvas.textEditor.close')" @click="closeEditor">
                            <CloseIcon />
                        </button>
                    </div>
                    <input
                        ref="importInputRef"
                        class="text-next-file-input"
                        type="file"
                        accept=".txt,.text,.log,.csv,.tsv,.md,.markdown,text/plain,text/markdown,text/csv"
                        @change="handleImportFileChange"
                    />
                </header>

                <main class="text-next-body">
                    <textarea
                        ref="textareaRef"
                        v-model="localText"
                        class="text-next-textarea"
                        :readonly="readOnlyMode"
                        :placeholder="t('canvas.textEditor.placeholder')"
                        spellcheck="true"
                        @input="handleInput"
                        @keydown="handleTextareaKeydown"
                    />
                </main>
            </section>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { CloseIcon, DownloadIcon, RollbackIcon, UploadIcon } from 'tdesign-icons-vue-next'
import type { NodeContent } from '@/plugins'
import { exportDocument, type DocumentExportFormat } from '@/utils/documentExport'
import { deriveDocumentTitle, sanitizeFilename } from '@/utils/markdownRender'
import { useToast } from '@/utils/useToast'

const { t } = useI18n()
const toast = useToast()

const props = defineProps<{
    nodeId: string
    content: NodeContent
    readOnly?: boolean
}>()

const emit = defineEmits<{
    (e: 'update', nodeId: string, data: string): void
    (e: 'close'): void
}>()

const SAVE_DEBOUNCE_MS = 420
const HISTORY_DEBOUNCE_MS = 360
const HISTORY_LIMIT = 100

const isOpen = ref(true)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const importInputRef = ref<HTMLInputElement | null>(null)
const exportMenuRef = ref<HTMLElement | null>(null)
const exportMenuOpen = ref(false)
const localText = ref(props.content.data || '')
const committedText = ref(props.content.data || '')
const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])

let saveTimer: number | null = null
let historyTimer: number | null = null
let lastHistoryValue = localText.value
let applyingHistory = false

const readOnlyMode = computed(() => Boolean(props.readOnly))
const charCount = computed(() => localText.value.length)
const lineCount = computed(() => localText.value ? localText.value.split(/\r\n|\r|\n/).length : 0)
const canUndo = computed(() => undoStack.value.length > 0 || localText.value !== lastHistoryValue)
const canRedo = computed(() => redoStack.value.length > 0)

onMounted(() => {
    window.addEventListener('keydown', handleWindowKeydown, true)
    window.addEventListener('pointerdown', handleWindowPointerDown, true)
    nextTick(() => {
        if (!readOnlyMode.value) textareaRef.value?.focus()
    })
})

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleWindowKeydown, true)
    window.removeEventListener('pointerdown', handleWindowPointerDown, true)
    clearScheduledHistory()
    clearScheduledSave()
    flushChanges()
})

watch(() => props.content.data, value => {
    const nextText = value || ''
    if (nextText === localText.value) return
    localText.value = nextText
    committedText.value = nextText
    resetHistory(nextText)
})

function handleInput() {
    if (readOnlyMode.value || applyingHistory) return
    scheduleHistoryCheckpoint()
    scheduleSave()
}

function handleTextareaKeydown(event: KeyboardEvent) {
    const key = event.key.toLowerCase()
    const mod = event.ctrlKey || event.metaKey

    if (mod && key === 'z') {
        event.preventDefault()
        event.stopPropagation()
        event.shiftKey ? runRedo() : runUndo()
        return
    }

    if (mod && key === 'y') {
        event.preventDefault()
        event.stopPropagation()
        runRedo()
        return
    }

    if (event.key === 'Escape') {
        event.preventDefault()
        closeEditor()
    }
}

function handleWindowKeydown(event: KeyboardEvent) {
    if (!isOpen.value) return
    const key = event.key.toLowerCase()
    const mod = event.ctrlKey || event.metaKey

    if (mod && key === 's') {
        event.preventDefault()
        flushChanges()
        return
    }

    if (event.key === 'Escape') {
        closeEditor()
    }
}

function handleWindowPointerDown(event: PointerEvent) {
    const menu = exportMenuRef.value
    if (!menu || !exportMenuOpen.value) return
    if (event.target instanceof Node && menu.contains(event.target)) return
    exportMenuOpen.value = false
}

function scheduleSave() {
    if (saveTimer != null) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
        saveTimer = null
        flushChanges()
    }, SAVE_DEBOUNCE_MS)
}

function clearScheduledSave() {
    if (saveTimer == null) return
    window.clearTimeout(saveTimer)
    saveTimer = null
}

function flushChanges() {
    if (readOnlyMode.value) return
    const nextText = localText.value
    if (nextText === committedText.value) return
    committedText.value = nextText
    emit('update', props.nodeId, nextText)
}

function scheduleHistoryCheckpoint() {
    if (historyTimer != null) window.clearTimeout(historyTimer)
    historyTimer = window.setTimeout(() => {
        historyTimer = null
        commitHistoryCheckpoint()
    }, HISTORY_DEBOUNCE_MS)
}

function clearScheduledHistory() {
    if (historyTimer == null) return
    window.clearTimeout(historyTimer)
    historyTimer = null
}

function commitHistoryCheckpoint() {
    clearScheduledHistory()
    if (localText.value === lastHistoryValue) return
    pushUndoValue(lastHistoryValue)
    lastHistoryValue = localText.value
    redoStack.value = []
}

function pushUndoValue(value: string) {
    undoStack.value.push(value)
    if (undoStack.value.length > HISTORY_LIMIT) {
        undoStack.value.shift()
    }
}

function applyHistoryValue(value: string) {
    applyingHistory = true
    localText.value = value
    lastHistoryValue = value
    nextTick(() => {
        textareaRef.value?.focus()
        applyingHistory = false
    })
    scheduleSave()
}

function runUndo() {
    if (readOnlyMode.value) return
    commitHistoryCheckpoint()
    const previous = undoStack.value.pop()
    if (previous == null) return
    redoStack.value.push(localText.value)
    applyHistoryValue(previous)
}

function runRedo() {
    if (readOnlyMode.value) return
    const next = redoStack.value.pop()
    if (next == null) return
    pushUndoValue(localText.value)
    applyHistoryValue(next)
}

function resetHistory(value: string) {
    clearScheduledHistory()
    undoStack.value = []
    redoStack.value = []
    lastHistoryValue = value
}

function replaceTextWithHistory(value: string) {
    if (readOnlyMode.value) return
    commitHistoryCheckpoint()
    if (value === localText.value) return
    pushUndoValue(localText.value)
    redoStack.value = []
    localText.value = value
    lastHistoryValue = value
    committedText.value = value
    emit('update', props.nodeId, value)
    nextTick(() => textareaRef.value?.focus())
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

    if (!isSupportedTextFile(file)) {
        toast.error(t('canvas.textEditor.importInvalidType'))
        resetImportInput()
        return
    }

    try {
        const text = (await file.text()).replace(/^\uFEFF/, '')
        replaceTextWithHistory(text)
        toast.success(t('canvas.editor.importSuccess', { name: file.name }))
    } catch (error) {
        console.error('[TextNodeEditorModalNext] Text import failed:', error)
        toast.error(t('canvas.editor.importFailed'))
    } finally {
        resetImportInput()
    }
}

function isSupportedTextFile(file: File) {
    if (file.type.startsWith('text/')) return true
    const lowerName = file.name.toLowerCase()
    return ['.txt', '.text', '.log', '.csv', '.tsv', '.md', '.markdown'].some(extension => lowerName.endsWith(extension))
}

function toggleExportMenu() {
    exportMenuOpen.value = !exportMenuOpen.value
}

function getDefaultExportFileName() {
    return sanitizeFilename(deriveDocumentTitle(localText.value, 'text'), 'text')
}

async function exportText(format: Extract<DocumentExportFormat, 'txt' | 'pdf'>) {
    exportMenuOpen.value = false
    flushChanges()

    const content = localText.value
    const fileName = getDefaultExportFileName()

    try {
        const result = await exportDocument(format, {
            kind: 'text',
            content,
            fileName,
            title: deriveDocumentTitle(content, 'text'),
            theme: 'light',
            includeTitle: true,
            orientation: 'portrait',
            textMode: 'plain'
        })

        if (result.canceled) return
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
        toast.success(t('canvas.toast.exportSuccess', { format: format.toUpperCase() }))
    } catch (error) {
        console.error('[TextNodeEditorModalNext] Text export failed:', error)
        toast.error(t('canvas.toast.exportFailed'))
    }
}

function closeEditor() {
    clearScheduledSave()
    commitHistoryCheckpoint()
    flushChanges()
    isOpen.value = false
    window.setTimeout(() => emit('close'), 100)
}
</script>

<style scoped>
.text-next-layer {
    --text-editor-backdrop: var(--dialog-backdrop);
    --text-editor-panel: var(--dialog-bg);
    --text-editor-shell: var(--dialog-bg);
    --text-editor-workspace: var(--bg-primary);
    --text-editor-text: var(--dialog-text);
    --text-editor-muted: var(--dialog-muted);
    --text-editor-border: var(--dialog-border);
    --text-editor-control-border: var(--dialog-control-border);
    --text-editor-control-bg: var(--dialog-control-bg);
    --text-editor-control-hover: var(--dialog-control-hover);
    --text-editor-accent: var(--dialog-primary);
    --text-editor-selection: var(--dialog-focus);
    --text-editor-shadow: var(--dialog-shadow);
    position: fixed;
    inset: 0;
    z-index: 3500;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: var(--text-editor-backdrop);
    backdrop-filter: blur(8px);
    animation: text-next-fade-in 140ms ease-out;
}

.text-next-dialog {
    width: min(980px, calc(100vw - 48px));
    height: min(760px, calc(100vh - 48px));
    min-height: 520px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--text-editor-control-border);
    border-radius: 8px;
    background: var(--text-editor-shell);
    color: var(--text-editor-text);
    box-shadow: var(--text-editor-shadow);
    animation: text-next-pop-in 180ms cubic-bezier(0.2, 0.9, 0.2, 1);
}

.text-next-header {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--text-editor-border);
    background: var(--text-editor-panel);
}

.text-next-title {
    font-size: 15px;
    font-weight: 780;
    letter-spacing: 0;
}

.text-next-meta {
    margin-top: 2px;
    color: var(--text-editor-muted);
    font-size: 12px;
}

.text-next-actions,
.text-next-action-group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.text-next-action-group {
    padding: 3px;
    border: 1px solid var(--text-editor-border);
    border-radius: 8px;
    background: color-mix(in srgb, var(--text-editor-panel) 90%, var(--text-editor-shell));
}

.text-next-action-group.history {
    margin-left: 4px;
}

.text-next-icon-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--text-editor-muted);
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
}

.text-next-icon-btn svg {
    width: 17px;
    height: 17px;
}

.text-next-icon-btn.redo svg {
    transform: scaleX(-1);
}

.text-next-icon-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

.text-next-icon-btn:not(:disabled):hover {
    border-color: color-mix(in srgb, var(--text-editor-accent) 32%, transparent);
    background: var(--text-editor-control-hover);
    color: var(--text-editor-accent);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
}

.text-next-close {
    margin-left: 4px;
}

.text-next-menu-wrap {
    position: relative;
}

.text-next-export-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 2;
    min-width: 132px;
    padding: 5px;
    border: 1px solid var(--text-editor-border);
    border-radius: 8px;
    background: var(--text-editor-panel);
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);
    animation: text-next-menu-in 120ms ease-out;
}

.text-next-export-menu button {
    width: 100%;
    min-height: 30px;
    padding: 0 9px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--text-editor-text);
    text-align: left;
    cursor: pointer;
}

.text-next-export-menu button:hover {
    background: var(--text-editor-control-hover);
    color: var(--text-editor-accent);
}

.text-next-file-input {
    display: none;
}

.text-next-body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0;
    background: var(--text-editor-workspace);
}

.text-next-textarea {
    width: 100%;
    height: 100%;
    resize: none;
    padding: 42px 52px 72px;
    border: 0;
    background: var(--text-editor-workspace);
    color: var(--text-editor-text);
    font-family: "Inter", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 16px;
    line-height: 1.72;
    letter-spacing: 0;
    outline: none;
    white-space: pre-wrap;
}

.text-next-textarea::placeholder {
    color: color-mix(in srgb, var(--text-editor-muted) 72%, transparent);
}

.text-next-textarea::selection {
    background: var(--text-editor-selection);
}

html[data-theme='dark'] .text-next-layer {
    --text-editor-workspace: #1a1a1a;
}

@keyframes text-next-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes text-next-pop-in {
    from {
        opacity: 0;
        transform: translateY(8px) scale(0.985);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes text-next-menu-in {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 720px) {
    .text-next-layer {
        padding: 12px;
    }

    .text-next-dialog {
        width: 100%;
        height: calc(100vh - 24px);
        min-height: 0;
    }

    .text-next-header {
        flex-wrap: wrap;
    }

    .text-next-actions {
        width: 100%;
        justify-content: flex-end;
    }

    .text-next-textarea {
        padding: 26px 22px 48px;
    }
}
</style>

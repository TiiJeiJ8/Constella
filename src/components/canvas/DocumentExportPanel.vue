<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div
                v-if="modelValue"
                ref="overlayRef"
                class="export-panel-overlay"
                tabindex="-1"
                @click.self="handleCancel"
                @keydown.esc.stop="handleCancel"
            >
                <div class="export-panel">
                    <div class="export-panel-header">
                        <div>
                            <h3 class="export-panel-title">{{ t('canvas.editor.exportPanelTitle') }}</h3>
                            <p class="export-panel-subtitle">{{ t('canvas.editor.exportPanelSubtitle') }}</p>
                        </div>
                        <button type="button" class="export-panel-close" :title="t('canvas.editor.closeHint')" @click="handleCancel">&times;</button>
                    </div>

                    <div class="export-panel-body">
                        <aside class="export-sidebar">
                            <div class="export-panel-label export-sidebar-label">{{ t('canvas.editor.exportFormatLabel') }}</div>
                            <div class="export-format-list">
                                <button
                                    v-for="format in availableFormats"
                                    :key="format.id"
                                    type="button"
                                    class="export-format-item"
                                    :class="{ active: draft.format === format.id }"
                                    @click="draft.format = format.id"
                                >
                                    <span class="export-format-item-title">{{ format.title }}</span>
                                    <span class="export-format-item-description">{{ format.description }}</span>
                                </button>
                            </div>
                        </aside>

                        <section ref="contentRef" class="export-content" @wheel="handleContentWheel">
                            <div class="export-panel-section export-content-section export-top-row" :class="{ 'pdf-mode': draft.format === 'pdf' }">
                                <label class="export-field">
                                    <span class="export-panel-label">{{ t('canvas.editor.exportFilenameLabel') }}</span>
                                    <input
                                        ref="fileNameInputRef"
                                        v-model="draft.fileName"
                                        type="text"
                                        class="export-input"
                                        :placeholder="t('canvas.editor.exportFilenamePlaceholder')"
                                    />
                                </label>

                                <label v-if="draft.format === 'pdf'" class="export-toggle-card export-inline-toggle-card">
                                    <div>
                                        <div class="export-panel-label">{{ t('canvas.editor.exportTitleLabel') }}</div>
                                        <div class="export-toggle-description">{{ t('canvas.editor.exportTitleDescription') }}</div>
                                    </div>
                                    <input v-model="draft.pdfIncludeTitle" type="checkbox" class="export-checkbox" />
                                </label>
                            </div>

                            <div v-if="draft.format === 'pdf'" class="export-panel-section export-options-grid export-content-section">
                                <div class="export-option-card">
                                    <div class="export-panel-label">{{ t('canvas.editor.exportThemeLabel') }}</div>
                                    <div class="export-choice-row">
                                        <button
                                            v-for="option in themeOptions"
                                            :key="option.id"
                                            type="button"
                                            class="export-choice-btn"
                                            :class="{ active: draft.pdfTheme === option.id }"
                                            @click="draft.pdfTheme = option.id"
                                        >
                                            {{ option.label }}
                                        </button>
                                    </div>
                                </div>

                                <div class="export-option-card">
                                    <div class="export-panel-label">{{ t('canvas.editor.exportOrientationLabel') }}</div>
                                    <div class="export-choice-row">
                                        <button
                                            v-for="option in orientationOptions"
                                            :key="option.id"
                                            type="button"
                                            class="export-choice-btn"
                                            :class="{ active: draft.pdfOrientation === option.id }"
                                            @click="draft.pdfOrientation = option.id"
                                        >
                                            {{ option.label }}
                                        </button>
                                    </div>
                                </div>

                            </div>

                            <div v-if="draft.format === 'pdf' && kind === 'markdown'" class="export-panel-section export-options-grid export-content-section">
                                <div class="export-option-card">
                                    <div class="export-panel-label">{{ t('canvas.editor.exportMermaidOversizeLabel') }}</div>
                                    <div class="export-choice-row">
                                        <button
                                            v-for="option in mermaidOversizeOptions"
                                            :key="option.id"
                                            type="button"
                                            class="export-choice-btn"
                                            :class="{ active: draft.pdfMermaidOversize === option.id }"
                                            @click="draft.pdfMermaidOversize = option.id"
                                        >
                                            {{ option.label }}
                                        </button>
                                    </div>
                                </div>

                                <div class="export-option-card">
                                    <div class="export-panel-label">{{ t('canvas.editor.exportMermaidScaleModeLabel') }}</div>
                                    <div class="export-choice-row">
                                        <button
                                            v-for="option in mermaidScaleModeOptions"
                                            :key="option.id"
                                            type="button"
                                            class="export-choice-btn"
                                            :class="{ active: draft.pdfMermaidScaleMode === option.id }"
                                            @click="draft.pdfMermaidScaleMode = option.id"
                                        >
                                            {{ option.label }}
                                        </button>
                                    </div>
                                </div>

                                <div class="export-option-card export-option-card-wide export-scale-card">
                                    <div class="export-scale-header">
                                        <div>
                                            <div class="export-panel-label">{{ t('canvas.editor.exportMermaidScalePercentLabel') }}</div>
                                            <div class="export-toggle-description">{{ t('canvas.editor.exportMermaidScalePercentDescription') }}</div>
                                        </div>
                                        <span class="export-scale-value">{{ draft.pdfMermaidScalePercent }}%</span>
                                    </div>
                                    <input
                                        v-model.number="draft.pdfMermaidScalePercent"
                                        class="export-scale-slider"
                                        type="range"
                                        :min="EXPORT_PDF_MERMAID_SCALE_MIN"
                                        :max="EXPORT_PDF_MERMAID_SCALE_MAX"
                                        :step="EXPORT_PDF_MERMAID_SCALE_STEP"
                                    />
                                    <div class="export-choice-row export-scale-presets">
                                        <button
                                            v-for="percent in mermaidScalePresets"
                                            :key="percent"
                                            type="button"
                                            class="export-choice-btn"
                                            :class="{ active: draft.pdfMermaidScalePercent === percent }"
                                            @click="draft.pdfMermaidScalePercent = percent"
                                        >
                                            {{ percent }}%
                                        </button>
                                    </div>
                                </div>

                                <div class="export-option-card export-option-card-wide">
                                    <div class="export-panel-label">{{ t('canvas.editor.exportMermaidDensityLabel') }}</div>
                                    <div class="export-choice-row">
                                        <button
                                            v-for="option in mermaidDensityOptions"
                                            :key="option.id"
                                            type="button"
                                            class="export-choice-btn"
                                            :class="{ active: draft.pdfMermaidDensity === option.id }"
                                            @click="draft.pdfMermaidDensity = option.id"
                                        >
                                            {{ option.label }}
                                        </button>
                                    </div>
                                    <div class="export-toggle-description">{{ t('canvas.editor.exportMermaidDensityDescription') }}</div>
                                </div>
                            </div>

                            <div v-else-if="draft.format === 'txt' && kind === 'markdown'" class="export-panel-section export-content-section">
                                <div class="export-option-card">
                                    <div class="export-panel-label">{{ t('canvas.editor.exportTextModeLabel') }}</div>
                                    <div class="export-choice-row">
                                        <button
                                            v-for="option in textModeOptions"
                                            :key="option.id"
                                            type="button"
                                            class="export-choice-btn"
                                            :class="{ active: draft.txtMode === option.id }"
                                            @click="draft.txtMode = option.id"
                                        >
                                            {{ option.label }}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="export-panel-footer">
                                <p class="export-panel-hint">{{ activeHint }}</p>
                                <div class="export-panel-actions">
                                    <button type="button" class="export-panel-btn secondary" @click="handleCancel">
                                        {{ t('common.cancel') }}
                                    </button>
                                    <button type="button" class="export-panel-btn primary" @click="handleConfirm">
                                        {{ exportActionLabel }}
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    EXPORT_PDF_MERMAID_SCALE_MAX,
    EXPORT_PDF_MERMAID_SCALE_MIN,
    EXPORT_PDF_MERMAID_SCALE_STEP
} from '@/utils/documentExport'
import type {
    DocumentExportFormat,
    ExportableDocumentKind,
    ExportPanelSettings,
    ExportPdfMermaidDensity,
    ExportPdfMermaidOversize,
    ExportPdfMermaidScaleMode,
    ExportPdfOrientation,
    ExportPanelThemeMode,
    ExportTextMode
} from '@/utils/documentExport'

const { t } = useI18n()

const props = defineProps<{
    modelValue: boolean
    kind: ExportableDocumentKind
    defaultSettings: ExportPanelSettings
    supportsElectronPdf: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'confirm', value: ExportPanelSettings): void
}>()

const overlayRef = ref<HTMLDivElement | null>(null)
const fileNameInputRef = ref<HTMLInputElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const draft = ref<ExportPanelSettings>(cloneSettings(props.defaultSettings))

const availableFormats = computed(() => {
    const formats: Array<{ id: DocumentExportFormat; title: string; description: string }> = [
        {
            id: 'pdf',
            title: 'PDF',
            description: t('canvas.editor.exportPdfDescription')
        }
    ]

    if (props.kind === 'markdown') {
        formats.push({
            id: 'md',
            title: 'Markdown',
            description: t('canvas.editor.exportMarkdownDescription')
        })
    }

    formats.push({
        id: 'txt',
        title: 'Text',
        description: t('canvas.editor.exportTextDescription')
    })

    return formats
})

const themeOptions = computed<Array<{ id: ExportPanelThemeMode; label: string }>>(() => ([
    { id: 'current', label: t('canvas.editor.exportThemeCurrent') },
    { id: 'light', label: t('canvas.editor.exportThemeLight') },
    { id: 'dark', label: t('canvas.editor.exportThemeDark') }
]))

const orientationOptions = computed<Array<{ id: ExportPdfOrientation; label: string }>>(() => ([
    { id: 'portrait', label: t('canvas.editor.exportOrientationPortrait') },
    { id: 'landscape', label: t('canvas.editor.exportOrientationLandscape') }
]))

const mermaidOversizeOptions = computed<Array<{ id: ExportPdfMermaidOversize; label: string }>>(() => ([
    { id: 'scale', label: t('canvas.editor.exportMermaidOversizeScale') },
    { id: 'page-break', label: t('canvas.editor.exportMermaidOversizePageBreak') }
]))

const mermaidScaleModeOptions = computed<Array<{ id: ExportPdfMermaidScaleMode; label: string }>>(() => ([
    { id: 'fit-page', label: t('canvas.editor.exportMermaidScaleModeFitPage') },
    { id: 'fit-width', label: t('canvas.editor.exportMermaidScaleModeFitWidth') }
]))

const mermaidDensityOptions = computed<Array<{ id: ExportPdfMermaidDensity; label: string }>>(() => ([
    { id: 'standard', label: t('canvas.editor.exportMermaidDensityStandard') },
    { id: 'compact', label: t('canvas.editor.exportMermaidDensityCompact') }
]))

const textModeOptions = computed<Array<{ id: ExportTextMode; label: string }>>(() => ([
    { id: 'plain', label: t('canvas.editor.exportTextModePlain') },
    { id: 'source', label: t('canvas.editor.exportTextModeSource') }
]))

const mermaidScalePresets = [EXPORT_PDF_MERMAID_SCALE_MIN, 80, 90, 100, EXPORT_PDF_MERMAID_SCALE_MAX]

const activeHint = computed(() => {
    if (draft.value.format === 'pdf') {
        return props.supportsElectronPdf
            ? t('canvas.editor.exportHintPdfElectron')
            : t('canvas.editor.exportHintPdfWeb')
    }

    if (draft.value.format === 'md') {
        return t('canvas.editor.exportHintMarkdown')
    }

    return draft.value.txtMode === 'source'
        ? t('canvas.editor.exportHintTextSource')
        : t('canvas.editor.exportHintTextPlain')
})

const exportActionLabel = computed(() => {
    if (draft.value.format === 'pdf') return t('canvas.editor.exportActionPdf')
    if (draft.value.format === 'md') return t('canvas.editor.exportActionMarkdown')
    return t('canvas.editor.exportActionText')
})

watch(() => props.modelValue, visible => {
    if (!visible) return
    draft.value = cloneSettings(props.defaultSettings)
    nextTick(() => {
        overlayRef.value?.focus()
        fileNameInputRef.value?.focus()
        fileNameInputRef.value?.select()
    })
})

watch(() => props.defaultSettings, value => {
    if (!props.modelValue) {
        draft.value = cloneSettings(value)
    }
}, { deep: true })

function handleCancel() {
    emit('update:modelValue', false)
}

function handleConfirm() {
    emit('confirm', cloneSettings(draft.value))
    emit('update:modelValue', false)
}

function handleContentWheel(event: WheelEvent) {
    const container = contentRef.value
    if (!container) return

    const canScroll = container.scrollHeight > container.clientHeight + 1
    if (!canScroll) return

    const nextScrollTop = container.scrollTop + event.deltaY
    const maxScrollTop = container.scrollHeight - container.clientHeight
    const clampedScrollTop = Math.max(0, Math.min(maxScrollTop, nextScrollTop))

    if (clampedScrollTop !== container.scrollTop) {
        event.preventDefault()
        container.scrollTop = clampedScrollTop
    }
}

function cloneSettings(settings: ExportPanelSettings): ExportPanelSettings {
    return {
        format: settings.format,
        fileName: settings.fileName,
        pdfTheme: settings.pdfTheme,
        pdfOrientation: settings.pdfOrientation,
        pdfIncludeTitle: settings.pdfIncludeTitle,
        pdfMermaidOversize: settings.pdfMermaidOversize,
        pdfMermaidScaleMode: settings.pdfMermaidScaleMode,
        pdfMermaidScalePercent: settings.pdfMermaidScalePercent ?? 100,
        pdfMermaidDensity: settings.pdfMermaidDensity,
        txtMode: settings.txtMode
    }
}
</script>

<style scoped>
.export-panel-overlay {
    position: fixed;
    inset: 0;
    z-index: 10020;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(8, 10, 16, 0.58);
    backdrop-filter: blur(10px);
}

.export-panel {
    display: flex;
    flex-direction: column;
    width: min(820px, 100%);
    max-height: min(84vh, 720px);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.02)),
        #17181c;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
}

.export-panel-header,
.export-panel-footer,
.export-choice-row,
.export-panel-actions {
    display: flex;
    align-items: center;
}

.export-panel-header {
    justify-content: space-between;
    gap: 16px;
    padding: 24px 24px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.export-panel-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.96);
}

.export-panel-subtitle {
    margin: 6px 0 0;
    color: rgba(255, 255, 255, 0.58);
    font-size: 13px;
    line-height: 1.5;
}

.export-panel-close {
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.74);
    font-size: 22px;
    cursor: pointer;
}

.export-panel-label {
    display: block;
    margin-bottom: 10px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
}

.export-panel-body {
    flex: 1 1 auto;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    min-height: 0;
    overflow: hidden;
}

.export-sidebar {
    min-height: 0;
    padding: 16px 14px 16px 16px;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
    overflow-y: auto;
}

.export-sidebar-label {
    margin-bottom: 12px;
}

.export-format-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.export-format-item,
.export-choice-btn,
.export-panel-btn {
    border: none;
    cursor: pointer;
    transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.export-format-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    width: 100%;
    padding: 13px 14px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.03);
    text-align: left;
}

.export-format-item:hover,
.export-choice-btn:hover,
.export-panel-btn:hover,
.export-panel-close:hover {
    transform: translateY(-1px);
}

.export-format-item.active {
    border-color: rgba(147, 197, 253, 0.26);
    background: linear-gradient(135deg, rgba(96, 165, 250, 0.18), rgba(96, 165, 250, 0.05));
    box-shadow: 0 16px 34px rgba(37, 99, 235, 0.15);
}

.export-format-item-title {
    font-size: 14px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.94);
}

.export-format-item-description {
    color: rgba(255, 255, 255, 0.58);
    font-size: 12px;
    line-height: 1.45;
}

.export-content {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
}

.export-content-section {
    padding: 14px 20px 0;
}

.export-top-row {
    display: block;
}

.export-top-row.pdf-mode {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 12px;
    align-items: stretch;
}

.export-panel-section {
    padding: 0 20px 14px;
}

.export-field {
    display: block;
}

.export-inline-toggle-card {
    margin-top: 20px;
}

.export-input {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.94);
    font-size: 14px;
    outline: none;
}

.export-input:focus {
    border-color: rgba(96, 165, 250, 0.4);
    box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.12);
}

.export-options-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.export-option-card,
.export-toggle-card {
    padding: 14px;
    border: 1px solid rgba(255, 255, 255, 0.065);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.03);
}

.export-option-card-wide {
    grid-column: 1 / -1;
}

.export-scale-card {
    padding-top: 13px;
    padding-bottom: 13px;
}

.export-choice-row {
    flex-wrap: wrap;
    gap: 8px;
}

.export-choice-btn {
    padding: 9px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.74);
    font-size: 12px;
    font-weight: 600;
}

.export-choice-btn.active {
    background: rgba(96, 165, 250, 0.2);
    color: #dbeafe;
    box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.16);
}

.export-toggle-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
}

.export-toggle-description {
    color: rgba(255, 255, 255, 0.56);
    font-size: 12px;
    line-height: 1.45;
}

.export-scale-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
}

.export-scale-value {
    flex: 0 0 auto;
    padding: 7px 10px;
    border-radius: 999px;
    background: rgba(96, 165, 250, 0.16);
    color: #dbeafe;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
}

.export-scale-slider {
    width: 100%;
    margin: 12px 0 8px;
    accent-color: #60a5fa;
    cursor: pointer;
}

.export-scale-presets {
    gap: 8px;
}

.export-checkbox {
    width: 18px;
    height: 18px;
    accent-color: #60a5fa;
}

.export-panel-footer {
    justify-content: space-between;
    gap: 16px;
    margin-top: auto;
    padding: 14px 20px 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.export-panel-hint {
    margin: 0;
    color: rgba(255, 255, 255, 0.56);
    font-size: 12px;
    line-height: 1.5;
}

.export-panel-actions {
    gap: 10px;
    margin-left: auto;
}

.export-panel-btn {
    padding: 10px 16px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 700;
}

.export-panel-btn.secondary {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.8);
}

.export-panel-btn.primary {
    background: linear-gradient(135deg, rgba(96, 165, 250, 0.94), rgba(59, 130, 246, 0.84));
    color: #eff6ff;
    box-shadow: 0 16px 32px rgba(37, 99, 235, 0.24);
}

html[data-theme='light'] .export-panel {
    border-color: rgba(15, 23, 42, 0.08);
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.94)),
        #ffffff;
    box-shadow: 0 28px 70px rgba(15, 23, 42, 0.12);
}

html[data-theme='light'] .export-panel-title,
html[data-theme='light'] .export-format-item-title,
html[data-theme='light'] .export-input {
    color: rgba(15, 23, 42, 0.92);
}

html[data-theme='light'] .export-panel-subtitle,
html[data-theme='light'] .export-format-item-description,
html[data-theme='light'] .export-toggle-description,
html[data-theme='light'] .export-panel-hint {
    color: rgba(15, 23, 42, 0.56);
}

html[data-theme='light'] .export-panel-label {
    color: rgba(15, 23, 42, 0.5);
}

html[data-theme='light'] .export-panel-close,
html[data-theme='light'] .export-input,
html[data-theme='light'] .export-format-item,
html[data-theme='light'] .export-option-card,
html[data-theme='light'] .export-toggle-card,
html[data-theme='light'] .export-panel-btn.secondary,
html[data-theme='light'] .export-choice-btn {
    border-color: rgba(15, 23, 42, 0.08);
    background: rgba(15, 23, 42, 0.04);
    color: rgba(15, 23, 42, 0.76);
}

html[data-theme='light'] .export-sidebar {
    border-right-color: rgba(15, 23, 42, 0.08);
    background: rgba(15, 23, 42, 0.02);
}

html[data-theme='light'] .export-format-item.active {
    border-color: rgba(37, 99, 235, 0.22);
    background: linear-gradient(135deg, rgba(96, 165, 250, 0.14), rgba(96, 165, 250, 0.05));
}

html[data-theme='light'] .export-choice-btn.active {
    background: rgba(59, 130, 246, 0.14);
    color: #1d4ed8;
}

html[data-theme='light'] .export-scale-value {
    background: rgba(59, 130, 246, 0.12);
    color: #1d4ed8;
}

html[data-theme='light'] .export-panel-footer {
    border-top-color: rgba(15, 23, 42, 0.08);
}

@media (max-width: 720px) {
    .export-panel-overlay { padding: 16px; }
    .export-panel { width: 100%; max-height: 92vh; }
    .export-panel-body { grid-template-columns: 1fr; min-height: 0; }
    .export-sidebar {
        border-right: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        padding-right: 16px;
    }
    .export-options-grid { grid-template-columns: 1fr; }
    .export-top-row.pdf-mode {
        grid-template-columns: 1fr;
    }
    .export-inline-toggle-card {
        margin-top: 0;
    }
    .export-panel-footer {
        flex-direction: column;
        align-items: stretch;
    }
    .export-panel-actions {
        width: 100%;
        margin-left: 0;
        justify-content: flex-end;
    }
    html[data-theme='light'] .export-sidebar {
        border-bottom-color: rgba(15, 23, 42, 0.08);
    }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.22s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-enter-active .export-panel {
    animation: export-panel-in 0.22s ease-out;
}

.modal-fade-leave-active .export-panel {
    animation: export-panel-out 0.16s ease-in;
}

@keyframes export-panel-in {
    from {
        opacity: 0;
        transform: scale(0.96) translateY(10px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

@keyframes export-panel-out {
    from {
        opacity: 1;
        transform: scale(1);
    }
    to {
        opacity: 0;
        transform: scale(0.98) translateY(8px);
    }
}
</style>

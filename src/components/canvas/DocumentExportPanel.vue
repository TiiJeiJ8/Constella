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
    allowedFormats?: DocumentExportFormat[]
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'confirm', value: ExportPanelSettings): void
}>()

const overlayRef = ref<HTMLDivElement | null>(null)
const fileNameInputRef = ref<HTMLInputElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const draft = ref<ExportPanelSettings>(cloneSettings(props.defaultSettings))
type ExportFormatOption = { id: DocumentExportFormat; title: string; description: string }

const availableFormats = computed(() => {
    const allowed = new Set(props.allowedFormats || ['pdf', 'md', 'txt'])
    const baseFormats: ExportFormatOption[] = [
        {
            id: 'pdf',
            title: 'PDF',
            description: t('canvas.editor.exportPdfDescription')
        }
    ]
    const formats = baseFormats.filter(format => allowed.has(format.id))

    if (props.kind === 'markdown' && allowed.has('md')) {
        formats.push({
            id: 'md',
            title: 'Markdown',
            description: t('canvas.editor.exportMarkdownDescription')
        })
    }

    if (allowed.has('txt')) {
        formats.push({
            id: 'txt',
            title: 'Text',
            description: t('canvas.editor.exportTextDescription')
        })
    }

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
    ensureAllowedFormat()
    nextTick(() => {
        overlayRef.value?.focus()
        fileNameInputRef.value?.focus()
        fileNameInputRef.value?.select()
    })
})

watch(() => props.defaultSettings, value => {
    if (!props.modelValue) {
        draft.value = cloneSettings(value)
        ensureAllowedFormat()
    }
}, { deep: true })

watch(availableFormats, () => ensureAllowedFormat())

function handleCancel() {
    emit('update:modelValue', false)
}

function handleConfirm() {
    ensureAllowedFormat()
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

function ensureAllowedFormat() {
    if (availableFormats.value.some(format => format.id === draft.value.format)) return
    draft.value.format = availableFormats.value[0]?.id || 'pdf'
}
</script>

<style scoped src="./DocumentExportPanel.css"></style>

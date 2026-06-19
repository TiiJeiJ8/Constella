<template>
    <Teleport to="body">
        <div v-if="modelValue" class="md-export-layer" @click.self="close">
            <section class="md-export-dialog" :aria-label="t('canvas.markdownEditor.exportPanel.aria')">
                <header class="md-export-header">
                    <div>
                        <div class="md-export-title">{{ t('canvas.markdownEditor.exportPanel.title') }}</div>
                        <div class="md-export-subtitle">{{ t('canvas.markdownEditor.exportPanel.subtitle') }}</div>
                    </div>
                    <button type="button" class="md-export-close" :title="t('common.close')" @click="close">&times;</button>
                </header>

                <div class="md-export-main">
                    <aside class="md-export-formats">
                        <button
                            v-for="format in formats"
                            :key="format.id"
                            type="button"
                            class="md-export-format"
                            :class="{ active: draft.format === format.id }"
                            @click="draft.format = format.id"
                        >
                            <span class="format-name">{{ format.name }}</span>
                            <span class="format-description">{{ format.description }}</span>
                        </button>
                    </aside>

                    <main class="md-export-settings">
                        <nav class="md-export-tabs">
                            <button
                                v-for="tab in visibleTabs"
                                :key="tab.id"
                                type="button"
                                :class="{ active: activeTab === tab.id }"
                                @click="activeTab = tab.id"
                            >
                                {{ tab.label }}
                            </button>
                        </nav>

                        <section class="md-export-content">
                            <div v-if="activeTab === 'info'" class="settings-grid">
                                <label class="field field-wide">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.fileName') }}</span>
                                    <input v-model="draft.fileName" type="text" :placeholder="t('canvas.markdownEditor.exportPanel.fileNamePlaceholder')" />
                                </label>

                                <label v-if="draft.format === 'pdf'" class="field field-wide">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.documentTitle') }}</span>
                                    <input v-model="draft.title" type="text" :placeholder="t('canvas.markdownEditor.exportPanel.documentTitlePlaceholder')" />
                                </label>

                                <label v-if="draft.format === 'pdf'" class="check-row">
                                    <input v-model="draft.includeTitle" type="checkbox" />
                                    <span>{{ t('canvas.markdownEditor.exportPanel.showTitle') }}</span>
                                </label>

                                <label v-if="draft.format === 'pdf'" class="check-row">
                                    <input v-model="draft.includeToc" type="checkbox" />
                                    <span>{{ t('canvas.markdownEditor.exportPanel.insertToc') }}</span>
                                </label>

                                <label v-if="draft.format === 'pdf'" class="check-row">
                                    <input v-model="draft.numberHeadings" type="checkbox" />
                                    <span>{{ t('canvas.markdownEditor.exportPanel.numberHeadings') }}</span>
                                </label>

                                <p v-if="draft.format === 'md'" class="md-export-note">
                                    {{ t('canvas.markdownEditor.exportPanel.markdownNote') }}
                                </p>
                            </div>

                            <div v-else-if="activeTab === 'page'" class="settings-grid">
                                <label class="field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.pageSize') }}</span>
                                    <select v-model="draft.pageSize">
                                        <option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option>
                                    </select>
                                </label>

                                <div class="field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.orientation') }}</span>
                                    <div class="segmented">
                                        <button type="button" :class="{ active: draft.orientation === 'portrait' }" @click="draft.orientation = 'portrait'">{{ t('canvas.markdownEditor.exportPanel.portrait') }}</button>
                                        <button type="button" :class="{ active: draft.orientation === 'landscape' }" @click="draft.orientation = 'landscape'">{{ t('canvas.markdownEditor.exportPanel.landscape') }}</button>
                                    </div>
                                </div>

                                <label class="field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.marginTop') }}</span>
                                    <input v-model.number="draft.margins.top" type="number" min="0" max="50" step="1" />
                                </label>

                                <label class="field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.marginRight') }}</span>
                                    <input v-model.number="draft.margins.right" type="number" min="0" max="50" step="1" />
                                </label>

                                <label class="field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.marginBottom') }}</span>
                                    <input v-model.number="draft.margins.bottom" type="number" min="0" max="50" step="1" />
                                </label>

                                <label class="field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.marginLeft') }}</span>
                                    <input v-model.number="draft.margins.left" type="number" min="0" max="50" step="1" />
                                </label>
                            </div>

                            <div v-else-if="activeTab === 'style'" class="settings-grid">
                                <label class="field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.theme') }}</span>
                                    <select v-model="draft.themeMode">
                                        <option value="current">{{ t('canvas.markdownEditor.exportPanel.themeCurrent') }}</option>
                                        <option value="light">{{ t('canvas.markdownEditor.exportPanel.themeLight') }}</option>
                                        <option value="dark">{{ t('canvas.markdownEditor.exportPanel.themeDark') }}</option>
                                    </select>
                                </label>

                                <label class="field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.style') }}</span>
                                    <select v-model="draft.style">
                                        <option value="clean">{{ t('canvas.markdownEditor.exportPanel.styleClean') }}</option>
                                        <option value="academic">{{ t('canvas.markdownEditor.exportPanel.styleAcademic') }}</option>
                                        <option value="compact">{{ t('canvas.markdownEditor.exportPanel.styleCompact') }}</option>
                                    </select>
                                </label>

                                <label class="field field-wide">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.fontFamily') }}</span>
                                    <input v-model="draft.fontFamily" type="text" :placeholder="t('canvas.markdownEditor.exportPanel.fontFamilyPlaceholder')" />
                                </label>

                                <label class="field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.fontSize') }}</span>
                                    <input v-model.number="draft.fontSize" type="number" min="10" max="24" step="1" />
                                </label>

                                <label class="field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.lineHeight') }}</span>
                                    <input v-model.number="draft.lineHeight" type="number" min="1.1" max="2.4" step="0.1" />
                                </label>
                            </div>

                            <div v-else class="settings-grid">
                                <div class="field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.oversizedDiagrams') }}</span>
                                    <div class="segmented">
                                        <button type="button" :class="{ active: draft.mermaidOversize === 'scale' }" @click="draft.mermaidOversize = 'scale'">{{ t('canvas.markdownEditor.exportPanel.scale') }}</button>
                                        <button type="button" :class="{ active: draft.mermaidOversize === 'page-break' }" @click="draft.mermaidOversize = 'page-break'">{{ t('canvas.markdownEditor.exportPanel.pageBreak') }}</button>
                                    </div>
                                </div>

                                <div class="field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.fitMode') }}</span>
                                    <div class="segmented">
                                        <button type="button" :class="{ active: draft.mermaidScaleMode === 'fit-page' }" @click="draft.mermaidScaleMode = 'fit-page'">{{ t('canvas.markdownEditor.exportPanel.page') }}</button>
                                        <button type="button" :class="{ active: draft.mermaidScaleMode === 'fit-width' }" @click="draft.mermaidScaleMode = 'fit-width'">{{ t('canvas.markdownEditor.exportPanel.width') }}</button>
                                    </div>
                                </div>

                                <label class="field field-wide range-field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.globalScale', { value: draft.mermaidScalePercent }) }}</span>
                                    <input v-model.number="draft.mermaidScalePercent" type="range" min="60" max="130" step="5" />
                                </label>

                                <div class="field">
                                    <span>{{ t('canvas.markdownEditor.exportPanel.spacing') }}</span>
                                    <div class="segmented">
                                        <button type="button" :class="{ active: draft.mermaidDensity === 'compact' }" @click="draft.mermaidDensity = 'compact'">{{ t('canvas.markdownEditor.exportPanel.compact') }}</button>
                                        <button type="button" :class="{ active: draft.mermaidDensity === 'standard' }" @click="draft.mermaidDensity = 'standard'">{{ t('canvas.markdownEditor.exportPanel.standard') }}</button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>

                <footer class="md-export-footer">
                    <span>{{ footerHint }}</span>
                    <div class="md-export-footer-actions">
                        <button type="button" class="secondary" @click="close">{{ t('common.cancel') }}</button>
                        <button type="button" class="primary" :disabled="!canExport" @click="confirm">{{ actionLabel }}</button>
                    </div>
                </footer>
            </section>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
    MarkdownExportFormat,
    MarkdownExportPageSize,
    MarkdownExportSettings
} from '@/utils/markdownExport'

const { t } = useI18n()

const props = defineProps<{
    modelValue: boolean
    defaultSettings: MarkdownExportSettings
    supportsElectronPdf?: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'confirm', settings: MarkdownExportSettings): void
}>()

type TabId = 'info' | 'page' | 'style' | 'diagram'

const formats = computed<Array<{ id: MarkdownExportFormat; name: string; description: string }>>(() => [
    { id: 'pdf', name: t('canvas.markdownEditor.exportPanel.formatPdf'), description: t('canvas.markdownEditor.exportPanel.formatPdfDescription') },
    { id: 'md', name: t('canvas.markdownEditor.exportPanel.formatMarkdown'), description: t('canvas.markdownEditor.exportPanel.formatMarkdownDescription') }
])

const tabs = computed<Array<{ id: TabId; label: string }>>(() => [
    { id: 'info', label: t('canvas.markdownEditor.exportPanel.tabInfo') },
    { id: 'page', label: t('canvas.markdownEditor.exportPanel.tabPage') },
    { id: 'style', label: t('canvas.markdownEditor.exportPanel.tabStyle') },
    { id: 'diagram', label: t('canvas.markdownEditor.exportPanel.tabDiagram') }
])

const pageSizes: MarkdownExportPageSize[] = ['A4', 'A5', 'A3', 'Letter', 'Legal', 'Tabloid']
const activeTab = ref<TabId>('info')
const draft = reactive<MarkdownExportSettings>(cloneSettings(props.defaultSettings))

const visibleTabs = computed(() => draft.format === 'pdf' ? tabs.value : tabs.value.filter(tab => tab.id === 'info'))
const canExport = computed(() => Boolean(draft.fileName.trim()))
const actionLabel = computed(() => draft.format === 'pdf'
    ? t('canvas.markdownEditor.exportPanel.actionPdf')
    : t('canvas.markdownEditor.exportPanel.actionMarkdown'))
const footerHint = computed(() => {
    if (draft.format === 'md') return t('canvas.markdownEditor.exportPanel.hintMarkdown')
    if (props.supportsElectronPdf) return t('canvas.markdownEditor.exportPanel.hintPdfElectron')
    return t('canvas.markdownEditor.exportPanel.hintPdfWeb')
})

watch(() => props.modelValue, value => {
    if (!value) return
    Object.assign(draft, cloneSettings(props.defaultSettings))
    activeTab.value = 'info'
})

watch(() => draft.format, value => {
    if (value !== 'pdf') activeTab.value = 'info'
})

function cloneSettings(settings: MarkdownExportSettings): MarkdownExportSettings {
    return {
        ...settings,
        margins: { ...settings.margins }
    }
}

function close() {
    emit('update:modelValue', false)
}

function confirm() {
    if (!canExport.value) return
    emit('confirm', cloneSettings(draft))
    close()
}
</script>

<style scoped>
.md-export-layer {
    --md-export-backdrop: var(--dialog-backdrop);
    --md-export-panel: var(--dialog-bg);
    --md-export-shell: var(--dialog-section-bg);
    --md-export-text: var(--dialog-text);
    --md-export-muted: var(--dialog-muted);
    --md-export-border: var(--dialog-border);
    --md-export-control-border: var(--dialog-control-border);
    --md-export-hover: var(--dialog-control-hover);
    --md-export-subtle: var(--dialog-control-bg);
    --md-export-accent: var(--dialog-primary);
    --md-export-accent-strong: var(--dialog-primary);
    --md-export-accent-hover: var(--dialog-primary-hover);
    --md-export-focus: var(--dialog-focus);
    --md-export-shadow: var(--dialog-shadow);
    position: fixed;
    inset: 0;
    z-index: 3600;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: var(--md-export-backdrop);
    backdrop-filter: blur(8px);
    animation: md-export-fade-in 140ms ease-out;
}

.md-export-dialog {
    width: min(920px, calc(100vw - 48px));
    height: min(640px, calc(100vh - 48px));
    min-height: 560px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--md-export-control-border);
    border-radius: 8px;
    background: var(--md-export-shell);
    color: var(--md-export-text);
    box-shadow: var(--md-export-shadow);
    animation: md-export-pop-in 180ms cubic-bezier(0.2, 0.9, 0.2, 1);
}

.md-export-header,
.md-export-footer {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--md-export-border);
    background: var(--md-export-panel);
}

.md-export-footer {
    border-top: 1px solid var(--md-export-border);
    border-bottom: 0;
    color: var(--md-export-muted);
    font-size: 12px;
}

.md-export-title {
    font-size: 15px;
    font-weight: 780;
    letter-spacing: 0;
}

.md-export-subtitle {
    margin-top: 2px;
    color: var(--md-export-muted);
    font-size: 12px;
}

.md-export-close {
    width: 32px;
    height: 32px;
    border: 1px solid var(--md-export-control-border);
    border-radius: 6px;
    background: var(--md-export-panel);
    color: var(--md-export-muted);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease;
}

.md-export-close:hover {
    border-color: color-mix(in srgb, var(--md-export-accent) 38%, transparent);
    background: var(--md-export-hover);
    color: var(--md-export-accent);
}

.md-export-main {
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
}

.md-export-formats {
    padding: 12px;
    border-right: 1px solid var(--md-export-border);
    background: var(--md-export-panel);
}

.md-export-format {
    width: 100%;
    min-height: 76px;
    margin-bottom: 8px;
    padding: 12px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: color-mix(in srgb, var(--md-export-text) 78%, var(--md-export-muted));
    text-align: left;
    cursor: pointer;
    transition: background 140ms ease, border-color 140ms ease, color 140ms ease, transform 140ms ease, box-shadow 140ms ease;
}

.md-export-format.active {
    border-color: color-mix(in srgb, var(--md-export-accent) 42%, transparent);
    background: var(--md-export-hover);
    color: var(--md-export-accent);
    box-shadow: inset 3px 0 0 var(--md-export-accent-strong);
}

.md-export-format:hover {
    border-color: color-mix(in srgb, var(--md-export-accent) 28%, transparent);
    background: color-mix(in srgb, var(--md-export-hover) 64%, var(--md-export-panel));
    transform: translateX(2px);
}

.format-name,
.format-description {
    display: block;
}

.format-name {
    font-size: 13px;
    font-weight: 780;
}

.format-description {
    margin-top: 5px;
    color: var(--md-export-muted);
    font-size: 12px;
    line-height: 1.35;
}

.md-export-settings {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.md-export-tabs {
    flex: 0 0 auto;
    display: flex;
    gap: 2px;
    padding: 10px 12px 0;
    border-bottom: 1px solid var(--md-export-border);
    background: var(--md-export-shell);
}

.md-export-tabs button {
    height: 36px;
    padding: 0 14px;
    border: 1px solid transparent;
    border-bottom: 0;
    border-radius: 6px 6px 0 0;
    background: transparent;
    color: var(--md-export-muted);
    font-size: 12px;
    font-weight: 760;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease;
}

.md-export-tabs button.active {
    border-color: var(--md-export-border);
    background: var(--md-export-panel);
    color: var(--md-export-text);
    transform: translateY(1px);
}

.md-export-tabs button:not(.active):hover {
    color: var(--md-export-accent);
    background: var(--md-export-hover);
}

.md-export-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding: 18px;
    background: var(--md-export-panel);
}

.settings-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-content: start;
    animation: md-export-content-in 140ms ease-out;
}

.field {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 7px;
    color: color-mix(in srgb, var(--md-export-text) 68%, var(--md-export-muted));
    font-size: 12px;
    font-weight: 720;
}

.field-wide {
    grid-column: 1 / -1;
}

.field input,
.field select {
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border: 1px solid var(--md-export-control-border);
    border-radius: 6px;
    background: var(--md-export-panel);
    color: var(--md-export-text);
    font-size: 13px;
    outline: none;
    transition: border-color 120ms ease, box-shadow 120ms ease, background 120ms ease;
}

.field input:focus,
.field select:focus {
    border-color: color-mix(in srgb, var(--md-export-accent) 72%, transparent);
    box-shadow: 0 0 0 3px var(--md-export-focus);
}

.range-field input {
    padding: 0;
}

.segmented {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    height: 34px;
    padding: 2px;
    border: 1px solid var(--md-export-control-border);
    border-radius: 6px;
    background: var(--md-export-subtle);
}

.segmented button {
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--md-export-muted);
    font-size: 12px;
    font-weight: 760;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease;
}

.segmented button.active {
    background: var(--md-export-panel);
    color: var(--md-export-accent);
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
}

.segmented button:not(.active):hover {
    color: var(--md-export-accent);
}

.check-row {
    min-height: 34px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: color-mix(in srgb, var(--md-export-text) 78%, var(--md-export-muted));
    font-size: 13px;
    font-weight: 650;
    transition: color 120ms ease;
}

.check-row:hover {
    color: var(--md-export-accent);
}

.check-row input {
    width: 16px;
    height: 16px;
}

.md-export-note {
    grid-column: 1 / -1;
    max-width: 560px;
    margin: 4px 0 0;
    color: var(--md-export-muted);
    font-size: 13px;
    line-height: 1.55;
}

.md-export-footer-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.md-export-footer-actions button {
    height: 34px;
    padding: 0 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 780;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
}

.md-export-footer-actions .secondary {
    border: 1px solid var(--md-export-control-border);
    background: var(--md-export-panel);
    color: color-mix(in srgb, var(--md-export-text) 78%, var(--md-export-muted));
}

.md-export-footer-actions .secondary:hover {
    border-color: color-mix(in srgb, var(--md-export-accent) 38%, transparent);
    background: var(--md-export-hover);
    color: var(--md-export-accent);
}

.md-export-footer-actions .primary {
    border: 1px solid var(--md-export-accent-strong);
    background: var(--md-export-accent-strong);
    color: #ffffff;
}

.md-export-footer-actions .primary:not(:disabled):hover {
    background: var(--md-export-accent-hover);
    border-color: var(--md-export-accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 8px 18px rgba(37, 99, 235, 0.24);
}

html[data-theme='dark'] .segmented button.active {
    background: var(--md-export-hover);
}

.md-export-footer-actions .primary:not(:disabled):active,
.md-export-footer-actions .secondary:active {
    transform: translateY(0);
    box-shadow: none;
}

.md-export-footer-actions .primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

@keyframes md-export-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes md-export-pop-in {
    from {
        opacity: 0;
        transform: translateY(8px) scale(0.985);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes md-export-content-in {
    from {
        opacity: 0;
        transform: translateY(4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 760px) {
    .md-export-dialog {
        height: calc(100vh - 32px);
        min-height: 0;
    }

    .md-export-main {
        grid-template-columns: minmax(0, 1fr);
    }

    .md-export-formats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        border-right: 0;
        border-bottom: 1px solid var(--md-export-border);
    }

    .md-export-format {
        margin-bottom: 0;
    }

    .settings-grid {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>

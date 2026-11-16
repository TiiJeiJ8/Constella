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

<style scoped src="./MarkdownExportPanel.css"></style>

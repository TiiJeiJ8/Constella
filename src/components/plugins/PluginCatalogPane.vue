<template>
    <section class="plugin-pane">
        <div class="plugin-pane-header">
            <div class="plugin-pane-heading">
                <h3 class="plugin-pane-title">{{ text.title }}</h3>
                <p class="plugin-pane-subtitle">{{ text.description }}</p>
            </div>
            <button class="plugin-btn plugin-btn-muted plugin-refresh-btn" :disabled="busy" @click="refreshCatalog">
                {{ text.refresh }}
            </button>
        </div>

        <div
            v-if="supportsPluginManagement"
            class="plugin-dropzone"
            :class="dropzoneClass"
            @click="openPicker"
            @dragenter.prevent="handleDragEnter"
            @dragover.prevent="handleDragOver"
            @dragleave.prevent="handleDragLeave"
            @drop.prevent="handleDrop"
        >
            <div class="plugin-dropzone-sidebar">
                <div class="plugin-dropzone-badge">{{ dropzoneBadge }}</div>
                <div class="plugin-dropzone-emblem">
                    <div class="plugin-dropzone-emblem-core">
                        <span class="plugin-dropzone-emblem-line plugin-dropzone-emblem-line-v"></span>
                        <span class="plugin-dropzone-emblem-line plugin-dropzone-emblem-line-h"></span>
                    </div>
                </div>
            </div>

            <div class="plugin-dropzone-main">
                <div class="plugin-dropzone-title">{{ dropzoneTitle }}</div>
                <div class="plugin-dropzone-description">{{ text.dropDescription }}</div>
                <div class="plugin-dropzone-pills">
                    <span class="plugin-drop-pill">{{ text.dropPillFolder }}</span>
                    <span class="plugin-drop-pill">{{ text.dropPillArchive }}</span>
                    <span class="plugin-drop-pill">{{ text.dropPillClick }}</span>
                </div>
                <div class="plugin-dropzone-hint">{{ dropzoneHint }}</div>
            </div>
        </div>

        <div v-if="errorMessage" class="plugin-callout plugin-callout-error">{{ errorMessage }}</div>
        <div v-else-if="!supportsPluginManagement" class="plugin-callout">{{ text.desktopOnly }}</div>

        <div class="plugin-market-shelf">
            <div class="plugin-market-copy">
                <div class="plugin-market-eyebrow">{{ text.marketEyebrow }}</div>
                <div class="plugin-market-title">{{ text.marketTitle }}</div>
                <div class="plugin-market-desc">{{ text.marketDescription }}</div>
            </div>
            <div class="plugin-market-chip">{{ text.marketSoon }}</div>
        </div>

        <div class="plugin-section">
            <div class="plugin-section-head">
                <h4>{{ text.builtinTitle }}</h4>
                <span class="plugin-count">{{ builtinPlugins.length }}</span>
            </div>
            <div class="plugin-grid">
                <article v-for="plugin in builtinPlugins" :key="plugin.kind" class="plugin-card plugin-card-builtin">
                    <div class="plugin-card-row">
                        <div class="plugin-icon">{{ plugin.icon }}</div>
                        <div>
                            <div class="plugin-name">{{ localizedPluginName(plugin) }}</div>
                            <div class="plugin-kind">{{ plugin.kind }}</div>
                        </div>
                    </div>
                    <p class="plugin-description">{{ localizedPluginDescription(plugin) }}</p>
                    <div class="plugin-tags">
                        <span class="plugin-tag">{{ text.builtinTag }}</span>
                        <span v-if="plugin.editable" class="plugin-tag">{{ text.editableTag }}</span>
                        <span v-if="plugin.supportsCardMode" class="plugin-tag">{{ text.cardTag }}</span>
                    </div>
                </article>
            </div>
        </div>

        <div class="plugin-section">
            <div class="plugin-section-head">
                <h4>{{ text.installedTitle }}</h4>
                <span class="plugin-count">{{ installedPlugins.length }}</span>
            </div>

            <div v-if="installedPlugins.length > 0" class="plugin-grid">
                <article v-for="plugin in installedPlugins" :key="`${plugin.id}:${plugin.version}`" class="plugin-card">
                    <div class="plugin-card-row plugin-card-row-top">
                        <div>
                            <div class="plugin-name">{{ plugin.name }}</div>
                            <div class="plugin-kind">{{ plugin.id }}</div>
                        </div>
                        <label class="plugin-toggle">
                            <input
                                type="checkbox"
                                :checked="plugin.enabled"
                                :disabled="busy"
                                @change="togglePlugin(plugin.id, ($event.target as HTMLInputElement).checked)"
                            />
                            <span class="plugin-toggle-track"></span>
                        </label>
                    </div>

                    <div class="plugin-meta-line">
                        <span>v{{ plugin.version }}</span>
                        <span>{{ text.source }}: {{ plugin.source }}</span>
                    </div>

                    <p v-if="plugin.description" class="plugin-description">{{ plugin.description }}</p>

                    <div class="plugin-meta-stack">
                        <div>{{ text.author }}: {{ plugin.author || '-' }}</div>
                        <div>{{ text.installedAt }}: {{ formatInstalledTime(plugin.installedAt) }}</div>
                        <div>{{ text.nodeKinds }}: {{ plugin.manifest.nodes.map(node => node.kind).join(', ') }}</div>
                    </div>

                    <div class="plugin-card-actions">
                        <button class="plugin-btn plugin-btn-danger" :disabled="busy" @click="removePlugin(plugin.id, plugin.name)">
                            {{ text.remove }}
                        </button>
                    </div>
                </article>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getPluginsMeta, pluginCatalogVersion, type PluginMeta } from '@/plugins'
import { reloadPlugins } from '@/plugins/register'
import {
    installPluginPackage,
    refreshInstalledPluginsCatalog,
    removeInstalledPlugin,
    setInstalledPluginEnabled
} from '@/plugins/installed'
import type { InstalledPluginRecord } from '@/plugins/package'

type DroppedFile = File & { path?: string }
type DropFeedback = 'idle' | 'valid' | 'invalid'

const { locale, t, te } = useI18n()

const installedPlugins = ref<InstalledPluginRecord[]>([])
const errorMessage = ref('')
const busy = ref(false)
const isDragging = ref(false)
const dragDepth = ref(0)
const dropFeedback = ref<DropFeedback>('idle')

const supportsPluginManagement = computed(() => Boolean(window.electron?.listInstalledPlugins))
const installedKinds = computed(() => {
    const kinds = new Set<string>()
    for (const plugin of installedPlugins.value) {
        for (const node of plugin.manifest?.nodes || []) {
            kinds.add(node.kind)
        }
    }
    return kinds
})

const builtinPlugins = computed(() => {
    pluginCatalogVersion.value
    return getPluginsMeta().filter(plugin => !installedKinds.value.has(plugin.kind))
})

const text = computed(() => {
    if (locale.value === 'zh-CN') {
        return {
            title: '插件',
            description: '这里展示内置节点与已安装插件，并为后续插件市场预留界面位置。',
            refresh: '刷新',
            remove: '卸载',
            desktopOnly: '仅 Electron 桌面端支持插件安装与管理。',
            builtinTitle: '内置节点',
            installedTitle: '已安装插件',
            builtinTag: '内置',
            editableTag: '可编辑',
            cardTag: '卡片模式',
            author: '作者',
            source: '来源',
            installedAt: '安装时间',
            nodeKinds: '节点类型',
            dropTitle: '拖拽插件到这里',
            dropTitleActive: '松手即可导入',
            dropTitleInvalid: '当前内容不可导入',
            dropTitleBusy: '正在导入插件…',
            dropDescription: '支持插件文件夹、manifest.json，以及 zip / .constella-plugin 安装包。',
            dropHint: '也可以点击这里打开选择器。',
            dropHintActive: '已识别到可安装内容，释放鼠标后立即开始导入。',
            dropHintInvalid: '请拖入插件文件夹、manifest.json，或插件压缩包。',
            dropHintBusy: '导入完成后会自动刷新插件列表。',
            dropBadgeIdle: 'Import',
            dropBadgeValid: 'Ready',
            dropBadgeInvalid: 'Unsupported',
            dropBadgeBusy: 'Importing',
            dropPillFolder: '文件夹',
            dropPillArchive: 'ZIP / 插件包',
            dropPillClick: '点击选择',
            marketEyebrow: 'Plugin Market',
            marketTitle: '插件市场',
            marketDescription: '后续这里可以承载精选插件、分类、评分、更新与在线安装等市场能力。',
            marketSoon: '即将到来'
        }
    }

    return {
        title: 'Plugins',
        description: 'This view shows built-in nodes and installed plugins, with room reserved for a future marketplace.',
        refresh: 'Refresh',
        remove: 'Remove',
        desktopOnly: 'Plugin installation and management are only available in the Electron desktop app.',
        builtinTitle: 'Built-in Nodes',
        installedTitle: 'Installed Plugins',
        builtinTag: 'Built-in',
        editableTag: 'Editable',
        cardTag: 'Card Mode',
        author: 'Author',
        source: 'Source',
        installedAt: 'Installed',
        nodeKinds: 'Node kinds',
        dropTitle: 'Drop plugin here',
        dropTitleActive: 'Release to import',
        dropTitleInvalid: 'This item cannot be imported',
        dropTitleBusy: 'Importing plugin…',
        dropDescription: 'Supports plugin folders, manifest.json, and zip / .constella-plugin packages.',
        dropHint: 'You can also click here to open the picker.',
        dropHintActive: 'Valid plugin content detected. Release to start importing.',
        dropHintInvalid: 'Please drop a plugin folder, manifest.json, or plugin archive.',
        dropHintBusy: 'The plugin list will refresh automatically when the import finishes.',
        dropBadgeIdle: 'Import',
        dropBadgeValid: 'Ready',
        dropBadgeInvalid: 'Unsupported',
        dropBadgeBusy: 'Importing',
        dropPillFolder: 'Folder',
        dropPillArchive: 'ZIP / Package',
        dropPillClick: 'Click to pick',
        marketEyebrow: 'Plugin Market',
        marketTitle: 'Marketplace',
        marketDescription: 'This area can later host featured plugins, categories, ratings, updates, and online installs.',
        marketSoon: 'Coming Soon'
    }
})

const dropzoneClass = computed(() => ({
    'is-busy': busy.value,
    'is-valid': isDragging.value && dropFeedback.value === 'valid',
    'is-invalid': isDragging.value && dropFeedback.value === 'invalid'
}))

const dropzoneTitle = computed(() => {
    if (busy.value) return text.value.dropTitleBusy
    if (isDragging.value && dropFeedback.value === 'valid') return text.value.dropTitleActive
    if (isDragging.value && dropFeedback.value === 'invalid') return text.value.dropTitleInvalid
    return text.value.dropTitle
})

const dropzoneHint = computed(() => {
    if (busy.value) return text.value.dropHintBusy
    if (isDragging.value && dropFeedback.value === 'valid') return text.value.dropHintActive
    if (isDragging.value && dropFeedback.value === 'invalid') return text.value.dropHintInvalid
    return text.value.dropHint
})

const dropzoneBadge = computed(() => {
    if (busy.value) return text.value.dropBadgeBusy
    if (isDragging.value && dropFeedback.value === 'valid') return text.value.dropBadgeValid
    if (isDragging.value && dropFeedback.value === 'invalid') return text.value.dropBadgeInvalid
    return text.value.dropBadgeIdle
})

function localizedPluginName(plugin: PluginMeta) {
    const key = `canvas.nodeTypes.${plugin.kind}`
    return te(key) ? t(key) : plugin.label
}

function localizedPluginDescription(plugin: PluginMeta) {
    const key = `canvas.nodeTypeDesc.${plugin.kind}`
    return te(key) ? t(key) : plugin.description
}

function formatInstalledTime(value: string) {
    if (!value) return '-'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function getDroppedPluginPath(event: DragEvent): string | null {
    const files = Array.from(event.dataTransfer?.files || []) as DroppedFile[]
    const file = files[0]
    if (!file) return null
    return typeof file.path === 'string' && file.path.trim() ? file.path : null
}

function isSupportedPluginPath(sourcePath: string): boolean {
    const normalized = sourcePath.toLowerCase()
    return (
        !normalized.includes('.') ||
        normalized.endsWith('\\') ||
        normalized.endsWith('/manifest.json') ||
        normalized.endsWith('.zip') ||
        normalized.endsWith('.constella-plugin')
    )
}

async function refreshCatalog() {
    if (!supportsPluginManagement.value) {
        installedPlugins.value = []
        return
    }

    errorMessage.value = ''
    installedPlugins.value = await refreshInstalledPluginsCatalog()
}

async function syncPluginRuntime() {
    await refreshCatalog()
    await reloadPlugins()
}

async function installFromSource(sourcePath?: string) {
    if (!supportsPluginManagement.value) return

    busy.value = true
    errorMessage.value = ''
    try {
        await installPluginPackage(sourcePath)
        await syncPluginRuntime()
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!/cancel/i.test(message)) {
            errorMessage.value = message
        }
    } finally {
        busy.value = false
    }
}

async function openPicker() {
    if (busy.value) return
    await installFromSource()
}

function handleDragEnter(event: DragEvent) {
    if (busy.value || !supportsPluginManagement.value) return
    dragDepth.value += 1
    isDragging.value = true
    const sourcePath = getDroppedPluginPath(event)
    dropFeedback.value = sourcePath && isSupportedPluginPath(sourcePath) ? 'valid' : 'invalid'
}

function handleDragOver(event: DragEvent) {
    if (!supportsPluginManagement.value || busy.value) return
    const sourcePath = getDroppedPluginPath(event)
    dropFeedback.value = sourcePath && isSupportedPluginPath(sourcePath) ? 'valid' : 'invalid'
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = dropFeedback.value === 'valid' ? 'copy' : 'none'
    }
}

function handleDragLeave() {
    if (!supportsPluginManagement.value || busy.value) return
    dragDepth.value = Math.max(0, dragDepth.value - 1)
    if (dragDepth.value === 0) {
        isDragging.value = false
        dropFeedback.value = 'idle'
    }
}

async function handleDrop(event: DragEvent) {
    dragDepth.value = 0
    isDragging.value = false

    const sourcePath = getDroppedPluginPath(event)
    const isValid = Boolean(sourcePath && isSupportedPluginPath(sourcePath))
    dropFeedback.value = 'idle'

    if (!sourcePath || !isValid) {
        errorMessage.value = text.value.dropHintInvalid
        return
    }

    await installFromSource(sourcePath)
}

async function togglePlugin(pluginId: string, enabled: boolean) {
    busy.value = true
    errorMessage.value = ''
    try {
        await setInstalledPluginEnabled(pluginId, enabled)
        await syncPluginRuntime()
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : String(error)
    } finally {
        busy.value = false
    }
}

async function removePlugin(pluginId: string, pluginName: string) {
    const confirmed = confirm(
        locale.value === 'zh-CN'
            ? `确定要卸载插件“${pluginName}”吗？`
            : `Remove plugin "${pluginName}"?`
    )
    if (!confirmed) return

    busy.value = true
    errorMessage.value = ''
    try {
        await removeInstalledPlugin(pluginId)
        await syncPluginRuntime()
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : String(error)
    } finally {
        busy.value = false
    }
}

watch(() => locale.value, () => {
    void refreshCatalog()
}, { immediate: true })
</script>

<style scoped>
.plugin-pane {
    display: grid;
    gap: 20px;
}

.plugin-pane-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

.plugin-pane-heading {
    display: grid;
    gap: 6px;
}

.plugin-pane-title {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
}

.plugin-pane-subtitle {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.6;
    font-size: 0.92rem;
    max-width: 720px;
}

.plugin-refresh-btn {
    flex-shrink: 0;
    margin-top: 2px;
}

.plugin-dropzone {
    display: grid;
    grid-template-columns: 132px minmax(0, 1fr);
    gap: 20px;
    align-items: center;
    padding: 22px;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    background:
        linear-gradient(180deg, rgba(59, 130, 246, 0.045), rgba(59, 130, 246, 0.015)),
        var(--bg-secondary);
    cursor: pointer;
    transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.plugin-dropzone:hover {
    border-color: rgba(59, 130, 246, 0.28);
    background:
        linear-gradient(180deg, rgba(59, 130, 246, 0.055), rgba(59, 130, 246, 0.02)),
        var(--bg-secondary);
}

.plugin-dropzone.is-valid {
    border-color: rgba(34, 197, 94, 0.38);
    background:
        linear-gradient(180deg, rgba(34, 197, 94, 0.075), rgba(34, 197, 94, 0.025)),
        var(--bg-secondary);
    box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.08);
}

.plugin-dropzone.is-invalid {
    border-color: rgba(239, 68, 68, 0.32);
    background:
        linear-gradient(180deg, rgba(239, 68, 68, 0.06), rgba(239, 68, 68, 0.02)),
        var(--bg-secondary);
    box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.06);
}

.plugin-dropzone.is-busy {
    opacity: 0.8;
    cursor: progress;
}

.plugin-dropzone-sidebar {
    display: grid;
    justify-items: center;
    gap: 14px;
}

.plugin-dropzone-badge {
    padding: 5px 10px;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.12);
    color: #2563eb;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.plugin-dropzone.is-valid .plugin-dropzone-badge {
    background: rgba(34, 197, 94, 0.12);
    color: #15803d;
}

.plugin-dropzone.is-invalid .plugin-dropzone-badge {
    background: rgba(239, 68, 68, 0.12);
    color: #dc2626;
}

.plugin-dropzone-emblem {
    width: 92px;
    height: 92px;
    border-radius: 24px;
    background:
        linear-gradient(180deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.04)),
        var(--bg-primary);
    border: 1px solid rgba(59, 130, 246, 0.14);
    display: flex;
    align-items: center;
    justify-content: center;
}

.plugin-dropzone.is-valid .plugin-dropzone-emblem {
    background:
        linear-gradient(180deg, rgba(34, 197, 94, 0.14), rgba(34, 197, 94, 0.05)),
        var(--bg-primary);
    border-color: rgba(34, 197, 94, 0.16);
}

.plugin-dropzone.is-invalid .plugin-dropzone-emblem {
    background:
        linear-gradient(180deg, rgba(239, 68, 68, 0.14), rgba(239, 68, 68, 0.05)),
        var(--bg-primary);
    border-color: rgba(239, 68, 68, 0.16);
}

.plugin-dropzone-emblem-core {
    position: relative;
    width: 46px;
    height: 46px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.86);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.plugin-dropzone-emblem-line {
    position: absolute;
    top: 50%;
    left: 50%;
    background: #2563eb;
    border-radius: 999px;
    transform: translate(-50%, -50%);
}

.plugin-dropzone.is-valid .plugin-dropzone-emblem-line {
    background: #16a34a;
}

.plugin-dropzone.is-invalid .plugin-dropzone-emblem-line {
    background: #dc2626;
}

.plugin-dropzone-emblem-line-v {
    width: 4px;
    height: 20px;
}

.plugin-dropzone-emblem-line-h {
    width: 20px;
    height: 4px;
}

.plugin-dropzone-main {
    display: grid;
    gap: 10px;
}

.plugin-dropzone-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
}

.plugin-dropzone-description {
    color: var(--text-secondary);
    line-height: 1.6;
}

.plugin-dropzone-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.plugin-drop-pill {
    padding: 5px 10px;
    border-radius: 999px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 700;
}

.plugin-dropzone-hint {
    font-size: 12px;
    color: var(--text-tertiary, var(--text-secondary));
}

.plugin-btn {
    border: none;
    border-radius: 999px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease, opacity 0.22s ease;
}

.plugin-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
}

.plugin-btn:active:not(:disabled) {
    transform: translateY(0);
}

.plugin-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.plugin-btn-muted {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.plugin-btn-danger {
    background: rgba(239, 68, 68, 0.12);
    color: #dc2626;
}

.plugin-callout {
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--bg-secondary);
    color: var(--text-secondary);
}

.plugin-callout-error {
    background: rgba(239, 68, 68, 0.08);
    color: #dc2626;
}

.plugin-market-shelf {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    border: 1px solid var(--border-color);
    border-radius: 18px;
    padding: 18px;
    background: linear-gradient(135deg, rgba(17, 24, 39, 0.035), rgba(59, 130, 246, 0.07));
}

.plugin-market-eyebrow {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-secondary);
}

.plugin-market-title {
    margin-top: 6px;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
}

.plugin-market-desc {
    margin-top: 6px;
    color: var(--text-secondary);
    line-height: 1.6;
}

.plugin-market-chip {
    flex-shrink: 0;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.12);
    color: #2563eb;
    font-size: 12px;
    font-weight: 700;
}

.plugin-section {
    display: grid;
    gap: 14px;
}

.plugin-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.plugin-section-head h4 {
    margin: 0;
    font-size: 0.98rem;
    color: var(--text-primary);
}

.plugin-count {
    min-width: 28px;
    height: 28px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 700;
}

.plugin-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.plugin-card {
    border: 1px solid var(--border-color);
    border-radius: 18px;
    padding: 16px;
    background: var(--bg-secondary);
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.plugin-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
    border-color: rgba(59, 130, 246, 0.28);
}

.plugin-card-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.plugin-card-row-top {
    justify-content: space-between;
    align-items: flex-start;
}

.plugin-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    font-size: 20px;
}

.plugin-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
}

.plugin-kind,
.plugin-meta-line,
.plugin-meta-stack {
    color: var(--text-secondary);
    font-size: 12px;
}

.plugin-kind {
    margin-top: 4px;
    word-break: break-all;
}

.plugin-description {
    margin: 12px 0 0;
    color: var(--text-primary);
    line-height: 1.6;
}

.plugin-meta-line,
.plugin-meta-stack,
.plugin-tags,
.plugin-card-actions {
    margin-top: 12px;
}

.plugin-meta-line {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.plugin-meta-stack {
    display: grid;
    gap: 6px;
}

.plugin-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.plugin-tag {
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 700;
}

.plugin-card-actions {
    display: flex;
    justify-content: flex-end;
}

.plugin-toggle {
    position: relative;
    display: inline-flex;
}

.plugin-toggle input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.plugin-toggle-track {
    width: 46px;
    height: 28px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.35);
    position: relative;
    transition: background-color 0.22s ease;
}

.plugin-toggle-track::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
    transition: transform 0.22s ease;
}

.plugin-toggle input:checked + .plugin-toggle-track {
    background: #2563eb;
}

.plugin-toggle input:checked + .plugin-toggle-track::after {
    transform: translateX(18px);
}

@media (max-width: 768px) {
    .plugin-pane-header,
    .plugin-market-shelf {
        flex-direction: column;
        align-items: stretch;
    }

    .plugin-dropzone {
        grid-template-columns: 1fr;
        padding: 18px;
    }

    .plugin-dropzone-sidebar {
        justify-items: start;
    }

    .plugin-refresh-btn {
        width: 100%;
    }
}
</style>

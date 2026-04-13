<template>
    <section class="plugin-pane">
        <div class="plugin-pane-header">
            <div class="plugin-pane-heading">
                <h3 class="plugin-pane-title">{{ text.title }}</h3>
                <p class="plugin-pane-subtitle">{{ text.description }}</p>
            </div>
            <button class="plugin-btn plugin-btn-muted plugin-refresh-btn" :disabled="busy" @click="syncPluginRuntime">
                {{ text.refresh }}
            </button>
        </div>

        <div v-if="supportsPluginManagement" class="plugin-actions-grid">
            <button
                type="button"
                class="plugin-import-panel"
                :class="{ 'is-busy': busy }"
                :disabled="busy"
                @click="openPackagePicker"
            >
                <div class="plugin-import-sidebar">
                    <div class="plugin-import-badge">{{ text.packageBadge }}</div>
                    <div class="plugin-import-emblem">
                        <div class="plugin-import-emblem-core">
                            <span class="plugin-import-emblem-line plugin-import-emblem-line-v"></span>
                            <span class="plugin-import-emblem-line plugin-import-emblem-line-h"></span>
                        </div>
                    </div>
                </div>

                <div class="plugin-import-main">
                    <div class="plugin-import-title">{{ busy ? text.packageTitleBusy : text.packageTitle }}</div>
                    <div class="plugin-import-description">{{ text.packageDescription }}</div>
                    <div class="plugin-import-pills">
                        <span class="plugin-import-pill">{{ text.packagePillPrimary }}</span>
                        <span class="plugin-import-pill">{{ text.packagePillCompat }}</span>
                    </div>
                    <div class="plugin-import-hint">{{ text.packageHint }}</div>
                </div>
            </button>

            <button
                v-if="developerMode"
                type="button"
                class="plugin-import-panel plugin-import-panel-dev"
                :class="{ 'is-busy': busy }"
                :disabled="busy"
                @click="openDevelopmentPicker"
            >
                <div class="plugin-import-sidebar">
                    <div class="plugin-import-badge plugin-import-badge-dev">{{ text.developmentBadge }}</div>
                    <div class="plugin-import-emblem plugin-import-emblem-dev">
                        <div class="plugin-import-emblem-core">
                            <span class="plugin-import-emblem-line plugin-import-emblem-line-v"></span>
                            <span class="plugin-import-emblem-line plugin-import-emblem-line-h"></span>
                        </div>
                    </div>
                </div>

                <div class="plugin-import-main">
                    <div class="plugin-import-title">{{ busy ? text.developmentTitleBusy : text.developmentTitle }}</div>
                    <div class="plugin-import-description">{{ text.developmentDescription }}</div>
                    <div class="plugin-import-pills">
                        <span class="plugin-import-pill">{{ text.developmentPillFolder }}</span>
                        <span class="plugin-import-pill">{{ text.developmentPillManifest }}</span>
                    </div>
                    <div class="plugin-import-hint">{{ text.developmentHint }}</div>
                </div>
            </button>
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

        <div v-if="developerMode" class="plugin-section">
            <div class="plugin-section-head">
                <h4>{{ text.developmentListTitle }}</h4>
                <span class="plugin-count">{{ developmentPlugins.length }}</span>
            </div>

            <div v-if="developmentPlugins.length > 0" class="plugin-grid">
                <article v-for="plugin in developmentPlugins" :key="`${plugin.id}:${plugin.sourcePath}`" class="plugin-card plugin-card-dev">
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
                                @change="toggleDevelopmentPlugin(plugin.id, ($event.target as HTMLInputElement).checked)"
                            />
                            <span class="plugin-toggle-track"></span>
                        </label>
                    </div>

                    <div class="plugin-meta-line">
                        <span>v{{ plugin.version }}</span>
                        <span>{{ text.source }}: {{ text.developmentSource }}</span>
                    </div>

                    <p v-if="plugin.description" class="plugin-description">{{ plugin.description }}</p>

                    <div class="plugin-meta-stack">
                        <div>{{ text.author }}: {{ plugin.author || '-' }}</div>
                        <div>{{ text.addedAt }}: {{ formatInstalledTime(plugin.addedAt) }}</div>
                        <div>{{ text.path }}: {{ plugin.sourcePath }}</div>
                        <div>{{ text.nodeKinds }}: {{ plugin.manifest.nodes.map(node => node.kind).join(', ') }}</div>
                    </div>

                    <div class="plugin-card-actions">
                        <button class="plugin-btn plugin-btn-danger" :disabled="busy" @click="removeDevelopment(plugin.id, plugin.name)">
                            {{ text.remove }}
                        </button>
                    </div>
                </article>
            </div>
        </div>

        <div v-if="developerMode && developmentDiagnostics.length > 0" class="plugin-section">
            <div class="plugin-section-head">
                <h4>{{ text.diagnosticsTitle }}</h4>
                <span class="plugin-count">{{ developmentDiagnostics.length }}</span>
            </div>
            <div class="plugin-diagnostics">
                <article
                    v-for="diagnostic in developmentDiagnostics"
                    :key="diagnostic.id"
                    class="plugin-diagnostic-card"
                    :class="`plugin-diagnostic-${diagnostic.severity}`"
                >
                    <div class="plugin-card-row plugin-card-row-top">
                        <div>
                            <div class="plugin-name">{{ diagnostic.pluginName || diagnostic.pluginId || text.unknownPlugin }}</div>
                            <div class="plugin-kind">{{ formatDiagnosticStage(diagnostic) }}</div>
                        </div>
                        <span class="plugin-tag" :class="`plugin-tag-${diagnostic.severity}`">{{ diagnostic.severity }}</span>
                    </div>
                    <p class="plugin-description">{{ diagnostic.message }}</p>
                    <div class="plugin-meta-stack">
                        <div v-if="diagnostic.nodeKind">{{ text.nodeKinds }}: {{ diagnostic.nodeKind }}</div>
                        <div v-if="diagnostic.sourcePath">{{ text.path }}: {{ diagnostic.sourcePath }}</div>
                        <div v-if="diagnostic.filePath">{{ text.file }}: {{ diagnostic.filePath }}</div>
                        <div>{{ text.updatedAt }}: {{ formatInstalledTime(diagnostic.timestamp) }}</div>
                    </div>
                    <details v-if="diagnostic.detail" class="plugin-diagnostic-detail">
                        <summary>{{ text.details }}</summary>
                        <pre>{{ diagnostic.detail }}</pre>
                    </details>
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
                                @change="toggleInstalledPlugin(plugin.id, ($event.target as HTMLInputElement).checked)"
                            />
                            <span class="plugin-toggle-track"></span>
                        </label>
                    </div>

                    <div class="plugin-meta-line">
                        <span>v{{ plugin.version }}</span>
                        <span>{{ text.source }}: {{ plugin.source === 'archive' ? text.packageSource : text.directorySource }}</span>
                    </div>

                    <p v-if="plugin.description" class="plugin-description">{{ plugin.description }}</p>

                    <div class="plugin-meta-stack">
                        <div>{{ text.author }}: {{ plugin.author || '-' }}</div>
                        <div>{{ text.installedAt }}: {{ formatInstalledTime(plugin.installedAt) }}</div>
                        <div>{{ text.nodeKinds }}: {{ plugin.manifest.nodes.map(node => node.kind).join(', ') }}</div>
                    </div>

                    <div class="plugin-card-actions">
                        <button class="plugin-btn plugin-btn-danger" :disabled="busy" @click="removeInstalled(plugin.id, plugin.name)">
                            {{ text.remove }}
                        </button>
                    </div>
                </article>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { pluginCatalogVersion, pluginRegistry, type PluginMeta } from '@/plugins'
import { reloadPlugins } from '@/plugins/register'
import {
    addDevelopmentPlugin,
    installPluginPackage,
    refreshDevelopmentPluginDiagnostics,
    refreshDevelopmentPluginsCatalog,
    refreshInstalledPluginsCatalog,
    removeDevelopmentPlugin,
    removeInstalledPlugin,
    setDevelopmentPluginEnabled,
    setInstalledPluginEnabled
} from '@/plugins/installed'
import type { DevelopmentPluginRecord, InstalledPluginRecord, PluginDiagnosticRecord } from '@/plugins/package'

const { locale, t, te } = useI18n()

const installedPlugins = ref<InstalledPluginRecord[]>([])
const developmentPlugins = ref<DevelopmentPluginRecord[]>([])
const errorMessage = ref('')
const busy = ref(false)
const developerMode = ref(false)

const supportsPluginManagement = computed(() =>
    Boolean(window.electron?.listInstalledPlugins && window.electron?.listDevelopmentPlugins)
)

const builtinPlugins = computed(() => {
    pluginCatalogVersion.value
    return pluginRegistry.getBuiltinMeta()
})

const developmentDiagnostics = computed<PluginDiagnosticRecord[]>(() => {
    pluginCatalogVersion.value
    return pluginRegistry.getPluginDiagnostics('development')
})

const text = computed(() => locale.value === 'zh-CN'
    ? {
        title: '插件',
        description: '这里展示内置正式节点、开发插件与已安装插件，并为未来插件市场预留界面。',
        refresh: '刷新',
        remove: '移除',
        desktopOnly: '插件安装与开发加载仅在 Electron 桌面端可用。',
        builtinTitle: '正式节点',
        developmentListTitle: '开发插件',
        installedTitle: '已安装插件',
        builtinTag: '内置',
        editableTag: '可编辑',
        cardTag: '卡片模式',
        author: '作者',
        source: '来源',
        path: '路径',
        addedAt: '加载时间',
        installedAt: '安装时间',
        nodeKinds: '节点类型',
        packageTitle: '导入插件安装包',
        packageTitleBusy: '正在导入安装包…',
        packageDescription: '面向普通用户，推荐导入 `.constella-plugin` 安装包，也兼容 `.zip`。',
        packageHint: '点击打开文件选择器，导入插件安装包。',
        packageBadge: 'Package',
        packagePillPrimary: '.constella-plugin',
        packagePillCompat: '.zip',
        developmentTitle: '加载开发插件目录',
        developmentTitleBusy: '正在加载开发插件…',
        developmentDescription: '面向开发者，选择包含 `manifest.json` 的插件目录进行本地调试加载。',
        developmentHint: '点击打开目录选择器，不会复制源码目录内容。',
        developmentBadge: 'Development',
        developmentPillFolder: 'Plugin Folder',
        developmentPillManifest: 'manifest.json',
        packageSource: '安装包',
        directorySource: '目录',
        developmentSource: '开发目录',
        marketEyebrow: 'Plugin Market',
        marketTitle: '插件市场',
        marketDescription: '这里将用于后续承载市场入口、精选插件、分类、评分、更新与在线安装能力。',
        marketSoon: '即将推出',
        diagnosticsTitle: '插件诊断',
        file: '文件',
        updatedAt: '更新',
        details: '详情',
        unknownPlugin: '未知插件'
    }
    : {
        title: 'Plugins',
        description: 'This view shows built-in official nodes, development plugins, installed plugins, and a reserved marketplace area.',
        refresh: 'Refresh',
        remove: 'Remove',
        desktopOnly: 'Plugin installation and development loading are only available in the Electron desktop app.',
        builtinTitle: 'Built-in Nodes',
        developmentListTitle: 'Development Plugins',
        installedTitle: 'Installed Plugins',
        builtinTag: 'Built-in',
        editableTag: 'Editable',
        cardTag: 'Card Mode',
        author: 'Author',
        source: 'Source',
        path: 'Path',
        addedAt: 'Added',
        installedAt: 'Installed',
        nodeKinds: 'Node kinds',
        packageTitle: 'Import Plugin Package',
        packageTitleBusy: 'Importing package…',
        packageDescription: 'For end users, prefer `.constella-plugin` packages, with `.zip` as a compatibility format.',
        packageHint: 'Click to open the file picker and import a plugin package.',
        packageBadge: 'Package',
        packagePillPrimary: '.constella-plugin',
        packagePillCompat: '.zip',
        developmentTitle: 'Load Development Plugin',
        developmentTitleBusy: 'Loading development plugin…',
        developmentDescription: 'For developers, choose a plugin directory that contains `manifest.json` for local iteration.',
        developmentHint: 'Click to open the folder picker. Source files stay in place.',
        developmentBadge: 'Development',
        developmentPillFolder: 'Plugin Folder',
        developmentPillManifest: 'manifest.json',
        packageSource: 'Package',
        directorySource: 'Directory',
        developmentSource: 'Development Folder',
        marketEyebrow: 'Plugin Market',
        marketTitle: 'Marketplace',
        marketDescription: 'This area is reserved for future marketplace entry points, featured plugins, categories, ratings, updates, and online installs.',
        marketSoon: 'Coming Soon',
        diagnosticsTitle: 'Plugin Diagnostics',
        file: 'File',
        updatedAt: 'Updated',
        details: 'Details',
        unknownPlugin: 'Unknown plugin'
    }
)

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

async function refreshCatalog() {
    if (!supportsPluginManagement.value) {
        installedPlugins.value = []
        developmentPlugins.value = []
        pluginRegistry.setPluginDiagnostics('development', [])
        return
    }

    errorMessage.value = ''
    const [nextInstalled, nextDevelopment] = await Promise.all([
        refreshInstalledPluginsCatalog(),
        refreshDevelopmentPluginsCatalog()
    ])
    installedPlugins.value = nextInstalled
    developmentPlugins.value = nextDevelopment
    await refreshDevelopmentPluginDiagnostics()
}

function readDeveloperModeSetting() {
    try {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}')
        developerMode.value = settings.developerMode === true
    } catch {
        developerMode.value = false
    }
}

function handleSettingsUpdated(event: Event) {
    const customEvent = event as CustomEvent<Record<string, unknown>>
    developerMode.value = customEvent.detail?.developerMode === true
}

async function syncPluginRuntime() {
    await refreshCatalog()
    await reloadPlugins()
    await refreshDevelopmentPluginDiagnostics()
}

function formatDiagnosticStage(diagnostic: PluginDiagnosticRecord) {
    const scopeLabel = diagnostic.scope === 'electron' ? 'Electron' : 'Runtime'
    return `${scopeLabel} / ${diagnostic.stage}`
}

async function runBusyAction(action: () => Promise<void>) {
    busy.value = true
    errorMessage.value = ''
    try {
        await action()
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!/cancel/i.test(message)) {
            errorMessage.value = message
        }
    } finally {
        busy.value = false
    }
}

async function openPackagePicker() {
    if (busy.value) return
    await runBusyAction(async () => {
        await installPluginPackage()
        await syncPluginRuntime()
    })
}

async function openDevelopmentPicker() {
    if (busy.value) return
    await runBusyAction(async () => {
        await addDevelopmentPlugin()
        await syncPluginRuntime()
    })
}

async function toggleInstalledPlugin(pluginId: string, enabled: boolean) {
    await runBusyAction(async () => {
        await setInstalledPluginEnabled(pluginId, enabled)
        await syncPluginRuntime()
    })
}

async function toggleDevelopmentPlugin(pluginId: string, enabled: boolean) {
    await runBusyAction(async () => {
        await setDevelopmentPluginEnabled(pluginId, enabled)
        await syncPluginRuntime()
    })
}

async function removeInstalled(pluginId: string, pluginName: string) {
    const confirmed = confirm(locale.value === 'zh-CN'
        ? `确认移除已安装插件“${pluginName}”？`
        : `Remove installed plugin "${pluginName}"?`)
    if (!confirmed) return

    await runBusyAction(async () => {
        await removeInstalledPlugin(pluginId)
        await syncPluginRuntime()
    })
}

async function removeDevelopment(pluginId: string, pluginName: string) {
    const confirmed = confirm(locale.value === 'zh-CN'
        ? `确认移除开发插件“${pluginName}”？这不会删除原始目录。`
        : `Remove development plugin "${pluginName}"? This will not delete the source directory.`)
    if (!confirmed) return

    await runBusyAction(async () => {
        await removeDevelopmentPlugin(pluginId)
        await syncPluginRuntime()
    })
}

watch(() => locale.value, () => {
    void refreshCatalog()
}, { immediate: true })

watch(() => pluginCatalogVersion.value, () => {
    installedPlugins.value = pluginRegistry.getInstalledPlugins()
    developmentPlugins.value = pluginRegistry.getDevelopmentPlugins()
}, { immediate: true })

onMounted(() => {
    readDeveloperModeSetting()
    window.addEventListener('settings-updated', handleSettingsUpdated as EventListener)
})

onBeforeUnmount(() => {
    window.removeEventListener('settings-updated', handleSettingsUpdated as EventListener)
})
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
    max-width: 760px;
}

.plugin-actions-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.plugin-refresh-btn {
    flex-shrink: 0;
    margin-top: 2px;
}

.plugin-import-panel {
    width: 100%;
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr);
    gap: 18px;
    align-items: center;
    padding: 20px;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    background:
        linear-gradient(180deg, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.015)),
        var(--bg-secondary);
    cursor: pointer;
    text-align: left;
    transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.plugin-import-panel:hover:not(:disabled) {
    border-color: rgba(59, 130, 246, 0.28);
    background:
        linear-gradient(180deg, rgba(59, 130, 246, 0.065), rgba(59, 130, 246, 0.02)),
        var(--bg-secondary);
}

.plugin-import-panel-dev {
    background:
        linear-gradient(180deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.015)),
        var(--bg-secondary);
}

.plugin-import-panel-dev:hover:not(:disabled) {
    border-color: rgba(16, 185, 129, 0.28);
    background:
        linear-gradient(180deg, rgba(16, 185, 129, 0.065), rgba(16, 185, 129, 0.02)),
        var(--bg-secondary);
}

.plugin-import-panel.is-busy,
.plugin-import-panel:disabled {
    opacity: 0.8;
    cursor: progress;
}

.plugin-import-sidebar {
    display: grid;
    justify-items: center;
    gap: 14px;
}

.plugin-import-badge {
    padding: 5px 10px;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.12);
    color: #2563eb;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.plugin-import-badge-dev {
    background: rgba(16, 185, 129, 0.12);
    color: #059669;
}

.plugin-import-emblem {
    width: 84px;
    height: 84px;
    border-radius: 24px;
    background:
        linear-gradient(180deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.04)),
        var(--bg-primary);
    border: 1px solid rgba(59, 130, 246, 0.14);
    display: flex;
    align-items: center;
    justify-content: center;
}

.plugin-import-emblem-dev {
    background:
        linear-gradient(180deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.04)),
        var(--bg-primary);
    border-color: rgba(16, 185, 129, 0.14);
}

.plugin-import-emblem-core {
    position: relative;
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
}

.plugin-import-emblem-line {
    position: absolute;
    top: 50%;
    left: 50%;
    background: #2563eb;
    border-radius: 999px;
    transform: translate(-50%, -50%);
}

.plugin-import-emblem-dev .plugin-import-emblem-line {
    background: #059669;
}

.plugin-import-emblem-line-v {
    width: 4px;
    height: 20px;
}

.plugin-import-emblem-line-h {
    width: 20px;
    height: 4px;
}

.plugin-import-main {
    display: grid;
    gap: 10px;
}

.plugin-import-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
}

.plugin-import-description {
    color: var(--text-secondary);
    line-height: 1.6;
}

.plugin-import-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.plugin-import-pill {
    padding: 5px 10px;
    border-radius: 999px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 700;
}

.plugin-import-hint {
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

.plugin-diagnostics {
    display: grid;
    gap: 14px;
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

.plugin-card-dev:hover {
    border-color: rgba(16, 185, 129, 0.26);
}

.plugin-diagnostic-card {
    display: grid;
    gap: 12px;
    border: 1px solid var(--border-color);
    border-radius: 18px;
    padding: 16px;
    background: var(--bg-secondary);
}

.plugin-diagnostic-error {
    border-color: rgba(239, 68, 68, 0.3);
    background: linear-gradient(180deg, rgba(239, 68, 68, 0.06), rgba(239, 68, 68, 0.015)), var(--bg-secondary);
}

.plugin-diagnostic-warning {
    border-color: rgba(245, 158, 11, 0.3);
    background: linear-gradient(180deg, rgba(245, 158, 11, 0.06), rgba(245, 158, 11, 0.015)), var(--bg-secondary);
}

.plugin-diagnostic-info {
    border-color: rgba(59, 130, 246, 0.28);
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.06), rgba(59, 130, 246, 0.015)), var(--bg-secondary);
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
    word-break: break-word;
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

.plugin-tag-error {
    background: rgba(127, 29, 29, 0.7);
    color: #fecaca;
}

.plugin-tag-warning {
    background: rgba(120, 53, 15, 0.65);
    color: #fde68a;
}

.plugin-tag-info {
    background: rgba(30, 64, 175, 0.45);
    color: #bfdbfe;
}

.plugin-diagnostic-detail {
    border-top: 1px solid var(--border-color);
    padding-top: 10px;
}

.plugin-diagnostic-detail summary {
    cursor: pointer;
    color: var(--text-secondary);
    user-select: none;
}

.plugin-diagnostic-detail pre {
    margin: 10px 0 0;
    padding: 12px;
    border-radius: 12px;
    background: rgba(15, 23, 42, 0.72);
    color: #e2e8f0;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.78rem;
    line-height: 1.55;
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

    .plugin-import-panel {
        grid-template-columns: 1fr;
        padding: 18px;
    }

    .plugin-import-sidebar {
        justify-items: start;
    }

    .plugin-refresh-btn {
        width: 100%;
    }
}
</style>

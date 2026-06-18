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

        <div v-if="supportsPluginManagement" class="plugin-actions-row">
            <button
                type="button"
                class="plugin-action-card"
                :class="{ 'is-busy': packageBusy }"
                :disabled="packageBusy || developmentBusy"
                @click="openPackagePicker"
            >
                <span class="plugin-action-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="M5 8.5 12 4l7 4.5v7L12 20l-7-4.5v-7Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.7" />
                        <path d="M5.4 8.7 12 13l6.6-4.3M12 13v6.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
                    </svg>
                </span>
                <div class="plugin-action-copy">
                    <div class="plugin-import-title-row">
                        <div class="plugin-action-title">{{ packageBusy ? text.packageTitleBusy : text.packageTitle }}</div>
                    </div>
                    <div class="plugin-action-desc">{{ text.packageHint }}</div>
                </div>
                <div class="plugin-action-badge">{{ text.packageBadge }}</div>
            </button>

            <button
                v-if="developerMode"
                type="button"
                class="plugin-action-card plugin-action-card-dev"
                :class="{ 'is-busy': developmentBusy }"
                :disabled="packageBusy || developmentBusy"
                @click="openDevelopmentPicker"
            >
                <span class="plugin-action-icon plugin-action-icon-dev" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="M9 4.75h6M10 4.75v5.1l-4.2 7.2A2 2 0 0 0 7.52 20h8.96a2 2 0 0 0 1.72-2.95L14 9.85v-5.1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
                        <path d="M8.2 15.5h7.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
                    </svg>
                </span>
                <div class="plugin-action-copy">
                    <div class="plugin-import-title-row">
                        <div class="plugin-action-title">{{ developmentBusy ? text.developmentTitleBusy : text.developmentTitle }}</div>
                    </div>
                    <div class="plugin-action-desc">{{ text.developmentHint }}</div>
                </div>
                <div class="plugin-action-badge plugin-action-badge-dev">{{ text.developmentBadge }}</div>
            </button>
            <div v-else class="plugin-action-card plugin-action-card-ghost" aria-hidden="true">
                <span class="plugin-action-icon plugin-action-icon-ghost" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="M9 4.75h6M10 4.75v5.1l-4.2 7.2A2 2 0 0 0 7.52 20h8.96a2 2 0 0 0 1.72-2.95L14 9.85v-5.1" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
                        <path d="M8.2 15.5h7.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
                    </svg>
                </span>
                <div class="plugin-action-copy">
                    <div class="plugin-import-title-row">
                        <div class="plugin-action-title">{{ text.developmentTeaserTitle }}</div>
                    </div>
                    <div class="plugin-action-desc">{{ text.developmentTeaserHint }}</div>
                </div>
                <div class="plugin-action-badge plugin-action-badge-ghost">{{ text.developmentTeaserBadge }}</div>
            </div>
        </div>

        <div class="plugin-scroll-shell">
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

            <div class="plugin-tabs" role="tablist">
                <button
                    v-for="tab in visiblePluginTabs"
                    :key="tab.id"
                    type="button"
                    class="plugin-tab"
                    :class="{ active: activePluginTab === tab.id }"
                    role="tab"
                    :aria-selected="activePluginTab === tab.id"
                    @click="activePluginTab = tab.id"
                >
                    <span>{{ tab.label }}</span>
                    <span class="plugin-tab-count">{{ tab.count }}</span>
                </button>
            </div>

            <div v-show="activePluginTab === 'installed'" class="plugin-section">
                <div v-if="installedPlugins.length > 0" class="plugin-list">
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
                <div v-else class="plugin-empty-state">{{ text.emptyInstalled }}</div>
            </div>

            <div v-show="activePluginTab === 'builtin'" class="plugin-section">
                <div class="plugin-compact-list">
                    <article v-for="plugin in builtinPlugins" :key="plugin.kind" class="plugin-compact-item">
                        <div class="plugin-compact-main">
                            <div class="plugin-node-mark" :class="getKindClass(plugin.kind)">{{ getPluginInitial(plugin) }}</div>
                            <div class="plugin-compact-copy">
                                <div class="plugin-name">{{ localizedPluginName(plugin) }}</div>
                                <div class="plugin-kind">{{ plugin.kind }}</div>
                            </div>
                        </div>
                        <div class="plugin-compact-body">
                            <p class="plugin-description plugin-compact-description">{{ localizedPluginDescription(plugin) }}</p>
                        </div>
                    </article>
                </div>
            </div>

            <div v-if="developerMode && developmentDiagnostics.length > 0 && activePluginTab === 'diagnostics'" class="plugin-section">
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

            <div v-if="developerMode && activePluginTab === 'development'" class="plugin-section">
                <div v-if="developmentPlugins.length > 0" class="plugin-list plugin-development-list">
                    <article v-for="plugin in developmentPlugins" :key="`${plugin.id}:${plugin.sourcePath}`" class="plugin-development-card">
                        <div class="plugin-development-top">
                            <div class="plugin-development-main">
                                <div class="plugin-node-mark plugin-node-mark-dev" :class="getKindClass(getDevelopmentPluginKind(plugin))">
                                    {{ getDevelopmentPluginInitial(plugin) }}
                                </div>
                                <div class="plugin-development-copy">
                                    <div class="plugin-name">{{ plugin.name }}</div>
                                    <div class="plugin-kind">{{ plugin.id }}</div>
                                </div>
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

                        <p v-if="plugin.description" class="plugin-development-description">{{ plugin.description }}</p>

                        <div class="plugin-development-meta">
                            <span>v{{ plugin.version }}</span>
                            <span>{{ plugin.author || '-' }}</span>
                            <span>{{ formatInstalledTime(plugin.addedAt) }}</span>
                        </div>

                        <div class="plugin-development-path">{{ plugin.sourcePath }}</div>

                        <div class="plugin-development-footer">
                            <div class="plugin-development-kinds">
                                {{ text.nodeKinds }}: {{ plugin.manifest.nodes.map(node => node.kind).join(', ') }}
                            </div>
                            <button class="plugin-btn plugin-btn-danger" :disabled="busy" @click="removeDevelopment(plugin.id, plugin.name)">
                                {{ text.remove }}
                            </button>
                        </div>
                    </article>
                </div>
                <div v-else class="plugin-empty-state">{{ text.emptyDevelopment }}</div>
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
const packageBusy = ref(false)
const developmentBusy = ref(false)
const developerMode = ref(false)
const activePluginTab = ref('builtin')

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

const visiblePluginTabs = computed(() => {
    const tabs = [
        { id: 'builtin', label: text.value.builtinTitle, count: builtinPlugins.value.length },
        { id: 'installed', label: text.value.installedTitle, count: installedPlugins.value.length }
    ]

    if (developerMode.value) {
        tabs.push({ id: 'development', label: text.value.developmentListTitle, count: developmentPlugins.value.length })
    }

    if (developerMode.value && developmentDiagnostics.value.length > 0) {
        tabs.push({ id: 'diagnostics', label: text.value.diagnosticsTitle, count: developmentDiagnostics.value.length })
    }

    return tabs
})

const text = computed(() => locale.value === 'zh-CN'
    ? {
        title: '插件',
        description: '安装、启用、停用和检查节点插件。',
        refresh: '刷新',
        remove: '移除',
        desktopOnly: '插件安装与开发加载仅在 Electron 桌面版中可用。',
        builtinTitle: '内置节点',
        developmentListTitle: '开发插件',
        installedTitle: '已安装插件',
        builtinTag: '内置',
        editableTag: '可编辑',
        cardTag: '卡片模式',
        author: '作者',
        source: '来源',
        path: '路径',
        addedAt: '添加时间',
        installedAt: '安装时间',
        nodeKinds: '节点类型',
        packageTitle: '导入插件安装包',
        packageTitleBusy: '正在导入安装包...',
        packageDescription: '推荐导入 `.constella-plugin` 安装包，也兼容 `.zip` 格式。',
        packageHint: '点击选择文件并完成安装。',
        packageBadge: '安装包',
        developmentTitle: '加载开发插件目录',
        developmentTitleBusy: '正在加载开发插件...',
        developmentDescription: '选择包含 `manifest.json` 的插件目录，用于本地调试与迭代。',
        developmentHint: '点击选择目录，源文件不会被复制。',
        developmentBadge: '开发',
        developmentTeaserTitle: '开发者模式',
        developmentTeaserHint: '开启后会显示本地开发插件目录的加载入口。',
        developmentTeaserBadge: '需开启',
        packageSource: '安装包',
        directorySource: '目录',
        developmentSource: '开发目录',
        marketEyebrow: 'Plugin Market',
        marketTitle: '插件市场',
        marketDescription: '这里将用于后续承载市场入口、精选插件、分类、评分、更新与在线安装能力。',
        marketSoon: '即将推出',
        diagnosticsTitle: '插件诊断',
        emptyInstalled: '尚未安装任何插件。',
        emptyDevelopment: '尚未加载开发插件。',
        file: '文件',
        updatedAt: '更新',
        details: '详情',
        unknownPlugin: '未知插件'
    }
    : {
        title: 'Plugins',
        description: 'Install, enable, disable, and inspect node plugins.',
        refresh: 'Refresh',
        remove: 'Remove',
        desktopOnly: 'Plugin installation and development loading are only available in the Electron desktop app.',
        builtinTitle: 'Built-in',
        developmentListTitle: 'Dev',
        installedTitle: 'Installed',
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
        packageTitleBusy: 'Importing package...',
        packageDescription: 'Prefer `.constella-plugin` packages, with `.zip` as a compatibility format.',
        packageHint: 'Choose a file to install the plugin.',
        packageBadge: 'Package',
        developmentTitle: 'Load Development Plugin',
        developmentTitleBusy: 'Loading development plugin...',
        developmentDescription: 'Choose a plugin directory that contains `manifest.json` for local iteration.',
        developmentHint: 'Choose a folder. Source files stay in place.',
        developmentBadge: 'Development',
        developmentTeaserTitle: 'Developer Mode',
        developmentTeaserHint: 'Enable it to show the local development plugin directory loader.',
        developmentTeaserBadge: 'Required',
        packageSource: 'Package',
        directorySource: 'Directory',
        developmentSource: 'Development Folder',
        marketEyebrow: 'Plugin Market',
        marketTitle: 'Marketplace',
        marketDescription: 'This area is reserved for future marketplace entry points, featured plugins, categories, ratings, updates, and online installs.',
        marketSoon: 'Coming Soon',
        diagnosticsTitle: 'Diagnostics',
        emptyInstalled: 'No installed plugins yet.',
        emptyDevelopment: 'No development plugins loaded.',
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

function getPluginInitial(plugin: PluginMeta) {
    const label = localizedPluginName(plugin).trim()
    return (label[0] || plugin.kind[0] || 'N').toUpperCase()
}

function getDevelopmentPluginKind(plugin: DevelopmentPluginRecord) {
    return plugin.manifest.nodes[0]?.kind || plugin.id
}

function getDevelopmentPluginInitial(plugin: DevelopmentPluginRecord) {
    const label = (plugin.name || plugin.id || 'N').trim()
    return (label[0] || 'N').toUpperCase()
}

function getKindClass(kind: string) {
    const normalized = (kind || 'blank').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    return `plugin-kind-${normalized}`
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
    if (busy.value || packageBusy.value || developmentBusy.value) return
    packageBusy.value = true
    try {
        await installPluginPackage()
        await syncPluginRuntime()
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!/cancel/i.test(message)) {
            errorMessage.value = message
        }
    } finally {
        packageBusy.value = false
    }
}

async function openDevelopmentPicker() {
    if (busy.value || packageBusy.value || developmentBusy.value) return
    developmentBusy.value = true
    try {
        await addDevelopmentPlugin()
        await syncPluginRuntime()
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!/cancel/i.test(message)) {
            errorMessage.value = message
        }
    } finally {
        developmentBusy.value = false
    }
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
    const confirmed = confirm(t('settings.plugins.removeInstalledConfirm', { name: pluginName }))
    if (!confirmed) return

    await runBusyAction(async () => {
        await removeInstalledPlugin(pluginId)
        await syncPluginRuntime()
    })
}

async function removeDevelopment(pluginId: string, pluginName: string) {
    const confirmed = confirm(t('settings.plugins.removeDevelopmentConfirm', { name: pluginName }))
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

watch(visiblePluginTabs, tabs => {
    if (!tabs.some(tab => tab.id === activePluginTab.value)) {
        activePluginTab.value = tabs[0]?.id || 'installed'
    }
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
    grid-template-rows: auto auto minmax(0, 1fr);
    gap: 16px;
    min-width: 0;
    max-width: 100%;
    height: 100%;
    overflow-x: hidden;
    container-type: inline-size;
    min-height: 0;
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
    min-width: 0;
}

.plugin-pane-title {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-primary);
}

.plugin-pane-subtitle {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.45;
    font-size: 0.92rem;
    max-width: 100%;
    overflow-wrap: anywhere;
}

.plugin-actions-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    min-width: 0;
    align-items: stretch;
}

.plugin-refresh-btn {
    flex-shrink: 0;
    margin-top: 2px;
}

.plugin-action-card {
    width: 100%;
    min-height: 92px;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    cursor: pointer;
    text-align: left;
    transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.plugin-action-card:hover:not(:disabled) {
    border-color: rgba(59, 130, 246, 0.28);
    background: color-mix(in srgb, var(--bg-secondary) 88%, #3b82f6 12%);
}

.plugin-action-card-dev:hover:not(:disabled) {
    border-color: rgba(16, 185, 129, 0.28);
    background: color-mix(in srgb, var(--bg-secondary) 88%, #10b981 12%);
}

.plugin-action-card.is-busy,
.plugin-action-card:disabled {
    opacity: 0.8;
    cursor: progress;
}

.plugin-action-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 130, 246, 0.12);
    color: #2563eb;
    flex-shrink: 0;
}

.plugin-action-icon svg {
    width: 18px;
    height: 18px;
    display: block;
}

.plugin-action-icon-dev {
    background: rgba(16, 185, 129, 0.12);
    color: #059669;
}

.plugin-action-icon-ghost {
    background: rgba(148, 163, 184, 0.14);
    color: var(--text-secondary);
}

.plugin-action-copy {
    min-width: 0;
    display: grid;
    gap: 3px;
}

.plugin-import-title-row {
    display: flex;
    align-items: center;
}

.plugin-action-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}

.plugin-action-desc {
    color: var(--text-secondary);
    line-height: 1.35;
    font-size: 0.78rem;
    min-width: 0;
    overflow-wrap: anywhere;
}

.plugin-action-badge {
    justify-self: end;
    align-self: start;
    min-width: 54px;
    text-align: center;
    padding: 4px 9px;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.12);
    color: #2563eb;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
}

.plugin-action-badge-dev {
    background: rgba(16, 185, 129, 0.12);
    color: #059669;
}

.plugin-action-card-ghost {
    cursor: default;
    opacity: 1;
    user-select: none;
}

.plugin-action-card.plugin-action-card-ghost:hover {
    border-color: var(--border-color);
    background: var(--bg-secondary);
    box-shadow: none;
    transform: none;
}

.plugin-action-badge-ghost {
    background: rgba(148, 163, 184, 0.14);
    color: var(--text-secondary);
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
    border-radius: 8px;
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
    gap: 10px;
    align-items: center;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 9px 10px;
    background: var(--bg-secondary);
    min-width: 0;
}

.plugin-market-copy {
    min-width: 0;
}

.plugin-market-eyebrow {
    display: none;
}

.plugin-market-title {
    margin-top: 0;
    font-size: 0.84rem;
    font-weight: 700;
    color: var(--text-primary);
}

.plugin-market-desc {
    display: none;
}

.plugin-market-chip {
    flex-shrink: 0;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(139, 185, 254, 0.12);
    color: #2563eb;
    font-size: 11px;
    font-weight: 700;
    text-align: center;
}

.plugin-tabs {
    display: flex;
    gap: 6px;
    padding: 4px;
    border-radius: 10px;
    background: var(--bg-secondary);
    overflow-x: auto;
    scrollbar-width: none;
}

.plugin-tabs::-webkit-scrollbar {
    display: none;
}

.plugin-tab {
    min-width: 0;
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 32px;
    padding: 0 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
}

.plugin-tab:hover {
    color: var(--text-primary);
    background: var(--bg-tertiary);
}

.plugin-tab.active {
    color: var(--color-primary);
    background: var(--bg-primary);
    box-shadow: var(--shadow-sm);
}

.plugin-tab-count {
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    color: inherit;
    font-size: 11px;
}

.plugin-section {
    display: grid;
    gap: 10px;
    flex: 1 1 auto;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    align-content: start;
    min-height: 0;
    padding-right: 4px;
}

.plugin-scroll-shell {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
    max-height: 100%;
    overflow: hidden;
    overflow-x: hidden;
}

.plugin-list,
.plugin-compact-list {
    display: grid;
    gap: 8px;
    min-width: 0;
}

.plugin-diagnostics {
    display: grid;
    gap: 14px;
}

.plugin-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    background: var(--bg-secondary);
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
    min-width: 0;
}

.plugin-card:hover {
    transform: translateY(-1px);
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
    border-radius: 8px;
    padding: 16px;
    background: var(--bg-secondary);
}

.plugin-card > .plugin-card-actions {
    align-self: end;
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
    min-width: 0;
}

.plugin-compact-item {
    display: grid;
    grid-template-columns: minmax(140px, 1fr) minmax(0, 1.35fr);
    align-items: start;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-secondary);
    min-width: 0;
}

.plugin-compact-main {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    align-self: start;
}

.plugin-compact-body {
    min-width: 0;
    align-self: start;
    padding-top: 2px;
}

.plugin-compact-copy {
    min-width: 0;
}

.plugin-node-mark {
    width: 30px;
    height: 30px;
    border-radius: 7px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 800;
    line-height: 1;
}

.plugin-kind-text{background:rgba(37,99,235,.12);color:#2563eb}.plugin-kind-markdown{background:rgba(124,58,237,.12);color:#7c3aed}.plugin-kind-image{background:rgba(5,150,105,.12);color:#059669}.plugin-kind-hyperlink{background:rgba(14,165,233,.13);color:#0284c7}.plugin-kind-quote-card{background:rgba(217,119,6,.13);color:#b45309}.plugin-kind-blank{background:rgba(100,116,139,.14);color:#64748b}

.plugin-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
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
    margin: 10px 0 0;
    color: var(--text-primary);
    line-height: 1.6;
    overflow-wrap: anywhere;
}

.plugin-empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 160px;
    padding: 18px 14px;
    border: 1px dashed var(--border-color);
    border-radius: 8px;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: 13px;
    text-align: center;
}

.plugin-compact-description {
    margin: 0;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
    overflow-wrap: anywhere;
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
    min-width: 0;
}

.plugin-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.plugin-compact-tags {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    justify-content: flex-end;
    align-items: center;
    margin-top: 0;
    min-width: 0;
    min-height: 22px;
}

.plugin-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 22px;
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    text-align: center;
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

.plugin-development-list {
    gap: 10px;
}

.plugin-development-card {
    display: grid;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-secondary);
    min-width: 0;
}

.plugin-development-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
}

.plugin-development-main {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.plugin-node-mark-dev {
    flex-shrink: 0;
}

.plugin-development-copy {
    min-width: 0;
}

.plugin-development-description {
    margin: 0;
    color: var(--text-primary);
    line-height: 1.55;
    overflow-wrap: anywhere;
}

.plugin-development-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    color: var(--text-secondary);
    font-size: 12px;
}

.plugin-development-path {
    color: var(--text-secondary);
    font-size: 12px;
    overflow-wrap: anywhere;
    word-break: break-word;
}

.plugin-development-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
}

.plugin-development-kinds {
    min-width: 0;
    color: var(--text-secondary);
    font-size: 12px;
    overflow-wrap: anywhere;
    word-break: break-word;
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

    .plugin-action-card {
        grid-template-columns: 32px minmax(0, 1fr);
        align-items: center;
    }

    .plugin-section {
        min-height: 220px;
    }

    .plugin-action-badge {
        grid-column: 2;
        justify-self: start;
    }

    .plugin-compact-item {
        grid-template-columns: 1fr;
        align-items: stretch;
    }

    .plugin-compact-tags {
        justify-content: flex-start;
    }

    .plugin-refresh-btn {
        width: 100%;
    }
}

@container (max-width: 620px) {
    .plugin-pane-header,
    .plugin-market-shelf {
        flex-direction: column;
        align-items: stretch;
    }

    .plugin-actions-row {
        grid-template-columns: 1fr;
    }

    .plugin-action-card {
        grid-template-columns: 32px minmax(0, 1fr);
        align-items: center;
    }

    .plugin-action-badge {
        grid-column: 2;
        justify-self: start;
    }

    .plugin-card {
        grid-template-columns: 1fr;
    }

    .plugin-compact-item {
        grid-template-columns: minmax(0, 1fr);
        align-items: stretch;
        gap: 8px;
    }

    .plugin-compact-description {
        white-space: normal;
    }

    .plugin-compact-tags {
        justify-content: flex-start;
        grid-auto-flow: row;
        grid-template-columns: repeat(auto-fit, minmax(72px, max-content));
    }

    .plugin-refresh-btn {
        width: 100%;
    }
}

@container (min-width: 621px) and (max-width: 760px) {
    .plugin-compact-item {
        grid-template-columns: minmax(150px, 1fr) minmax(0, 1.2fr);
    }

    .plugin-compact-tags {
        grid-column: 1 / -1;
        justify-content: flex-start;
    }
}
</style>

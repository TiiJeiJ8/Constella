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

<style scoped src="./PluginCatalogPane.css"></style>

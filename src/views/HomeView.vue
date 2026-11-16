<template>
    <div class="home-view">
        <WindowControls />

        <div class="control-buttons" :class="{ 'no-electron': !isElectron, show: !showIntro }">
            <button class="ctrl-btn github-btn" @click="openGithub" :title="t('home.footer.github')">
                <LogoGithubIcon />
            </button>
            <button
                class="ctrl-btn theme-btn"
                @click="toggleTheme"
                :title="isDark ? t('theme.light') : t('theme.dark')"
            >
                <SunnyIcon v-if="isDark" />
                <MoonIcon v-else />
            </button>
            <button class="ctrl-btn" @click="toggleLanguage" :title="t('language.switch')">
                <span class="lang-text">{{ currentLocale === 'zh-CN' ? '中' : 'EN' }}</span>
            </button>
            <button class="ctrl-btn info-btn" @click="showInfo" :title="t('home.footer.info')">
                <HelpCircleIcon />
            </button>
            <button class="ctrl-btn settings-btn" @click="openSettings" :title="t('settings.title')">
                <SettingIcon />
            </button>
        </div>

        <div class="intro-animation" :class="{ 'fade-out': !showIntro }" style="user-select: none;">
            <div class="logo-text">
                <span
                    v-for="(char, index) in logoChars"
                    :key="index"
                    class="char"
                    :style="{ animationDelay: `${index * 0.1}s` }"
                >
                    {{ char }}
                </span>
            </div>
        </div>

        <main class="main-content" :class="{ show: !showIntro }">
            <Transition name="lang-fade" mode="out-in">
                <div :key="currentLocale" class="content-wrapper">
                    <div class="header-section">
                        <h1 class="title" style="user-select: none;">{{ t('home.title') }}</h1>
                        <p class="subtitle" style="user-select: none;">{{ t('home.subtitle') }}</p>
                    </div>

                    <div class="server-shell">
                        <div class="server-card">
                            <label class="input-label">{{ t('home.serverInput.label') }}</label>
                            <div class="input-group">
                                <input
                                    v-model="serverUrl"
                                    type="text"
                                    class="server-input"
                                    :class="{
                                        error: Boolean(connectionError),
                                        success: connectionSuccess,
                                        disabled: isConnecting
                                    }"
                                    :placeholder="t('home.serverInput.placeholder')"
                                    :disabled="isConnecting"
                                    @keyup.enter="connectToServer()"
                                />
                                <button
                                    class="connect-btn"
                                    :class="{ connecting: isConnecting, success: connectionSuccess }"
                                    @click="isConnecting ? cancelConnection() : connectToServer()"
                                    :disabled="connectionSuccess"
                                >
                                    <span v-if="isConnecting" class="loading-spinner"></span>
                                    {{
                                        isConnecting
                                            ? t('home.serverInput.cancel')
                                            : connectionSuccess
                                                ? t('home.serverInput.success')
                                                : t('home.serverInput.connect')
                                    }}
                                </button>
                            </div>

                            <Transition name="fade">
                                <div v-if="connectionError" class="error-message">
                                    {{ connectionError }}
                                </div>
                            </Transition>

                            <Transition name="fade">
                                <div v-if="connectionSuccess" class="success-message">
                                    {{ t('home.serverInput.success') }}
                                </div>
                            </Transition>
                        </div>

                        <div class="discovery-ribbon">
                            <div class="discovery-ribbon-header">
                                <div class="discovery-ribbon-title">
                                    <span class="discovery-label-group">
                                        <span class="discovery-label">{{ discoveryText.label }}</span>
                                        <button
                                            class="discovery-inline-icon"
                                            :title="discoveryText.hintTitle"
                                            type="button"
                                        >
                                            <HelpCircleIcon />
                                        </button>
                                    </span>
                                    <span class="discovery-summary">{{ discoveryCountText }}</span>
                                </div>

                                <button
                                    v-if="supportsLanDiscovery"
                                    class="discovery-icon-btn refresh-icon-btn"
                                    :disabled="isDiscovering || isConnecting"
                                    :title="isDiscovering ? discoveryText.searching : discoveryText.refresh"
                                    @click="refreshDiscoveredServers"
                                    type="button"
                                >
                                    <span v-if="isDiscovering" class="loading-spinner small"></span>
                                    <RefreshIcon v-else />
                                </button>
                            </div>

                            <Transition name="fade">
                                <div v-if="discoveryError" class="error-message compact-message">
                                    {{ discoveryError }}
                                </div>
                            </Transition>

                            <template v-if="supportsLanDiscovery && discoveredServers.length > 0">
                                <div class="discovery-lane">
                                    <button
                                        v-for="server in discoveredServers"
                                        :key="server.id"
                                        class="discovery-pill"
                                        :class="{ active: selectedDiscoveryId === server.id || normalizedInputUrl === server.url }"
                                        :disabled="isConnecting"
                                        @click="selectDiscoveredServer(server)"
                                        @dblclick="connectDiscoveredServer(server)"
                                    >
                                        <span class="discovery-pill-name">{{ server.name }}</span>
                                        <span v-if="server.version" class="discovery-pill-version">{{ server.version }}</span>
                                    </button>
                                </div>

                                <Transition name="strip-float">
                                    <div v-if="selectedServer" class="selected-server-strip-layer">
                                        <div class="selected-server-strip">
                                            <div class="selected-server-accent"></div>
                                            <div class="selected-server-strip-main">
                                                <div class="selected-server-title-row">
                                                    <span class="selected-server-name">{{ selectedServer.name }}</span>
                                                    <span v-if="selectedServer.version" class="discovery-badge">{{ selectedServer.version }}</span>
                                                </div>
                                                <div class="selected-server-url">{{ selectedServer.url }}</div>
                                            </div>
                                            <div class="selected-server-strip-side">
                                                <div class="selected-server-meta-item">
                                                    <span class="selected-server-meta-label">Host</span>
                                                    <span class="selected-server-meta-value">{{ selectedServer.host }}:{{ selectedServer.port }}</span>
                                                </div>
                                                <div class="selected-server-meta-item">
                                                    <span class="selected-server-meta-label">ID</span>
                                                    <span class="selected-server-meta-value">{{ selectedServer.instanceId }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Transition>
                            </template>

                            <div v-else class="discovery-empty">
                                {{ discoveryEmptyText }}
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </main>

        <SettingsPanel v-model="showSettings" />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    SettingIcon,
    MoonIcon,
    SunnyIcon,
    HelpCircleIcon,
    LogoGithubIcon,
    RefreshIcon
} from 'tdesign-icons-vue-next'
import SettingsPanel from '../components/base/SettingsPanel.vue'
import WindowControls from '../components/base/WindowControls.vue'
import { apiService } from '../services/api'
import { handleApiError } from '../utils/errorHandler'
import { getStoredTheme, setTheme } from '../utils/theme'

interface DiscoveredServer {
    id: string
    name: string
    url: string
    host: string
    port: number
    apiPrefix: string
    websocketPath: string
    instanceId: string
    version: string
    addresses: string[]
    discoveredAt: string
}

interface DiscoveryText {
    refresh: string
    searching: string
    empty: string
    desktopOnly: string
    failed: string
    label: string
    countSuffix: string
    hintTitle: string
}

interface ElectronApi {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    openExternal: (url: string) => void
    discoverLanServers: (timeoutMs?: number) => Promise<DiscoveredServer[]>
}

const DISCOVERY_TIMEOUT_MS = 1800

const ZH_DISCOVERY_TEXT: DiscoveryText = {
    refresh: '刷新',
    searching: '正在搜索附近服务器...',
    empty: '暂未在当前局域网中发现可用的 Constella 服务器。',
    desktopOnly: '局域网自动发现仅在桌面端可用，你仍然可以手动输入服务器地址连接。',
    failed: '扫描局域网失败，请稍后重试。',
    label: '局域网发现',
    countSuffix: '台服务器',
    hintTitle: '单击查看，双击直连'
}

const EN_DISCOVERY_TEXT: DiscoveryText = {
    refresh: 'Refresh',
    searching: 'Searching nearby servers...',
    empty: 'No Constella servers were found on this local network yet.',
    desktopOnly: 'LAN auto-discovery is available in the desktop app. You can still connect manually here.',
    failed: 'Failed to scan the local network. Please try again.',
    label: 'LAN Discovery',
    countSuffix: 'servers',
    hintTitle: 'Click to preview, double-click to connect'
}

const props = withDefaults(defineProps<{ playIntro?: boolean }>(), {
    playIntro: true
})
const { t, locale } = useI18n()
const emit = defineEmits<{
    (event: 'navigate', view: string): void
    (event: 'intro-finished'): void
}>()

const showIntro = ref(props.playIntro)
let introTimer: number | null = null
const serverUrl = ref('')
const logoChars = 'Constella'.split('')
const isDark = ref(false)
const showSettings = ref(false)
const isConnecting = ref(false)
const connectionError = ref('')
const connectionSuccess = ref(false)
const discoveredServers = ref<DiscoveredServer[]>([])
const isDiscovering = ref(false)
const discoveryError = ref('')
const selectedDiscoveryId = ref('')

const electronApi = (window as Window & { electron?: ElectronApi }).electron

const currentLocale = computed(() => locale.value)
const isElectron = computed(() => Boolean(electronApi))
const supportsLanDiscovery = computed(() => Boolean(electronApi?.discoverLanServers))
const normalizedInputUrl = computed(() => serverUrl.value.trim().replace(/\/$/, ''))
const discoveryText = computed<DiscoveryText>(() =>
    locale.value === 'zh-CN' ? ZH_DISCOVERY_TEXT : EN_DISCOVERY_TEXT
)
const discoveryEmptyText = computed(() => {
    if (!supportsLanDiscovery.value) return discoveryText.value.desktopOnly
    if (isDiscovering.value) return discoveryText.value.searching
    return discoveryText.value.empty
})
const discoveryCountText = computed(() => {
    if (!supportsLanDiscovery.value) return discoveryText.value.desktopOnly
    if (isDiscovering.value) return discoveryText.value.searching
    if (discoveredServers.value.length === 0) return discoveryText.value.empty

    return locale.value === 'zh-CN'
        ? `已发现 ${discoveredServers.value.length} ${discoveryText.value.countSuffix}`
        : `${discoveredServers.value.length} ${discoveryText.value.countSuffix} found`
})
const selectedServer = computed(() => {
    return discoveredServers.value.find((server) => server.id === selectedDiscoveryId.value) || null
})

onMounted(() => {
    if (!props.playIntro) {
        showIntro.value = false
        return
    }

    introTimer = window.setTimeout(() => {
        showIntro.value = false
        emit('intro-finished')
    }, 2000)
})

onUnmounted(() => {
    if (introTimer !== null) window.clearTimeout(introTimer)
})

onMounted(() => {
    setTimeout(() => {
        showIntro.value = false
    }, 2000)

    isDark.value = getStoredTheme() === 'dark'

    const savedServerUrl = localStorage.getItem('serverUrl')
    if (savedServerUrl) {
        serverUrl.value = savedServerUrl
    }

    if (supportsLanDiscovery.value) {
        void refreshDiscoveredServers()
    }
})

function openSettings() {
    showSettings.value = true
}

function toggleLanguage() {
    const newLocale = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
    locale.value = newLocale
    localStorage.setItem('locale', newLocale)
}

function toggleTheme() {
    isDark.value = !isDark.value
    setTheme(isDark.value ? 'dark' : 'light')
}

function openGithub() {
    const url = 'https://github.com/TiiJeiJ8/constella'

    if (electronApi?.openExternal) {
        electronApi.openExternal(url)
        return
    }

    window.open(url, '_blank')
}

async function refreshDiscoveredServers() {
    if (!electronApi?.discoverLanServers) {
        return
    }

    discoveryError.value = ''
    isDiscovering.value = true

    try {
        discoveredServers.value = await electronApi.discoverLanServers(DISCOVERY_TIMEOUT_MS)

        if (
            selectedDiscoveryId.value &&
            !discoveredServers.value.some((server) => server.id === selectedDiscoveryId.value)
        ) {
            selectedDiscoveryId.value = ''
        }
    } catch (error) {
        console.error('Failed to discover LAN servers:', error)
        discoveryError.value = discoveryText.value.failed
        discoveredServers.value = []
    } finally {
        isDiscovering.value = false
    }
}

function selectDiscoveredServer(server: DiscoveredServer) {
    if (selectedDiscoveryId.value === server.id) {
        selectedDiscoveryId.value = ''
        return
    }

    selectedDiscoveryId.value = server.id
    serverUrl.value = server.url
}

async function connectDiscoveredServer(server: DiscoveredServer) {
    selectedDiscoveryId.value = server.id
    serverUrl.value = server.url
    await connectToServer(server.url)
}

async function connectToServer(targetUrl?: string) {
    const rawInput = (targetUrl ?? serverUrl.value).trim()

    if (!rawInput) {
        connectionError.value = t('home.serverInput.errors.empty')
        return
    }

    connectionError.value = ''
    connectionSuccess.value = false
    isConnecting.value = true

    try {
        let normalizedUrl = rawInput

        if (!normalizedUrl.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
            const protocol = window.location?.protocol || 'http:'
            normalizedUrl = `${protocol}//${normalizedUrl.replace(/^\/+/, '')}`
        }

        try {
            normalizedUrl = new URL(normalizedUrl).origin
        } catch {
            connectionError.value = t('home.serverInput.errors.invalid')
            return
        }

        const result = await apiService.healthCheck(normalizedUrl)

        if (result.success) {
            connectionSuccess.value = true
            serverUrl.value = normalizedUrl
            apiService.setBaseUrl(normalizedUrl)
            localStorage.setItem('serverUrl', normalizedUrl)

            setTimeout(() => {
                connectionSuccess.value = false
                emit('navigate', 'login')
            }, 1500)
            return
        }

        if (result.errorCode) {
            connectionError.value = handleApiError(result)
        } else if (result.message?.includes('timeout') || result.message?.includes('Timeout')) {
            connectionError.value = t('home.serverInput.errors.timeout')
        } else if (
            result.message?.includes('reach') ||
            result.message?.includes('fetch') ||
            result.message?.includes('NetworkError')
        ) {
            connectionError.value = t('home.serverInput.errors.unreachable')
        } else if (result.message?.includes('cancelled')) {
            connectionError.value = t('home.serverInput.errors.cancelled')
        } else {
            connectionError.value = result.message || t('home.serverInput.errors.unknown')
        }
    } catch (error) {
        console.error('Connection error:', error)
        connectionError.value =
            error instanceof Error ? error.message : t('home.serverInput.errors.unknown')
    } finally {
        isConnecting.value = false
    }
}

function cancelConnection() {
    apiService.cancelRequest()
    isConnecting.value = false
    connectionError.value = t('home.serverInput.errors.cancelled')
}

function showInfo() {
    emit('navigate', 'about')
}
</script>

<style scoped src="./HomeView.css"></style>

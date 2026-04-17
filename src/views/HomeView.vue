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
import { computed, onMounted, ref } from 'vue'
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

const { t, locale } = useI18n()
const emit = defineEmits<{
    (event: 'navigate', view: string): void
}>()

const showIntro = ref(true)
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

<style scoped>
.home-view {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    border-radius: 12px;
}

.control-buttons {
    position: fixed;
    top: 40px;
    right: 12px;
    display: flex;
    gap: 10px;
    z-index: 1000;
    -webkit-app-region: no-drag;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-10px);
    transition: opacity 0.6s ease 0.5s, transform 0.6s ease 0.5s;
}

.control-buttons.show {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
}

.control-buttons.no-electron {
    top: 12px;
}

.ctrl-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
    color: var(--text-primary);
}

.ctrl-btn svg {
    width: 20px;
    height: 20px;
}

.ctrl-btn:hover {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    transform: scale(1.05);
    color: #fff;
}

.ctrl-btn .lang-text {
    font-size: 13px;
    font-weight: 600;
}

.ctrl-btn:hover .lang-text {
    color: #fff;
}

.intro-animation {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
    z-index: 1100;
    transition: opacity 0.8s ease;
}

.intro-animation.fade-out {
    opacity: 0;
    pointer-events: none;
}

.logo-text {
    display: flex;
    gap: 4px;
}

.char {
    font-size: 5.5rem;
    font-weight: 700;
    color: var(--accent-primary);
    opacity: 0;
    animation: charFadeIn 0.6s ease forwards;
}

@keyframes charFadeIn {
    0% {
        opacity: 0;
        transform: translateY(20px) scale(0.8);
    }

    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.main-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: clamp(24px, 4vw, 40px) 20px;
    opacity: 0;
    transition: opacity 0.8s ease 0.5s;
}

.main-content.show {
    opacity: 1;
}

.content-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

.lang-fade-enter-active,
.lang-fade-leave-active {
    transition: all 0.3s ease;
}

.lang-fade-enter-from {
    opacity: 0;
    transform: translateY(-10px);
}

.lang-fade-leave-to {
    opacity: 0;
    transform: translateY(10px);
}

.header-section {
    text-align: center;
    margin-bottom: clamp(24px, 4vw, 48px);
}

.title {
    font-size: clamp(3.5rem, 12vw, 8rem);
    font-weight: 450;
    color: var(--text-primary);
    margin-bottom: 12px;
    letter-spacing: -0.02em;
    line-height: 0.95;
}

.subtitle {
    font-size: clamp(0.95rem, 1.6vw, 1.125rem);
    color: var(--text-secondary);
    font-weight: 400;
}

.server-shell {
    width: 100%;
    max-width: min(520px, 100%);
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.server-card {
    width: 100%;
    padding: clamp(20px, 3vw, 28px);
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: 16px;
    box-shadow: var(--shadow-md);
    transition: all 0.3s ease;
}

.server-card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
}

.input-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.input-group {
    display: flex;
    gap: 12px;
}

.server-input {
    flex: 1;
    padding: 12px 16px;
    font-size: 1rem;
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    transition: all 0.3s ease;
}

.server-input:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.server-input.error {
    border-color: #e53935;
}

.server-input.success {
    border-color: #43a047;
}

.server-input.disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.connect-btn {
    padding: 12px 28px;
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    background: var(--accent-primary);
    border-radius: 12px;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: clamp(108px, 18vw, 120px);
    justify-content: center;
}

.connect-btn:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
}

.connect-btn.connecting {
    background: #ff9800;
}

.connect-btn.success {
    background: #43a047;
    cursor: default;
}

.connect-btn:disabled {
    opacity: 0.8;
    cursor: not-allowed;
}

.discovery-ribbon {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.discovery-ribbon-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.discovery-ribbon-title {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.discovery-label-group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.discovery-label {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
}

.discovery-inline-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    transition: color 0.2s ease, transform 0.2s ease;
}

.discovery-inline-icon:hover {
    color: var(--accent-primary);
    transform: translateY(-1px);
}

.discovery-inline-icon :deep(svg) {
    width: 15px;
    height: 15px;
}

.discovery-summary {
    color: var(--text-secondary);
    font-size: 0.78rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.discovery-icon-btn {
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 50%;
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.discovery-icon-btn:hover:not(:disabled) {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    transform: translateY(-1px);
}

.discovery-icon-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
}

.discovery-icon-btn :deep(svg) {
    width: 16px;
    height: 16px;
}

.discovery-lane {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding: 2px 2px 52px;
    scroll-behavior: smooth;
    scrollbar-width: none;
}

.discovery-lane::-webkit-scrollbar {
    display: none;
}

.discovery-pill {
    flex: 0 0 auto;
    border: 1px solid var(--border-color);
    background: color-mix(in srgb, var(--bg-secondary) 74%, white 26%);
    color: var(--text-primary);
    border-radius: 999px;
    padding: 10px 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
    transition:
        background-color 0.22s ease,
        border-color 0.22s ease,
        box-shadow 0.22s ease,
        transform 0.22s ease;
}

.discovery-pill:hover:not(:disabled),
.discovery-pill.active {
    border-color: var(--accent-primary);
    background: color-mix(in srgb, var(--accent-primary) 12%, var(--bg-secondary) 88%);
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.08);
    transform: translateY(-1px);
}

.discovery-pill:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.discovery-pill-name {
    font-size: 0.88rem;
    font-weight: 700;
}

.discovery-pill-version {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-secondary);
}

.discovery-badge {
    padding: 3px 8px;
    border-radius: 999px;
    background: rgba(64, 158, 255, 0.12);
    color: var(--accent-primary);
    font-size: 0.75rem;
    font-weight: 700;
}

.discovery-empty {
    padding: 14px;
    border-radius: 14px;
    background: var(--bg-primary);
    border: 1px dashed var(--border-color);
    color: var(--text-secondary);
    font-size: 0.84rem;
    line-height: 1.5;
}

.selected-server-strip-layer {
    position: absolute;
    left: 14px;
    right: 14px;
    top: calc(100% - 30px);
    z-index: 12;
    pointer-events: none;
}

.selected-server-strip {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 16px;
    background: color-mix(in srgb, var(--bg-secondary) 78%, white 22%);
    border: 1px solid color-mix(in srgb, var(--border-light) 72%, white 28%);
    box-shadow:
        0 14px 30px rgba(15, 23, 42, 0.1),
        0 4px 12px rgba(15, 23, 42, 0.05);
    backdrop-filter: blur(16px);
    pointer-events: auto;
}

.selected-server-accent {
    width: 5px;
    align-self: stretch;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 55%, white 45%));
    box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.1);
}

.selected-server-strip-main {
    min-width: 0;
    flex: 1;
}

.selected-server-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.selected-server-name {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--text-primary);
}

.selected-server-url {
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 0.8rem;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.selected-server-strip-side {
    flex-shrink: 0;
    min-width: clamp(136px, 18vw, 160px);
    display: grid;
    gap: 6px;
}

.selected-server-meta-item {
    display: grid;
    gap: 2px;
    text-align: right;
}

.selected-server-meta-label {
    color: var(--text-secondary);
    font-size: 0.64rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.selected-server-meta-value {
    color: var(--text-primary);
    font-size: 0.74rem;
    font-weight: 600;
    line-height: 1.35;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.loading-spinner.small {
    width: 14px;
    height: 14px;
    border-width: 2px;
    border-color: rgba(64, 158, 255, 0.25);
    border-top-color: var(--accent-primary);
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.error-message,
.success-message {
    margin-top: 12px;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
}

.compact-message {
    margin-top: 0;
}

.error-message {
    background: rgba(229, 57, 53, 0.1);
    color: #e53935;
    border: 1px solid rgba(229, 57, 53, 0.3);
}

.success-message {
    background: rgba(67, 160, 71, 0.1);
    color: #43a047;
    border: 1px solid rgba(67, 160, 71, 0.3);
}

.fade-enter-active,
.fade-leave-active {
    transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(-5px);
}

.strip-float-enter-active,
.strip-float-leave-active {
    transition: opacity 0.22s ease, transform 0.22s ease;
}

.strip-float-enter-from,
.strip-float-leave-to {
    opacity: 0;
    transform: translateY(-8px) scale(0.985);
}

@media (max-width: 768px) {
    .title {
        font-size: 2.5rem;
    }

    .subtitle {
        font-size: 1rem;
    }

    .server-card {
        padding: 24px;
        border-radius: 12px;
    }

    .input-group {
        flex-direction: column;
    }

    .connect-btn {
        width: 100%;
    }

    .discovery-ribbon-header {
        flex-direction: column;
        align-items: stretch;
    }

    .discovery-icon-btn {
        align-self: flex-start;
    }

    .selected-server-strip-layer {
        left: 0;
        right: 0;
        top: calc(100% - 22px);
    }

    .selected-server-strip {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
    }

    .selected-server-topline {
        flex-direction: column;
        align-items: flex-start;
    }

    .selected-server-strip-side {
        min-width: 0;
    }

    .selected-server-meta-item {
        text-align: left;
    }

    .selected-server-meta-value {
        max-width: none;
    }

    .char {
        font-size: 3.5rem;
    }

    .control-buttons {
        top: 40px;
        right: 8px;
        gap: 8px;
    }

    .ctrl-btn {
        width: 36px;
        height: 36px;
    }

    .ctrl-btn svg {
        width: 18px;
        height: 18px;
    }

    .ctrl-btn .lang-text {
        font-size: 12px;
    }
}

@media (max-width: 1100px) {
    .control-buttons {
        flex-wrap: wrap;
        justify-content: flex-end;
        max-width: 220px;
    }

    .server-shell {
        max-width: min(520px, calc(100vw - 40px));
    }
}

@media (max-height: 760px) {
    .main-content {
        justify-content: flex-start;
        padding-top: 96px;
        overflow-y: auto;
    }

    .header-section {
        margin-bottom: 24px;
    }

    .title {
        font-size: clamp(2.4rem, 7vw, 4.5rem);
    }

    .char {
        font-size: clamp(2.8rem, 8vw, 4.2rem);
    }
}
</style>

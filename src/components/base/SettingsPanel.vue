<template>
    <Teleport to="body">
        <Transition name="overlay">
            <div v-if="isOpen" class="settings-overlay" @click="handleOverlayClick"></div>
        </Transition>
        
        <Transition name="slide">
            <div v-if="isOpen" class="settings-panel">
                <!-- 顶部标题栏 -->
                <div class="settings-header">
                    <h2 class="settings-title">{{ t('settings.title') }}</h2>
                    <button class="close-btn" @click="closePanel" :title="t('settings.close')">
                        <CloseIcon />
                    </button>
                </div>

                <div class="settings-content">
                    <!-- 左侧分类导航 -->
                    <div class="settings-nav">
                        <button
                            v-for="category in categories"
                            :key="category.key"
                            class="nav-item"
                            :class="{ active: activeCategory === category.key }"
                            @click="activeCategory = category.key"
                        >
                            <component :is="category.icon" class="nav-icon" />
                            <span class="nav-text">{{ getCategoryLabel(category.key) }}</span>
                        </button>
                    </div>

                    <!-- 右侧设置项 -->
                    <div class="settings-main">
                        <!-- 账户设置 -->
                        <div v-show="activeCategory === 'account'" class="settings-section">
                            <h3 class="section-title">{{ t('settings.account.title') }}</h3>
                            
                            <!-- 头像 -->
                            <div class="setting-item avatar-item">
                                <label class="setting-label">{{ t('settings.account.avatar') }}</label>
                                <div class="avatar-controls">
                                    <div class="avatar-preview">
                                        <img :src="settingsData.avatar" :alt="settingsData.userId" />
                                    </div>
                                    <button class="change-avatar-btn" @click="changeAvatar">
                                        {{ t('settings.account.changeAvatar') }}
                                    </button>
                                </div>
                            </div>

                            <!-- 用户 ID -->
                            <div class="setting-item userid-item">
                                <div class="label-with-help">
                                    <label class="setting-label">{{ t('settings.account.userId') }}</label>
                                    <div class="help-icon-wrapper" :title="userIdHelpTitle">
                                        <HelpCircleIcon class="help-icon" />
                                    </div>
                                </div>
                                <div class="input-with-button">
                                    <input 
                                        v-model="settingsData.userId" 
                                        type="text"
                                        class="setting-input"
                                        :class="{ 'error': userIdError }"
                                        :placeholder="t('settings.account.userIdPlaceholder')"
                                        @blur="checkUserId"
                                    />
                                    <button class="icon-btn" @click="regenerateUserId" :title="t('settings.account.regenerateId')">
                                        <RefreshIcon />
                                    </button>
                                </div>
                                <div v-if="userIdError" class="error-text">{{ userIdError }}</div>
                            </div>

                            <!-- 姓名 -->
                            <div class="setting-item name-group">
                                <label class="setting-label">{{ t('settings.account.name') }}</label>
                                <div class="name-inputs">
                                    <div class="name-field">
                                        <input 
                                            v-model="settingsData.lastName" 
                                            type="text"
                                            class="setting-input"
                                            :placeholder="t('settings.account.lastName')"
                                        />
                                    </div>
                                    <div class="name-field">
                                        <input 
                                            v-model="settingsData.firstName" 
                                            type="text"
                                            class="setting-input"
                                            :placeholder="t('settings.account.firstName')"
                                        />
                                    </div>
                                    <button class="icon-btn" @click="regenerateName" :title="t('settings.account.regenerateName')">
                                        <RefreshIcon />
                                    </button>
                                </div>
                            </div>

                            <!-- 邮箱 -->
                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.account.email') }}</label>
                                <input 
                                    v-model="settingsData.email" 
                                    type="email"
                                    class="setting-input"
                                    :placeholder="t('settings.account.emailPlaceholder')"
                                />
                            </div>

                        </div>

                        <!-- 通用设置 -->
                        <div v-show="activeCategory === 'general'" class="settings-section">
                            <h3 class="section-title">{{ t('settings.general.title') }}</h3>
                            
                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.general.language') }}</label>
                                <select v-model="settingsData.language" class="setting-select">
                                    <option value="zh-CN">简体中文</option>
                                    <option value="en-US">English</option>
                                </select>
                            </div>
                        </div>

                        <!-- 外观设置 -->
                        <div v-show="activeCategory === 'appearance'" class="settings-section">
                            <h3 class="section-title">{{ t('settings.appearance.title') }}</h3>
                            
                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.appearance.theme') }}</label>
                                <select v-model="settingsData.theme" class="setting-select">
                                    <option value="light">{{ t('theme.light') }}</option>
                                    <option value="dark">{{ t('theme.dark') }}</option>
                                </select>
                            </div>

                            <div class="setting-item setting-item-column">
                                <label class="setting-label">
                                    <span>{{ locale === 'zh-CN' ? '界面缩放' : 'Interface Scale' }}</span>
                                    <span class="setting-subtext">
                                        {{ locale === 'zh-CN'
                                            ? '适配不同尺寸屏幕。较小屏幕建议 90%-95%，大屏可使用 100%-110%。'
                                            : 'Adjusts the UI for different screen sizes. Smaller screens usually work best at 90%-95%.' }}
                                    </span>
                                </label>
                                <div class="scale-presets">
                                    <button
                                        v-for="preset in uiScalePresets"
                                        :key="preset.value"
                                        type="button"
                                        class="scale-preset-btn"
                                        :class="{ active: settingsData.uiScale === preset.value }"
                                        @click="settingsData.uiScale = preset.value"
                                    >
                                        {{ preset.label }}
                                    </button>
                                </div>
                                <div class="scale-slider-row">
                                    <input
                                        v-model.number="settingsData.uiScale"
                                        type="range"
                                        min="85"
                                        max="115"
                                        step="5"
                                        class="scale-slider"
                                    />
                                    <span class="scale-value">{{ settingsData.uiScale }}%</span>
                                </div>
                            </div>

                            <div v-if="supportsNativeWindowControls" class="setting-item setting-item-column">
                                <label class="setting-label">
                                    <span>{{ locale === 'zh-CN' ? '窗口尺寸' : 'Window Size' }}</span>
                                    <span class="setting-subtext">
                                        {{ locale === 'zh-CN'
                                            ? `会根据当前屏幕可用区域生成更多推荐尺寸。当前屏幕可用区域：${displayState.width} x ${displayState.height}。`
                                            : `Recommended sizes are generated from your current display work area. Current work area: ${displayState.width} x ${displayState.height}.` }}
                                    </span>
                                </label>
                                <select
                                    :value="selectedWindowSizeKey"
                                    class="setting-select window-size-select"
                                    @change="handleWindowSizeSelect"
                                >
                                    <option
                                        v-for="preset in windowSizePresets"
                                        :key="preset.key"
                                        :value="preset.key"
                                    >
                                        {{ preset.label }}
                                    </option>
                                </select>
                                <p class="setting-hint">
                                    {{ locale === 'zh-CN'
                                        ? '应用后会自动退出最大化状态，并立即调整窗口大小。'
                                        : 'Applying a size exits maximized mode and resizes the window immediately.' }}
                                </p>
                            </div>

                            <div class="setting-item setting-item-column">
                                <label class="setting-label">{{ t('settings.appearance.markdownLodThreshold') }}</label>
                                <input
                                    v-model.number="settingsData.performance.markdownLodScaleThreshold"
                                    type="number"
                                    class="setting-input"
                                    min="0.1"
                                    max="3"
                                    step="0.05"
                                />
                                <p class="setting-hint">{{ t('settings.appearance.markdownLodThresholdHint') }}</p>
                            </div>
                        </div>

                        <!-- 编辑器设置 -->
                        <div v-show="activeCategory === 'about'" class="settings-section">
                            <div class="about-section-head">
                                <div>
                                    <h3 class="section-title">{{ locale === 'zh-CN' ? '关于' : 'About' }}</h3>
                                    <p class="about-section-subtitle">
                                        {{ locale === 'zh-CN' ? '在设置页中快速查看当前软件的关键信息。' : 'Quick product information for the current app window.' }}
                                    </p>
                                </div>
                                <button class="secondary-btn" @click="openRepository">
                                    {{ locale === 'zh-CN' ? '打开仓库' : 'Open Repository' }}
                                </button>
                            </div>

                            <div class="about-overview-card">
                                <div class="about-badge">Constella</div>
                                <p class="about-description">{{ t('about.description') }}</p>
                            </div>

                            <div class="about-meta-grid">
                                <article v-for="card in aboutCards" :key="card.key" class="about-meta-card">
                                    <span class="about-meta-label">{{ card.label }}</span>
                                    <strong class="about-meta-value">{{ card.value }}</strong>
                                </article>
                            </div>

                            <div class="about-feature-block">
                                <h4 class="about-block-title">{{ t('about.features.title') }}</h4>
                                <div class="about-feature-list">
                                    <div
                                        v-for="featureKey in aboutFeatureKeys"
                                        :key="featureKey"
                                        class="about-feature-item"
                                    >
                                        <span class="about-feature-dot"></span>
                                        <span>{{ t(`about.features.${featureKey}`) }}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="about-feature-block">
                                <h4 class="about-block-title">{{ t('about.tech.title') }}</h4>
                                <div class="about-tech-list">
                                    <p class="about-tech-item">{{ t('about.tech.frontend') }}</p>
                                    <p class="about-tech-item">{{ t('about.tech.backend') }}</p>
                                    <p class="about-tech-item">{{ t('about.tech.realtime') }}</p>
                                </div>
                            </div>
                        </div>

                        <div v-show="activeCategory === 'editor'" class="settings-section">
                            <h3 class="section-title">{{ t('settings.editor.title') }}</h3>
                            
                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.editor.defaultFormat') }}</label>
                                <select v-model="settingsData.defaultFormat" class="setting-select">
                                    <option value="markdown">Markdown</option>
                                    <option value="text">Plain Text</option>
                                    <option value="latex">LaTeX</option>
                                </select>
                            </div>

                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.editor.spellCheck') }}</label>
                                <label class="toggle-switch">
                                    <input type="checkbox" v-model="settingsData.spellCheck" />
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <!-- 协作设置 -->
                        <div v-show="activeCategory === 'collaboration'" class="settings-section">
                            <h3 class="section-title">{{ t('settings.collaboration.title') }}</h3>
                            
                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.collaboration.showCursors') }}</label>
                                <label class="toggle-switch">
                                    <input type="checkbox" v-model="settingsData.showCursors" />
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>

                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.collaboration.showPresence') }}</label>
                                <label class="toggle-switch">
                                    <input type="checkbox" v-model="settingsData.showPresence" />
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <!-- 高级设置 -->
                        <div v-show="activeCategory === 'advanced'" class="settings-section">
                            <h3 class="section-title">{{ t('settings.advanced.title') }}</h3>
                            
                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.advanced.debugMode') }}</label>
                                <label class="toggle-switch">
                                    <input type="checkbox" v-model="settingsData.debugMode" />
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>

                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.advanced.clearCache') }}</label>
                                <button class="danger-btn" @click="clearCache">
                                    {{ t('settings.advanced.clearCache') }}
                                </button>
                            </div>
                        </div>

                        <div v-show="activeCategory === 'developer'" class="settings-section">
                            <h3 class="section-title">{{ locale === 'zh-CN' ? '开发者设置' : 'Developer Settings' }}</h3>

                            <div class="setting-item">
                                <label class="setting-label">
                                    <span>{{ locale === 'zh-CN' ? '开发者模式' : 'Developer Mode' }}</span>
                                    <span class="setting-subtext">
                                        {{ locale === 'zh-CN'
                                            ? '开启后显示开发插件目录加载入口与开发插件列表。'
                                            : 'Show development plugin loading entry points and development plugin lists.' }}
                                    </span>
                                </label>
                                <label class="toggle-switch">
                                    <input type="checkbox" v-model="settingsData.developerMode" />
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>

                            <div v-if="settingsData.developerMode" class="setting-item">
                                <label class="setting-label">
                                    <span>{{ t('settings.appearance.performancePanel') }}</span>
                                    <span class="setting-subtext">
                                        {{ locale === 'zh-CN'
                                            ? '控制画布性能面板显示；需同时开启开发者模式。'
                                            : 'Controls the canvas performance panel. Developer mode must also be enabled.' }}
                                    </span>
                                </label>
                                <label class="toggle-switch">
                                    <input type="checkbox" v-model="settingsData.performance.showCanvasPerformancePanel" />
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <!-- 插件设置 -->
                        <div v-show="activeCategory === 'plugins'" class="settings-section">
                            <PluginCatalogPane />
                        </div>

                        <div v-show="activeCategory === 'shortcuts'" class="settings-section">
                            <h3 class="section-title">{{ t('settings.shortcuts.title') }}</h3>

                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.shortcuts.select') }}</label>
                                <input v-model="settingsData.shortcuts.select" class="setting-input" placeholder="V" />
                            </div>

                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.shortcuts.pan') }}</label>
                                <input v-model="settingsData.shortcuts.pan" class="setting-input" placeholder="P" />
                            </div>

                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.shortcuts.node') }}</label>
                                <input v-model="settingsData.shortcuts.node" class="setting-input" placeholder="N" />
                            </div>

                            <div class="setting-item">
                                <label class="setting-label">{{ t('settings.shortcuts.edge') }}</label>
                                <input v-model="settingsData.shortcuts.edge" class="setting-input" placeholder="E" />
                            </div>

                            <div class="setting-item">
                                <button class="full-width-btn" @click="resetShortcuts">{{ t('settings.shortcuts.reset') }}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>

        <ConfirmDialog
            v-model="showRegenerateUserIdConfirm"
            :title="t('settings.account.regenerateIdConfirm.title')"
            :message="t('settings.account.regenerateIdConfirm.message')"
            :confirm-text="t('settings.account.regenerateIdConfirm.confirm')"
            @confirm="confirmRegenerateUserId"
        />
    </Teleport>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    UserIcon,
    SettingIcon,
    PaletteIcon,
    CloseIcon,
    HelpCircleIcon,
    InfoCircleIcon,
    RefreshIcon,
    CodeIcon,
    AddIcon,
    KeyboardIcon
} from 'tdesign-icons-vue-next'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
import PluginCatalogPane from '@/components/plugins/PluginCatalogPane.vue'
import {
    generateUserId,
    generateChineseName,
    generateEnglishName,
    generateAvatar,
    validateUserId
} from '@/utils/accountHelper'
import {
    installPluginPackage,
    refreshInstalledPluginsCatalog,
    removeInstalledPlugin,
    setInstalledPluginEnabled
} from '@/plugins/installed'
import { reloadPlugins } from '@/plugins/register'
import { getStoredTheme, setTheme } from '@/utils/theme'

const { t, locale } = useI18n()

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(props.modelValue)
const activeCategory = ref('general')
const lastAppliedDeveloperMode = ref(false)
const isSyncingSettings = ref(false)
const appVersion = __APP_VERSION__
const appRepositoryUrl = 'https://github.com/TiiJeiJ8/constella'

// 分类列表
const categories = [
    { key: 'account', icon: UserIcon },
    { key: 'general', icon: SettingIcon },
    { key: 'appearance', icon: PaletteIcon },
    { key: 'plugins', icon: AddIcon },
    { key: 'developer', icon: CodeIcon },
    { key: 'shortcuts', icon: KeyboardIcon },
    { key: 'about', icon: InfoCircleIcon }
]

const aboutCards = computed(() => [
    {
        key: 'version',
        label: t('about.version'),
        value: appVersion
    },
    {
        key: 'license',
        label: 'License',
        value: 'MIT'
    },
    {
        key: 'authors',
        label: t('about.authors.title'),
        value: `${t('about.authors.author1')} / ${t('about.authors.author2')}`
    }
])

const aboutFeatureKeys = computed(() =>
    locale.value === 'zh-CN'
        ? ['crossPlatform', 'infiniteCanvas', 'realtime', 'offline', 'secure', 'easyDeploy']
        : ['structuredCanvas', 'collaboration', 'roomPermissions', 'lanDiscovery', 'assetsSnapshots', 'pluginsExport']
)

const defaultShortcuts = {
    select: 'v',
    pan: 'p',
    node: 'n',
    edge: 'e'
}

const defaultPerformanceSettings = {
    showCanvasPerformancePanel: true,
    markdownLodScaleThreshold: 0.6
}
const MIN_WINDOW_WIDTH = 1100
const MIN_WINDOW_HEIGHT = 700
const DEFAULT_WINDOW_WIDTH = 1280
const DEFAULT_WINDOW_HEIGHT = 800
const COMMON_WINDOW_PRESETS = [
    [1024, 768],
    [1280, 720],
    [1280, 800],
    [1366, 768],
    [1440, 900],
    [1600, 900],
    [1600, 1000],
    [1680, 1050],
    [1920, 1080],
    [1920, 1200],
    [2048, 1280],
    [2560, 1440],
    [2560, 1600],
    [2560, 1920],
    [2880, 1800],
    [3200, 1800],
    [3840, 2160]
]

function normalizeMarkdownLodScaleThreshold(value) {
    const n = Number(value)
    if (!Number.isFinite(n)) return defaultPerformanceSettings.markdownLodScaleThreshold
    return Math.max(0.1, Math.min(3, n))
}

function normalizeUiScale(value) {
    const n = Number(value)
    if (!Number.isFinite(n)) return 100
    return Math.max(85, Math.min(115, Math.round(n / 5) * 5))
}

function normalizeWindowDimension(value, min, max, fallback) {
    const n = Number(value)
    if (!Number.isFinite(n)) return fallback
    return Math.max(min, Math.min(max, Math.round(n)))
}

function buildNormalizedSettingsSnapshot(source = settingsData) {
    const fallbackWidth = Math.min(displayState.width, Math.max(MIN_WINDOW_WIDTH, Number(source.windowSize?.width) || DEFAULT_WINDOW_WIDTH))
    const fallbackHeight = Math.min(displayState.height, Math.max(MIN_WINDOW_HEIGHT, Number(source.windowSize?.height) || DEFAULT_WINDOW_HEIGHT))

    return {
        ...source,
        uiScale: normalizeUiScale(source.uiScale),
        shortcuts: {
            ...defaultShortcuts,
            ...(source.shortcuts || {})
        },
        performance: {
            ...defaultPerformanceSettings,
            ...(source.performance || {}),
            markdownLodScaleThreshold: normalizeMarkdownLodScaleThreshold(source.performance?.markdownLodScaleThreshold),
            showCanvasPerformancePanel: source.performance?.showCanvasPerformancePanel !== false
        },
        windowSize: {
            width: normalizeWindowDimension(source.windowSize?.width, MIN_WINDOW_WIDTH, displayState.width, fallbackWidth),
            height: normalizeWindowDimension(source.windowSize?.height, MIN_WINDOW_HEIGHT, displayState.height, fallbackHeight)
        }
    }
}

// 设置数据（仅保留必要项）
const settingsData = reactive({
    // 账户信息
    userId: '',
    firstName: '',
    lastName: '',
    avatar: '',
    email: '',
    // 通用设置
    language: 'zh-CN',
    developerMode: false,
    // 外观设置（仅保留主题）
    theme: getStoredTheme(),
    uiScale: 100,
    windowSize: {
        width: DEFAULT_WINDOW_WIDTH,
        height: DEFAULT_WINDOW_HEIGHT
    },
    // 快捷键
    shortcuts: { ...defaultShortcuts },
    // 性能相关
    performance: { ...defaultPerformanceSettings }
})

// 验证错误
const userIdError = ref('')
const showRegenerateUserIdConfirm = ref(false)
const installedPlugins = ref([])
const pluginBusy = ref(false)
const pluginError = ref('')
const supportsPluginManagement = computed(() => Boolean(window.electron?.listInstalledPlugins))
const supportsNativeWindowControls = computed(() => Boolean(
    window.electron?.getWindowState &&
    window.electron?.setWindowSize &&
    window.electron?.setWindowZoomFactor
))
const displayState = reactive({
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    scaleFactor: 1
})
const uiScalePresets = computed(() => locale.value === 'zh-CN'
    ? [
        { value: 90, label: '紧凑 90%' },
        { value: 100, label: '标准 100%' },
        { value: 110, label: '宽松 110%' }
    ]
    : [
        { value: 90, label: 'Compact 90%' },
        { value: 100, label: 'Default 100%' },
        { value: 110, label: 'Large 110%' }
    ]
)
const windowSizePresets = computed(() => {
    const map = new Map()

    const appendPreset = (width, height, labelSuffix = '') => {
        if (width > displayState.width || height > displayState.height) return
        if (width < MIN_WINDOW_WIDTH || height < MIN_WINDOW_HEIGHT) return

        const key = `${width}x${height}`
        if (map.has(key)) return

        const labelBase = `${width} x ${height}`
        map.set(key, {
            key,
            width,
            height,
            label: labelSuffix ? `${labelBase} ${labelSuffix}` : labelBase
        })
    }

    appendPreset(
        settingsData.windowSize.width,
        settingsData.windowSize.height,
        locale.value === 'zh-CN' ? '(当前)' : '(Current)'
    )
    appendPreset(
        displayState.width,
        displayState.height,
        locale.value === 'zh-CN' ? '(屏幕可用区)' : '(Display)'
    )

    for (const [width, height] of COMMON_WINDOW_PRESETS) {
        appendPreset(width, height)
    }

    return Array.from(map.values()).sort((left, right) => (left.width * left.height) - (right.width * right.height))
})
const selectedWindowSizeKey = computed(() => `${settingsData.windowSize.width}x${settingsData.windowSize.height}`)
const userIdHelpTitle = computed(() => `${t('settings.account.userIdHint')}\n${t('settings.account.userIdRules')}`)
const settingsCopy = computed(() => ({
    uiScaleTitle: locale.value === 'zh-CN' ? '界面缩放' : 'Interface Scale',
    uiScaleHint: locale.value === 'zh-CN'
        ? '适配不同尺寸屏幕。较小屏幕建议 90%-95%，大屏可使用 100%-110%。'
        : 'Adjusts the UI for different screen sizes. Smaller screens usually work best at 90%-95%.',
    aboutTitle: locale.value === 'zh-CN' ? '关于' : 'About',
    aboutSubtitle: locale.value === 'zh-CN'
        ? '在设置页中快速查看当前软件的关键信息。'
        : 'Quick product information for the current app window.',
    openRepository: locale.value === 'zh-CN' ? '打开仓库' : 'Open Repository',
    developerTitle: locale.value === 'zh-CN' ? '开发者设置' : 'Developer Settings',
    developerModeTitle: locale.value === 'zh-CN' ? '开发者模式' : 'Developer Mode',
    developerModeHint: locale.value === 'zh-CN'
        ? '开启后显示开发插件目录加载入口与开发插件列表。'
        : 'Show development plugin loading entry points and development plugin lists.',
    performancePanelHint: locale.value === 'zh-CN'
        ? '控制画布性能面板显示；需同时开启开发者模式。'
        : 'Controls the canvas performance panel. Developer mode must also be enabled.',
    developerCategory: locale.value === 'zh-CN' ? '开发者' : 'Developer',
    pluginsCategory: locale.value === 'zh-CN' ? '插件' : 'Plugins',
    aboutCategory: locale.value === 'zh-CN' ? '关于' : 'About',
    clearCacheConfirm: locale.value === 'zh-CN' ? '确定要清除缓存吗？' : 'Are you sure to clear cache?',
    clearCacheDone: locale.value === 'zh-CN' ? '缓存已清除，请重启应用' : 'Cache cleared, please restart the app',
    removePluginConfirm: (pluginName) => locale.value === 'zh-CN'
        ? `确定删除插件“${pluginName}”吗？`
        : `Remove plugin "${pluginName}"?`
}))

const pluginText = computed(() => {
    if (locale.value === 'zh-CN') {
        return {
            title: '插件管理',
            description: '可在此安装、启用、停用与删除运行时插件。变更后会重载应用，以刷新节点类型列表。',
            install: '安装插件',
            refresh: '刷新',
            reloadApp: '重载应用',
            desktopOnly: '插件管理仅在 Electron 桌面版中可用。',
            empty: '尚未安装任何插件。',
            installedCount: (count) => `已安装 ${count} 个插件`,
            remove: '删除',
            author: '作者',
            source: '来源',
            installedAt: '安装时间',
            nodeKinds: '节点类型'
        }
    }

    return {
        title: 'Plugin Management',
        description: 'Install, enable, disable, and remove runtime plugins. Changes reload the app to refresh the active node catalog.',
        install: 'Install Plugin',
        refresh: 'Refresh',
        reloadApp: 'Reload App',
        desktopOnly: 'Plugin management is only available in the Electron desktop app.',
        empty: 'No plugins installed yet.',
        installedCount: (count) => `${count} plugin(s) installed`,
        remove: 'Remove',
        author: 'Author',
        source: 'Source',
        installedAt: 'Installed',
        nodeKinds: 'Node kinds'
    }
})

// 监听 modelValue 变化
watch(() => props.modelValue, (newVal) => {
    isOpen.value = newVal
    // 面板打开时重新加载设置，确保同步外部更改
    if (newVal) {
        loadSettings()
        void refreshPluginCatalog()
    }
})

// 监听 isOpen 变化
watch(isOpen, (newVal) => {
    emit('update:modelValue', newVal)
})

// 加载保存的设置
const loadSettings = () => {
    let parsed = {}
    const saved = localStorage.getItem('settings')
    if (saved) {
        try {
            parsed = JSON.parse(saved)
            Object.assign(settingsData, parsed)
        } catch (error) {
            console.warn('Failed to parse saved settings, fallback to defaults', error)
        }
    }

    settingsData.shortcuts = {
        ...defaultShortcuts,
        ...(parsed.shortcuts || {})
    }

    settingsData.performance = {
        ...defaultPerformanceSettings,
        ...(parsed.performance || {})
    }
    settingsData.performance.markdownLodScaleThreshold = normalizeMarkdownLodScaleThreshold(
        settingsData.performance.markdownLodScaleThreshold
    )
    settingsData.uiScale = normalizeUiScale(parsed.uiScale ?? settingsData.uiScale)
    settingsData.windowSize = {
        width: normalizeWindowDimension(
                parsed.windowSize?.width ?? settingsData.windowSize.width,
                MIN_WINDOW_WIDTH,
                displayState.width,
                Math.min(displayState.width, Math.max(MIN_WINDOW_WIDTH, settingsData.windowSize.width))
        ),
        height: normalizeWindowDimension(
                parsed.windowSize?.height ?? settingsData.windowSize.height,
                MIN_WINDOW_HEIGHT,
                displayState.height,
                Math.min(displayState.height, Math.max(MIN_WINDOW_HEIGHT, settingsData.windowSize.height))
        )
    }

    // 优先使用 localStorage 中的 theme 和 locale 值
    const savedTheme = getStoredTheme()
    if (savedTheme) {
        settingsData.theme = savedTheme
    }
    const savedLocale = localStorage.getItem('locale')
    if (savedLocale) {
        settingsData.language = savedLocale
    }

    lastAppliedDeveloperMode.value = settingsData.developerMode === true
    
    // 初始化账户信息（如果没有）
    initializeAccount()
}

// 初始化账户信息
const initializeAccount = () => {
    if (!settingsData.userId) {
        settingsData.userId = generateUserId()
    }
    
    if (!settingsData.firstName || !settingsData.lastName) {
        const name = settingsData.language === 'zh-CN' 
            ? generateChineseName() 
            : generateEnglishName()
        settingsData.firstName = name.firstName
        settingsData.lastName = name.lastName
    }
    
    if (!settingsData.avatar) {
        settingsData.avatar = generateAvatar(settingsData.userId)
    }
}

// 保存设置
const saveSettings = () => {
    const payload = JSON.stringify(buildNormalizedSettingsSnapshot())
    localStorage.setItem('settings', payload)
    try {
        // 广播设置更新，方便其他组件实时响应
        window.dispatchEvent(new CustomEvent('settings-updated', { detail: JSON.parse(payload) }))
    } catch (e) {
        console.warn('Failed to dispatch settings-updated event', e)
    }
}

// 监听设置变化并自动保存
watch(settingsData, () => {
    if (isSyncingSettings.value) return
    saveSettings()
    applySettings()
}, { deep: true })

// 应用设置
const applySettings = () => {
    const normalized = buildNormalizedSettingsSnapshot()
    // 应用语言设置
    if (normalized.language !== locale.value) {
        locale.value = normalized.language
        localStorage.setItem('locale', normalized.language)
    }

    // 应用主题设置
    if (normalized.theme) {
        setTheme(normalized.theme)
    }

    if (window.electron?.setWindowZoomFactor) {
        void window.electron.setWindowZoomFactor(normalized.uiScale / 100)
    }

    if (window.electron?.setWindowSize) {
        void window.electron.setWindowSize(normalized.windowSize.width, normalized.windowSize.height)
    }

    if (normalized.developerMode !== lastAppliedDeveloperMode.value) {
        lastAppliedDeveloperMode.value = normalized.developerMode === true
        void reloadPlugins()
    }

    // 移除字体设置（不再管理字体大小）
}

// 关闭面板
const closePanel = () => {
    isOpen.value = false
}
const refreshPluginCatalog = async () => {
    if (!supportsPluginManagement.value) {
        installedPlugins.value = []
        return
    }

    pluginError.value = ''
    try {
        installedPlugins.value = await refreshInstalledPluginsCatalog()
    } catch (error) {
        console.error('[Plugins] Failed to refresh plugin catalog:', error)
        pluginError.value = error instanceof Error ? error.message : String(error)
    }
}

function formatInstalledTime(value) {
    if (!value) return '-'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function reloadApplication() {
    window.location.reload()
}

function openRepository() {
    if (window.electron?.openExternal) {
        window.electron.openExternal(appRepositoryUrl)
        return
    }

    window.open(appRepositoryUrl, '_blank')
}

async function syncWindowState() {
    if (!window.electron?.getWindowState) return

    try {
        const state = await window.electron.getWindowState()
        displayState.width = state.display.width
        displayState.height = state.display.height
        displayState.scaleFactor = state.display.scaleFactor

        if (!localStorage.getItem('settings')) {
            settingsData.windowSize = {
                width: state.width || Math.min(displayState.width, DEFAULT_WINDOW_WIDTH),
                height: state.height || Math.min(displayState.height, DEFAULT_WINDOW_HEIGHT)
            }
            settingsData.uiScale = normalizeUiScale((state.zoomFactor || 1) * 100)
            return
        }

        settingsData.windowSize = {
            width: normalizeWindowDimension(
                settingsData.windowSize.width || state.width,
                MIN_WINDOW_WIDTH,
                displayState.width,
                Math.min(displayState.width, state.width || DEFAULT_WINDOW_WIDTH)
            ),
            height: normalizeWindowDimension(
                settingsData.windowSize.height || state.height,
                MIN_WINDOW_HEIGHT,
                displayState.height,
                Math.min(displayState.height, state.height || DEFAULT_WINDOW_HEIGHT)
            )
        }
    } catch (error) {
        console.warn('Failed to query native window state', error)
    }
}

function selectWindowSizePreset(preset) {
    settingsData.windowSize = {
        width: preset.width,
        height: preset.height
    }
}

function handleWindowSizeSelect(event) {
    const value = event?.target?.value
    const preset = windowSizePresets.value.find(item => item.key === value)
    if (!preset) return
    selectWindowSizePreset(preset)
}

async function handleInstallPlugin() {
    if (!supportsPluginManagement.value) return

    pluginBusy.value = true
    pluginError.value = ''
    try {
        await installPluginPackage()
        await refreshPluginCatalog()
        reloadApplication()
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!/cancel/i.test(message)) {
            pluginError.value = message
        }
    } finally {
        pluginBusy.value = false
    }
}

async function handleTogglePlugin(pluginId, enabled) {
    if (!supportsPluginManagement.value) return

    pluginBusy.value = true
    pluginError.value = ''
    try {
        await setInstalledPluginEnabled(pluginId, enabled)
        await refreshPluginCatalog()
        reloadApplication()
    } catch (error) {
        pluginError.value = error instanceof Error ? error.message : String(error)
    } finally {
        pluginBusy.value = false
    }
}

async function handleRemovePlugin(pluginId, pluginName) {
    const confirmed = confirm(
        locale.value === 'zh-CN'
            ? `确定删除插件“${pluginName}”吗？`
            : `Remove plugin "${pluginName}"?`
    )

    if (!confirmed) return

    pluginBusy.value = true
    pluginError.value = ''
    try {
        await removeInstalledPlugin(pluginId)
        await refreshPluginCatalog()
        reloadApplication()
    } catch (error) {
        pluginError.value = error instanceof Error ? error.message : String(error)
    } finally {
        pluginBusy.value = false
    }
}

function getCategoryLabel(categoryKey) {
    if (categoryKey === 'developer') {
        return locale.value === 'zh-CN' ? '开发者' : 'Developer'
    }

    if (categoryKey === 'plugins') {
        return locale.value === 'zh-CN' ? '插件' : 'Plugins'
    }

    if (categoryKey === 'about') {
        return locale.value === 'zh-CN' ? '关于' : 'About'
    }

    return t(`settings.categories.${categoryKey}`)
}

// 点击遮罩层关闭
const handleOverlayClick = () => {
    closePanel()
}

// 清除缓存
const clearCache = () => {
    if (confirm(locale.value === 'zh-CN' ? '确定要清除缓存吗？' : 'Are you sure to clear cache?')) {
        localStorage.clear()
        alert(locale.value === 'zh-CN' ? '缓存已清除，请重启应用' : 'Cache cleared, please restart the app')
    }
}

const resetShortcuts = () => {
    settingsData.shortcuts = { ...defaultShortcuts }
}

// 重新生成用户 ID
const regenerateUserId = () => {
    showRegenerateUserIdConfirm.value = true
}

const confirmRegenerateUserId = () => {
    settingsData.userId = generateUserId()
    settingsData.avatar = generateAvatar(settingsData.userId)
    userIdError.value = ''
}

// 重新生成姓名
const regenerateName = () => {
    const name = settingsData.language === 'zh-CN' 
        ? generateChineseName() 
        : generateEnglishName()
    settingsData.firstName = name.firstName
    settingsData.lastName = name.lastName
}

// 更换头像
const changeAvatar = () => {
    // 使用时间戳作为 seed 生成新头像
    const seed = `${settingsData.userId}-${Date.now()}`
    settingsData.avatar = generateAvatar(seed)
}

// 验证用户 ID
const checkUserId = () => {
    if (!settingsData.userId) {
        userIdError.value = ''
        return
    }
    
    if (!validateUserId(settingsData.userId)) {
        userIdError.value = t('settings.account.errors.invalidUserId')
    } else {
        userIdError.value = ''
    }
}

// 初始化时加载设置
isSyncingSettings.value = true
void syncWindowState().finally(() => {
    loadSettings()
    applySettings()
    isSyncingSettings.value = false
})
</script>

<style scoped>
/* ==================== 遮罩层 ==================== */
.settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2000;
    backdrop-filter: blur(2px);
}

/* ==================== 设置面板 ==================== */
.settings-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(720px, calc(100vw - 24px));
    max-width: 100vw;
    background: var(--bg-primary);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
    z-index: 2001;
    display: flex;
    flex-direction: column;
    border-radius: 12px 0 0 12px;
}

/* ==================== 顶部标题栏 ==================== */
.settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
    -webkit-app-region: drag;
}

.settings-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: all 0.2s ease;
    -webkit-app-region: no-drag;
}

.close-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

/* ==================== 内容区域 ==================== */
.settings-content {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
}

/* ==================== 左侧导航 ==================== */
.settings-nav {
    width: clamp(180px, 24vw, 220px);
    padding: 16px 12px;
    border-right: 1px solid var(--border-color);
    overflow-y: auto;
    flex-shrink: 0;
}

.nav-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    margin-bottom: 4px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 0.875rem;
    transition: all 0.2s ease;
    cursor: pointer;
    text-align: left;
}

.nav-item:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.nav-item.active {
    background: var(--accent-primary);
    color: #fff;
}

.nav-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

.nav-text {
    flex: 1;
}

/* ==================== 右侧主内容 ==================== */
.settings-main {
    flex: 1;
    padding: clamp(18px, 2.4vw, 24px);
    overflow-y: auto;
    min-width: 0;
}

.settings-section {
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.section-title {
    font-size: clamp(1rem, 1vw + 0.75rem, 1.125rem);
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 20px 0;
}

.about-section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
}

.about-section-subtitle {
    margin: 8px 0 0;
    color: var(--text-secondary);
    line-height: 1.6;
    font-size: 0.92rem;
}

.about-overview-card,
.about-feature-block,
.about-meta-card {
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    border-radius: 16px;
}

.about-overview-card {
    padding: 18px;
    margin-bottom: 18px;
}

.about-badge {
    display: inline-flex;
    align-items: center;
    padding: 5px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent-primary) 12%, var(--bg-primary) 88%);
    color: var(--accent-primary);
    font-weight: 700;
    font-size: 0.8rem;
    margin-bottom: 12px;
}

.about-description {
    margin: 0;
    color: var(--text-primary);
    line-height: 1.7;
}

.about-meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 14px;
    margin-bottom: 18px;
}

.about-meta-card {
    padding: 16px;
    display: grid;
    gap: 6px;
}

.about-meta-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary);
}

.about-meta-value {
    color: var(--text-primary);
    line-height: 1.5;
    word-break: break-word;
}

.about-feature-block {
    padding: 18px;
    margin-bottom: 16px;
}

.about-block-title {
    margin: 0 0 14px;
    font-size: 0.95rem;
    color: var(--text-primary);
}

.about-feature-list,
.about-tech-list {
    display: grid;
    gap: 10px;
}

.about-feature-list {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.about-feature-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: var(--text-primary);
    line-height: 1.5;
}

.about-feature-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 8px;
    flex-shrink: 0;
    background: var(--accent-primary);
}

.about-tech-item {
    margin: 0;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    color: var(--text-primary);
    line-height: 1.5;
}

/* ==================== 设置项 ==================== */
.setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid var(--border-light);
}

.section-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.plugin-actions {
    display: flex;
    gap: 10px;
}

.primary-btn,
.secondary-btn,
.link-btn {
    border: none;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.primary-btn,
.secondary-btn {
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
}

.primary-btn {
    background: #111827;
    color: #ffffff;
}

.secondary-btn {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.link-btn {
    background: transparent;
    color: var(--primary-color, #2563eb);
    padding: 0;
    font-size: 13px;
}

.plugin-summary-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin: 18px 0 14px;
    color: var(--text-secondary);
    font-size: 13px;
}

.plugin-list {
    display: grid;
    gap: 14px;
}

.plugin-card {
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 16px;
    background: var(--bg-secondary);
    display: grid;
    gap: 14px;
}

.plugin-card-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
}

.plugin-name-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.plugin-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
}

.plugin-version {
    font-size: 12px;
    color: var(--text-secondary);
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--bg-tertiary);
}

.plugin-id {
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-secondary);
    word-break: break-all;
}

.plugin-description {
    margin: 12px 0 0;
    color: var(--text-primary);
    line-height: 1.6;
}

.plugin-meta-grid {
    margin-top: 12px;
    display: grid;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 12px;
}

.plugin-card-actions {
    display: flex;
    justify-content: flex-end;
}

.plugin-error {
    margin-top: 12px;
}

.setting-item.userid-item {
    align-items: flex-start;
    flex-wrap: wrap;
}

.setting-item.userid-item .label-with-help {
    flex: none;
}

.setting-item.userid-item .input-with-button {
    flex: 1;
    max-width: 400px;
}

.setting-item.userid-item .error-text {
    width: 100%;
    margin-top: 8px;
    margin-left: 0;
}

.setting-item.avatar-item {
    flex-direction: column;
    align-items: flex-start;
}

.setting-item.setting-item-column {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
}

.setting-item.setting-item-column .setting-input {
    width: min(220px, 100%);
}

.scale-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.window-size-select {
    width: min(360px, 100%);
}

.scale-preset-btn {
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 0.8rem;
    font-weight: 600;
    transition: all 0.2s ease;
}

.scale-preset-btn:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
}

.scale-preset-btn.active {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    color: #fff;
}

.scale-slider-row {
    width: min(320px, 100%);
    display: flex;
    align-items: center;
    gap: 12px;
}

.scale-slider {
    flex: 1;
    accent-color: var(--accent-primary);
}

.scale-value {
    min-width: 48px;
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-align: right;
}

.setting-hint {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin: 0;
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.setting-subtext {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--text-secondary);
    line-height: 1.5;
}

.label-with-help {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
}

.help-icon-wrapper {
    display: flex;
    align-items: center;
    cursor: help;
}

.help-icon {
    width: 16px;
    height: 16px;
    color: var(--text-tertiary);
    margin-right: 100px;
    transition: color 0.2s ease;
}

.help-icon-wrapper:hover .help-icon {
    color: var(--accent-primary);
}

.setting-select,
.setting-input {
    width: min(220px, 100%);
    padding: 8px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 0.875rem;
    transition: all 0.2s ease;
}

.setting-select:focus,
.setting-input:focus {
    border-color: var(--accent-primary);
    outline: none;
}

.setting-input.error {
    border-color: #e53935;
}

/* ==================== 头像相关 ==================== */
.avatar-controls {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    margin-top: 8px;
}

.avatar-preview {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid var(--accent-primary);
    flex-shrink: 0;
}

.avatar-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.change-avatar-btn {
    padding: 8px 16px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.change-avatar-btn:hover {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    color: #fff;
}

/* ==================== 带按钮的输入框 ==================== */
.input-with-button {
    display: flex;
    gap: 8px;
    flex: 1;
    max-width: 400px;
}

.input-with-button .setting-input {
    flex: 1;
    width: auto;
}

.icon-btn {
    width: 36px;
    height: 36px;
    padding: 0;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.icon-btn:hover {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    color: #fff;
}

.icon-btn svg {
    width: 18px;
    height: 18px;
}

/* ==================== 错误提示 ==================== */
.error-text {
    font-size: 0.75rem;
    color: #e53935;
    margin-top: 4px;
}

/* ==================== 姓名输入组 ==================== */
.setting-item.name-group {
    flex-direction: column;
    align-items: flex-start;
}

.name-inputs {
    display: flex;
    gap: 12px;
    width: 100%;
    margin-top: 8px;
}

.name-field {
    flex: 1;
}

.name-field .setting-input {
    width: 100%;
}

/* ==================== 密码强度 ==================== */
.password-strength {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    font-size: 0.75rem;
}

.strength-label {
    color: var(--text-secondary);
}

.strength-indicator {
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
}

.strength-indicator.weak {
    color: #e53935;
    background: rgba(229, 57, 53, 0.1);
}

.strength-indicator.medium {
    color: #ff9800;
    background: rgba(255, 152, 0, 0.1);
}

.strength-indicator.strong {
    color: #43a047;
    background: rgba(67, 160, 71, 0.1);
}

/* ==================== 开关按钮 ==================== */
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 26px;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--border-color);
    transition: 0.3s;
    border-radius: 26px;
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
    background-color: var(--accent-primary);
}

.toggle-switch input:checked + .toggle-slider:before {
    transform: translateX(22px);
}

/* ==================== 危险按钮 ==================== */
.danger-btn {
    padding: 8px 16px;
    background: #e53935;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.danger-btn:hover {
    background: #c62828;
}

/* 全宽按钮（如：重置快捷键） */
.full-width-btn {
    width: 100%;
    padding: 10px 12px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    white-space: normal; /* 允许换行 */
    word-break: break-word;
}

.full-width-btn:hover {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    color: #fff;
}

/* ==================== 过渡动画 ==================== */
.overlay-enter-active,
.overlay-leave-active {
    transition: opacity 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
    opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
    transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
    transform: translateX(100%);
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 1080px), (max-height: 820px) {
    .settings-panel {
        width: min(680px, calc(100vw - 16px));
    }

    .settings-nav {
        width: 180px;
        padding: 14px 10px;
    }

    .nav-item {
        gap: 10px;
        padding: 10px;
    }
}

@media (max-width: 768px) {
    .settings-panel {
        width: 100%;
    }

    .settings-nav {
        width: 148px;
        padding: 12px 8px;
    }

    .nav-item {
        margin-bottom: 4px;
        padding: 9px 10px;
        gap: 8px;
    }

    .setting-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }

    .setting-select,
    .setting-input {
        width: 100%;
    }

    .about-section-head {
        flex-direction: column;
        align-items: stretch;
    }
}

@media (max-height: 720px) {
    .settings-header {
        padding: 14px 18px;
    }

    .settings-main {
        padding: 16px 18px 20px;
    }
}
</style>

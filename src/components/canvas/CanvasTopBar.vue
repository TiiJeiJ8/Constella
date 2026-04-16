<template>
    <div class="canvas-topbar">
        <div class="topbar-section topbar-left">
            <button class="circular-btn exit-btn" :title="t('canvas.topBar.exitRoom')" @click="$emit('exit')">
                <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M10.25 6.75L5 12l5.25 5.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                    <path d="M19 12H5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.9" />
                </svg>
            </button>

            <div class="room-info-card">
                <div class="room-title-row">
                    <h1 class="room-title">{{ roomName }}</h1>
                    <span v-if="roleBadgeLabel" class="role-badge" :class="roleBadgeClass">{{ roleBadgeLabel }}</span>
                    <button class="permission-trigger" :title="permissionTooltip" type="button">
                        <svg class="permission-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8" />
                            <path d="M12 10v6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
                            <circle cx="12" cy="7.5" r="1" fill="currentColor" />
                        </svg>
                    </button>
                </div>

                <div class="room-meta-row">
                    <div class="sync-status" :class="{ syncing: isSyncing }">
                        <span class="status-dot"></span>
                        <span class="status-text">{{ isSyncing ? t('canvas.statusBar.syncing') : t('canvas.statusBar.synced') }}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="topbar-section topbar-right">
            <div class="menu-group">
                <Transition name="slide-fade">
                    <div v-if="isMenuExpanded" class="menu-buttons">
                        <button class="circular-btn menu-item language-btn" :title="languageToggleTitle" @click="toggleLanguage">
                            <span class="lang-icon">{{ locale === 'zh-CN' ? 'EN' : '中' }}</span>
                        </button>
                        <button class="circular-btn menu-item" :title="themeToggleTitle" @click="toggleTheme">
                            <svg v-if="isDarkTheme" class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.66 6.34l-1.55 1.55M7.89 16.11l-1.55 1.55M17.66 17.66l-1.55-1.55M7.89 7.89L6.34 6.34" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
                                <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8" />
                            </svg>
                            <svg v-else class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M18.5 14.75A7.25 7.25 0 0 1 9.25 5.5a7.75 7.75 0 1 0 9.25 9.25Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8" />
                            </svg>
                        </button>
                        <button class="circular-btn menu-item" :title="t('settings.title')" @click="openSettings">
                            <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M10.1 3.7h3.8l.55 2.08c.3.09.59.21.87.36l1.97-.92 2.68 2.68-.92 1.97c.15.28.27.57.36.87l2.08.55v3.8l-2.08.55c-.09.3-.21.59-.36.87l.92 1.97-2.68 2.68-1.97-.92c-.28.15-.57.27-.87.36l-.55 2.08h-3.8l-.55-2.08a6.3 6.3 0 0 1-.87-.36l-1.97.92-2.68-2.68.92-1.97a6.3 6.3 0 0 1-.36-.87l-2.08-.55v-3.8l2.08-.55c.09-.3.21-.59.36-.87l-.92-1.97 2.68-2.68 1.97.92c.28-.15.57-.27.87-.36L10.1 3.7Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.45" />
                                <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" stroke-width="1.8" />
                            </svg>
                        </button>
                    </div>
                </Transition>

                <button class="circular-btn menu-toggle" :class="{ active: isMenuExpanded }" :title="menuToggleTitle" @click="toggleMenu">
                    <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 12h12M12 6v12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.9" />
                    </svg>
                </button>

                <button class="circular-btn action-btn" :class="{ disabled: !canManageSnapshots }" :disabled="!canManageSnapshots" :title="t('canvas.topBar.snapshot')" @click="$emit('create-snapshot')">
                    <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 4.75h7l3 3v11.5H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.7" />
                        <path d="M14 4.75V8h3" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.7" />
                        <path d="M8.75 13.25h6.5M8.75 16h4.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
                    </svg>
                </button>

                <button class="circular-btn action-btn" :class="{ disabled: !canEditCanvas }" :disabled="!canEditCanvas" :title="t('canvas.topBar.import')" @click="triggerImport">
                    <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 4.5v9.5M8.5 10.5 12 14l3.5-3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                        <path d="M5.5 17.5h13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.9" />
                    </svg>
                </button>

                <input ref="fileInputRef" type="file" accept=".json,.constella" style="display: none" @change="handleFileImport" />

                <div class="export-dropdown">
                    <button class="circular-btn action-btn" :title="t('canvas.topBar.export')" @click="toggleExportMenu">
                        <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 19.5V10M8.5 13.5 12 10l3.5 3.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                            <path d="M5.5 6.5h13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.9" />
                        </svg>
                    </button>

                    <Transition name="fade">
                        <div v-if="isExportMenuOpen" class="export-menu">
                            <button class="export-option" @click="exportAsJSON">
                                <svg class="option-icon" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M9.5 6.5 6 12l3.5 5.5M14.5 6.5 18 12l-3.5 5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
                                </svg>
                                <span class="option-text">{{ t('canvas.topBar.exportJSON') }}</span>
                            </button>
                            <div class="export-divider"></div>
                            <button class="export-option" @click="exportAsPNG">
                                <svg class="option-icon" viewBox="0 0 24 24" aria-hidden="true">
                                    <rect x="4.75" y="5.5" width="14.5" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7" />
                                    <circle cx="9" cy="10" r="1.2" fill="currentColor" />
                                    <path d="m8 16 3.2-3.2L14 15l1.8-1.8L17 14.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
                                </svg>
                                <span class="option-text">{{ t('canvas.topBar.exportPNG') }}</span>
                            </button>
                            <button class="export-option" @click="exportAsSVG">
                                <svg class="option-icon" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M7 16.5 12 7.5l5 9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
                                    <path d="M9.5 13h5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
                                </svg>
                                <span class="option-text">{{ t('canvas.topBar.exportSVG') }}</span>
                            </button>
                        </div>
                    </Transition>
                </div>

                <button class="circular-btn action-btn members-btn" :title="t('canvas.topBar.members')" @click="$emit('members-click')">
                    <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="9" cy="9" r="2.5" fill="none" stroke="currentColor" stroke-width="1.7" />
                        <circle cx="16.5" cy="10.5" r="2" fill="none" stroke="currentColor" stroke-width="1.5" />
                        <path d="M4.75 18.25a4.75 4.75 0 0 1 8.5 0M13.25 18.25a3.6 3.6 0 0 1 6 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
                    </svg>
                    <span class="badge">{{ onlineCount }}</span>
                </button>
            </div>
        </div>

        <SettingsPanel v-model="isSettingsPanelOpen" />
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SettingsPanel from '@/components/base/SettingsPanel.vue'

const { t, locale } = useI18n()

const props = defineProps({
    roomId: { type: String, required: true },
    roomName: { type: String, default: 'Untitled Room' },
    roomRole: { type: String, default: '' },
    isSyncing: { type: Boolean, default: false },
    onlineCount: { type: Number, default: 1 },
    canEditCanvas: { type: Boolean, default: true },
    canManageSnapshots: { type: Boolean, default: true }
})

const emit = defineEmits(['exit', 'export', 'import', 'create-snapshot', 'members-click'])

const isMenuExpanded = ref(false)
const isSettingsPanelOpen = ref(false)
const isExportMenuOpen = ref(false)
const fileInputRef = ref(null)
const isDarkTheme = ref(false)

const uiText = computed(() => ({
    languageToggleTitle: locale.value === 'zh-CN' ? 'Switch to English' : '切换到中文',
    themeToggleTitle: locale.value === 'zh-CN' ? '切换主题' : 'Toggle theme',
    menuCollapseTitle: locale.value === 'zh-CN' ? '收起菜单' : 'Collapse menu',
    menuExpandTitle: locale.value === 'zh-CN' ? '展开菜单' : 'Expand menu',
    roleLabels: {
        owner: locale.value === 'zh-CN' ? '所有者' : 'Owner',
        admin: locale.value === 'zh-CN' ? '管理员' : 'Admin',
        member: locale.value === 'zh-CN' ? '可编辑' : 'Editor',
        viewer: locale.value === 'zh-CN' ? '只读' : 'Read only'
    },
    permissionReadOnly: locale.value === 'zh-CN'
        ? '当前权限：可查看、选择和浏览画布，但不能修改内容。'
        : 'Permission: browse and inspect only.',
    permissionManageSnapshots: locale.value === 'zh-CN'
        ? '当前权限：可编辑画布，并可创建、恢复与管理快照。'
        : 'Permission: edit canvas and manage snapshots.',
    permissionEditOnly: locale.value === 'zh-CN'
        ? '当前权限：可编辑画布，但不可管理快照。'
        : 'Permission: edit canvas, but snapshot management is disabled.'
}))

const languageToggleTitle = computed(() => uiText.value.languageToggleTitle)
const themeToggleTitle = computed(() => uiText.value.themeToggleTitle)
const menuToggleTitle = computed(() => (isMenuExpanded.value ? uiText.value.menuCollapseTitle : uiText.value.menuExpandTitle))

const roleBadgeLabel = computed(() => {
    const role = props.roomRole
    if (!role) return ''
    return uiText.value.roleLabels[role] || role
})

const roleBadgeClass = computed(() => {
    if (props.roomRole === 'owner') return 'role-owner'
    if (props.roomRole === 'admin') return 'role-admin'
    if (props.roomRole === 'viewer') return 'role-viewer'
    return 'role-member'
})

const permissionTooltip = computed(() => {
    if (!props.canEditCanvas) return uiText.value.permissionReadOnly
    if (props.canManageSnapshots) return uiText.value.permissionManageSnapshots
    return uiText.value.permissionEditOnly
})

function toggleMenu() {
    isMenuExpanded.value = !isMenuExpanded.value
}

function toggleExportMenu() {
    isExportMenuOpen.value = !isExportMenuOpen.value
}

function exportAsPNG() {
    emit('export', { format: 'png' })
    isExportMenuOpen.value = false
}

function exportAsSVG() {
    emit('export', { format: 'svg' })
    isExportMenuOpen.value = false
}

function exportAsJSON() {
    emit('export', { format: 'json' })
    isExportMenuOpen.value = false
}

function triggerImport() {
    if (props.canEditCanvas) fileInputRef.value?.click()
}

function handleFileImport(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = loadEvent => {
        try {
            const content = loadEvent.target?.result
            if (typeof content === 'string') emit('import', JSON.parse(content))
        } catch (error) {
            console.error('Failed to parse import file:', error)
            alert(t('canvas.topBar.importError'))
        }
    }
    reader.readAsText(file)
    event.target.value = ''
}

function handleClickOutside(event) {
    if (isExportMenuOpen.value && !event.target.closest('.export-dropdown')) {
        isExportMenuOpen.value = false
    }
}

function toggleLanguage() {
    locale.value = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
    localStorage.setItem('locale', locale.value)
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme')
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', nextTheme)
    localStorage.setItem('theme', nextTheme)
    isDarkTheme.value = nextTheme === 'dark'
}

function openSettings() {
    isSettingsPanelOpen.value = true
    isMenuExpanded.value = false
}

onMounted(() => {
    isDarkTheme.value = (document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'light') === 'dark'
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.canvas-topbar{position:absolute;top:14px;left:14px;right:14px;height:58px;display:flex;align-items:center;justify-content:space-between;pointer-events:none;z-index:100;transition:all .3s ease}
.topbar-section{display:flex;align-items:center;gap:10px;pointer-events:auto}
.topbar-left{gap:12px}.topbar-right{user-select:none}
.circular-btn{position:relative;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--canvas-toolbar-bg);backdrop-filter:blur(20px);border:1px solid var(--border-color);color:var(--text-primary);transition:all .25s cubic-bezier(.4,0,.2,1);box-shadow:var(--shadow-sm)}
.circular-btn:hover{transform:translateY(-1px);box-shadow:var(--shadow-md);background:var(--bg-primary);border-color:var(--color-primary)}
.circular-btn:active{transform:translateY(0)}
.circular-btn.disabled,.circular-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.circular-btn.disabled:hover,.circular-btn:disabled:hover{background:var(--canvas-toolbar-bg);border-color:var(--border-color);box-shadow:var(--shadow-sm);transform:none}
.btn-icon{width:18px;height:18px;display:block}
.lang-icon{font-size:13px;font-weight:600;letter-spacing:0;line-height:1}
.language-btn:hover{background:var(--accent-primary);border-color:var(--accent-primary);color:#fff;transform:scale(1.05)}
.action-btn{width:40px;height:40px}
.room-info-card{display:flex;flex-direction:column;gap:3px;min-width:184px;max-width:min(312px,31vw);padding:7px 11px;background:var(--canvas-toolbar-bg);backdrop-filter:blur(20px);border:1px solid var(--border-color);border-radius:18px;box-shadow:var(--shadow-sm);transition:all .25s ease}
.room-info-card:hover{box-shadow:var(--shadow-md)}
.room-title-row{display:flex;align-items:center;gap:6px;min-width:0}
.room-title{margin:0;font-size:14px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.role-badge{flex-shrink:0;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.01em}
.permission-trigger{width:20px;height:20px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;padding:0;background:transparent;border:none;color:var(--text-tertiary);cursor:help}
.permission-trigger:hover{color:var(--color-primary)}.permission-icon{width:14px;height:14px;display:block}
.role-owner{background:rgba(245,158,11,.16);color:#b45309}.role-admin{background:rgba(59,130,246,.14);color:#1d4ed8}.role-member{background:rgba(16,185,129,.14);color:#047857}.role-viewer{background:rgba(107,114,128,.16);color:#4b5563}
html[data-theme='dark'] .role-owner{color:#fbbf24}html[data-theme='dark'] .role-admin{color:#93c5fd}html[data-theme='dark'] .role-member{color:#6ee7b7}html[data-theme='dark'] .role-viewer{color:#d1d5db}
.room-meta-row{display:flex;align-items:center}.sync-status{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text-secondary)}
.status-dot{width:6px;height:6px;border-radius:50%;background:#67c23a;transition:all .3s ease}.sync-status.syncing .status-dot{background:#409eff;animation:pulse-dot 1.5s ease-in-out infinite}
@keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.5}}
.badge{position:absolute;top:1px;right:1px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--color-primary);color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,.2);pointer-events:none}
.menu-group{position:relative;display:flex;align-items:center;gap:8px}.menu-buttons{display:flex;align-items:center;gap:8px}.menu-toggle{position:relative;z-index:2}
.menu-toggle.active .btn-icon{transform:rotate(45deg)}.menu-toggle .btn-icon{transition:transform .3s cubic-bezier(.4,0,.2,1)}
.slide-fade-enter-active,.slide-fade-leave-active{transition:all .35s cubic-bezier(.4,0,.2,1)}.slide-fade-enter-from{transform:translateX(16px);opacity:0}.slide-fade-leave-to{transform:translateX(16px);opacity:0}
.slide-fade-enter-active .menu-item{animation:slideIn .35s cubic-bezier(.4,0,.2,1) forwards}.slide-fade-enter-active .menu-item:nth-child(1){animation-delay:.03s}.slide-fade-enter-active .menu-item:nth-child(2){animation-delay:.06s}.slide-fade-enter-active .menu-item:nth-child(3){animation-delay:.09s}
@keyframes slideIn{from{transform:translateX(24px);opacity:0}to{transform:translateX(0);opacity:1}}
.export-dropdown{position:relative}.export-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:148px;background:var(--canvas-toolbar-bg);backdrop-filter:blur(20px);border:1px solid var(--border-color);border-radius:12px;padding:8px;box-shadow:var(--shadow-lg);z-index:1000}
.export-option{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;background:transparent;border:none;border-radius:8px;color:var(--text-primary);font-size:13px;cursor:pointer;transition:all .2s}.export-option:hover{background:var(--bg-tertiary)}
.export-divider{height:1px;background:var(--border-color);margin:4px 0}.option-icon{width:16px;height:16px;display:block;flex-shrink:0}.option-text{flex:1;text-align:left}
.fade-enter-active,.fade-leave-active{transition:opacity .2s ease}.fade-enter-from,.fade-leave-to{opacity:0}
@media (max-width:768px){.canvas-topbar{top:10px;left:10px;right:10px;height:52px}.topbar-section{gap:8px}.circular-btn,.action-btn{width:38px;height:38px}.btn-icon{width:17px;height:17px}.room-info-card{min-width:0;max-width:calc(100vw - 176px);padding:6px 10px;border-radius:16px}.room-title-row{gap:5px}.room-title{font-size:13px}.role-badge{padding:2px 6px}.sync-status{display:none}.menu-group,.menu-buttons{gap:6px}}
</style>

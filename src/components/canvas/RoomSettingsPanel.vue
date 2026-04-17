<template>
    <Teleport to="body">
        <Transition name="room-panel">
            <div v-if="modelValue" class="panel-overlay" @click.self="closePanel">
                <div class="panel-shell">
                    <div class="panel-header">
                        <div>
                            <h2 class="panel-title">{{ copy.title }}</h2>
                            <p class="panel-subtitle">{{ copy.subtitle }}</p>
                        </div>
                        <button class="close-btn" @click="closePanel">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.9" />
                            </svg>
                        </button>
                    </div>

                    <div class="panel-body">
                        <div v-if="loading" class="state-block">{{ copy.loading }}</div>
                        <div v-else-if="loadError" class="state-block error">{{ loadError }}</div>

                        <template v-else>
                            <section class="hero-card">
                                <div class="hero-icon">{{ generalDraft.icon || defaultIcon }}</div>
                                <div class="hero-copy">
                                    <strong>{{ generalDraft.name || copy.untitled }}</strong>
                                    <span>{{ generalDraft.description || copy.noDescription }}</span>
                                </div>
                                <span class="hero-chip" :class="{ private: securityDraft.is_private }">
                                    {{ securityDraft.is_private ? copy.privateRoom : copy.publicRoom }}
                                </span>
                            </section>

                            <section class="settings-section">
                                    <SectionHead
                                        :title="copy.generalTitle"
                                        :subtitle="copy.generalSubtitle"
                                        :chip="copy.generalTag"
                                    />

                                    <div class="field-stack">
                                        <label class="field">
                                            <span>{{ copy.roomName }}</span>
                                            <input
                                                v-model.trim="generalDraft.name"
                                                class="text-input"
                                                :disabled="!canManageRoom || savingGeneral"
                                            />
                                        </label>

                                        <label class="field">
                                            <span>{{ copy.roomIcon }}</span>
                                            <div class="icon-field">
                                                <div class="icon-preview" aria-hidden="true">{{ generalDraft.icon || defaultIcon }}</div>
                                                <div class="icon-copy-block">
                                                    <input
                                                        v-model.trim="generalDraft.icon"
                                                        class="text-input icon-input"
                                                        :placeholder="copy.roomIconPlaceholder"
                                                        maxlength="8"
                                                        :disabled="!canManageRoom || savingGeneral"
                                                    />
                                                    <small>{{ copy.roomIconHint }}</small>
                                                </div>
                                            </div>
                                        </label>

                                        <label class="field">
                                            <span>{{ copy.roomDescription }}</span>
                                            <textarea
                                                v-model.trim="generalDraft.description"
                                                class="text-area"
                                                :disabled="!canManageRoom || savingGeneral"
                                            />
                                            <small>{{ copy.descriptionHint }}</small>
                                        </label>
                                    </div>
                            </section>

                            <section class="settings-section">
                                    <SectionHead
                                        :title="copy.securityTitle"
                                        :subtitle="copy.securitySubtitle"
                                        :chip="copy.ownerTag"
                                        danger
                                    />

                                    <ToggleRow
                                        v-model="securityDraft.is_private"
                                        :disabled="!canManageSecurity || savingSecurity"
                                        :title="copy.privateRoom"
                                        :hint="copy.privateHint"
                                    />

                                    <label class="field">
                                        <span>{{ copy.defaultRole }}</span>
                                        <div class="chip-row">
                                            <button
                                                class="choice-chip"
                                                :class="{ active: securityDraft.defaultRole === 'editor' }"
                                                :disabled="!canManageSecurity || savingSecurity"
                                                @click="securityDraft.defaultRole = 'editor'"
                                            >
                                                {{ copy.editor }}
                                            </button>
                                            <button
                                                class="choice-chip"
                                                :class="{ active: securityDraft.defaultRole === 'viewer' }"
                                                :disabled="!canManageSecurity || savingSecurity"
                                                @click="securityDraft.defaultRole = 'viewer'"
                                            >
                                                {{ copy.viewer }}
                                            </button>
                                        </div>
                                        <small>{{ copy.defaultRoleHint }}</small>
                                    </label>
                            </section>
                        </template>
                    </div>

                    <div v-if="!loading && !loadError" class="panel-footer">
                        <button class="secondary-btn" @click="resetDrafts">{{ copy.reset }}</button>
                        <button class="primary-btn" :disabled="!canManageRoom || savingGeneral || !isGeneralDirty" @click="saveGeneral">
                            {{ savingGeneral ? copy.saving : copy.saveGeneral }}
                        </button>
                        <button class="danger-btn" :disabled="!canManageSecurity || savingSecurity || !isSecurityDirty" @click="openSecurityConfirm">
                            {{ savingSecurity ? copy.saving : copy.saveSecurity }}
                        </button>
                    </div>

                </div>
            </div>
        </Transition>
    </Teleport>

    <ConfirmDialog
        v-model="isSecurityConfirmOpen"
        :title="copy.securityConfirmTitle"
        :message="copy.securityConfirmMessage"
        :confirm-text="copy.confirm"
        type="danger"
        @confirm="saveSecurity"
    />
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
import { apiService } from '@/services/api'
import { useToast } from '@/utils/useToast'

const { locale } = useI18n()
const toast = useToast()

const props = defineProps<{
    modelValue: boolean
    roomId: string
    canManageRoom: boolean
    canManageSecurity: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'updated'): void
}>()

const ToggleRow = defineComponent({
    props: {
        modelValue: { type: Boolean, required: true },
        disabled: { type: Boolean, default: false },
        title: { type: String, required: true },
        hint: { type: String, required: true }
    },
    emits: ['update:modelValue'],
    setup(rowProps, { emit: rowEmit }) {
        return () => h('label', { class: 'toggle-row' }, [
            h('div', [h('strong', rowProps.title), h('p', rowProps.hint)]),
            h('input', {
                type: 'checkbox',
                checked: rowProps.modelValue,
                disabled: rowProps.disabled,
                onChange: (event: Event) => rowEmit('update:modelValue', (event.target as HTMLInputElement).checked)
            })
        ])
    }
})

const SectionHead = defineComponent({
    props: {
        title: { type: String, required: true },
        subtitle: { type: String, required: true },
        chip: { type: String, required: true },
        danger: { type: Boolean, default: false }
    },
    setup(headProps) {
        return () => h('div', { class: 'section-head' }, [
            h('div', [h('h3', headProps.title), h('p', headProps.subtitle)]),
            h('span', { class: ['cap-chip', { danger: headProps.danger }] }, headProps.chip)
        ])
    }
})

const loading = ref(false)
const loadError = ref('')
const savingGeneral = ref(false)
const savingSecurity = ref(false)
const isSecurityConfirmOpen = ref(false)

const defaultGeneral = {
    name: '',
    description: '',
    icon: '#'
}

const defaultSecurity = {
    is_private: false,
    defaultRole: 'editor'
}

const initialGeneral = reactive({ ...defaultGeneral })
const generalDraft = reactive({ ...defaultGeneral })
const initialSecurity = reactive({ ...defaultSecurity })
const securityDraft = reactive({ ...defaultSecurity })

const copy = computed(() => locale.value === 'zh-CN'
    ? {
        title: '房间设置',
        subtitle: '集中管理房间身份、可见性与协作规则，避免出现“可配但无效”的设置。',
        loading: '正在加载房间设置…',
        untitled: '未命名房间',
        noDescription: '暂无简介',
        publicRoom: '公开',
        privateRoom: '私密房间',
        generalTitle: '基础信息',
        generalSubtitle: '管理员与房主可修改房名、图标与简介。',
        securityTitle: '安全设置',
        securitySubtitle: '仅房主可修改可见性与默认加入身份。',
        generalTag: '普通设置',
        ownerTag: '房主设置',
        adminEditable: '管理员 / 房主',
        ownerOnly: '仅房主',
        readonly: '只读',
        roomName: '房间名称',
        roomDescription: '房间简介',
        descriptionHint: '用于说明房间用途、边界或协作约定。',
        privateHint: '开启后，非成员无法查看私密房间详情。',
        defaultRole: '默认加入角色',
        defaultRoleHint: '影响后续新成员加入房间后的默认权限。',
        editor: '编辑者',
        viewer: '查看者',
        reset: '重置',
        saveGeneral: '保存基础信息',
        saveSecurity: '保存安全设置',
        saving: '保存中…',
        saved: '房间设置已更新',
        saveFailed: '房间设置更新失败',
        securityConfirmTitle: '确认安全设置变更',
        securityConfirmMessage: '这些变更会影响房间可见性与后续成员权限，确定继续吗？',
        confirm: '确认',
        roomIcon: '房间图标',
        roomIconHint: '输入表情、字符或短标识，房间卡片、加入页和顶部信息会同步显示。',
        roomIconPlaceholder: '例如：#、★、🚀'
    }
    : {
        title: 'Room Settings',
        subtitle: 'Manage the room identity, visibility, and collaboration rules in one place.',
        loading: 'Loading room settings...',
        untitled: 'Untitled room',
        noDescription: 'No description',
        publicRoom: 'Public',
        privateRoom: 'Private room',
        generalTitle: 'General',
        generalSubtitle: 'Admins and owners can update the room name, icon, and description.',
        securityTitle: 'Security',
        securitySubtitle: 'Only the owner can change visibility and the default join role.',
        generalTag: 'General settings',
        ownerTag: 'Owner settings',
        adminEditable: 'Admin / Owner',
        ownerOnly: 'Owner only',
        readonly: 'Read only',
        roomName: 'Room name',
        roomDescription: 'Description',
        descriptionHint: 'Describe the room purpose, scope, or collaboration rules.',
        privateHint: 'When enabled, non-members cannot view private room details.',
        defaultRole: 'Default join role',
        defaultRoleHint: 'Applies to future new members when they join the room.',
        editor: 'Editor',
        viewer: 'Viewer',
        reset: 'Reset',
        saveGeneral: 'Save General',
        saveSecurity: 'Save Security',
        saving: 'Saving...',
        saved: 'Room settings updated',
        saveFailed: 'Failed to update room settings',
        securityConfirmTitle: 'Confirm Security Changes',
        securityConfirmMessage: 'These changes affect room visibility and future member permissions. Continue?',
        confirm: 'Confirm',
        roomIcon: 'Room icon',
        roomIconHint: 'Use an emoji, symbol, or short label. It will show in room cards, join screens, and the top info area.',
        roomIconPlaceholder: 'For example: #, ★, 🚀'
    })

const defaultIcon = '#'

const isGeneralDirty = computed(() => JSON.stringify(generalDraft) !== JSON.stringify(initialGeneral))
const isSecurityDirty = computed(() => JSON.stringify(securityDraft) !== JSON.stringify(initialSecurity))

function closePanel() {
    emit('update:modelValue', false)
}

function assign<T extends Record<string, any>>(target: T, source: T) {
    Object.assign(target, source)
}

function resetDrafts() {
    assign(generalDraft, initialGeneral)
    assign(securityDraft, initialSecurity)
}

function applyRoomPayload(payload: any) {
    const room = payload?.room || payload || {}
    const settings = room.settings || {}
    const permissions = settings.permissions || {}
    const appearance = settings.appearance || {}

    const nextGeneral = {
        name: room.name || '',
        description: room.description || '',
        icon: typeof appearance.icon === 'string' && appearance.icon.trim() ? appearance.icon.trim().slice(0, 8) : defaultIcon
    }

    const nextSecurity = {
        is_private: room.is_private === true,
        defaultRole: permissions.defaultRole === 'viewer' ? 'viewer' : 'editor'
    }

    assign(initialGeneral, nextGeneral)
    assign(generalDraft, nextGeneral)
    assign(initialSecurity, nextSecurity)
    assign(securityDraft, nextSecurity)
}

async function loadRoomSettings() {
    if (!props.modelValue) return
    loading.value = true
    loadError.value = ''

    try {
        const response = await apiService.getRoomById(props.roomId)
        if (!response.success) {
            loadError.value = response.message || copy.value.saveFailed
            return
        }
        applyRoomPayload(response.data)
    } catch (error: any) {
        loadError.value = error?.message || copy.value.saveFailed
    } finally {
        loading.value = false
    }
}

async function saveGeneral() {
    savingGeneral.value = true

    try {
        const response = await apiService.updateRoomSettings(props.roomId, {
            name: generalDraft.name,
            description: generalDraft.description,
            settings: {
                appearance: {
                    icon: generalDraft.icon || defaultIcon
                }
            }
        })

        if (!response.success) {
            toast.error(response.message || copy.value.saveFailed)
            return
        }

        applyRoomPayload(response.data)
        toast.success(copy.value.saved)
        emit('updated')
    } catch (error: any) {
        toast.error(error?.message || copy.value.saveFailed)
    } finally {
        savingGeneral.value = false
    }
}

function handleRoomSettingsUpdated(event: Event) {
    const customEvent = event as CustomEvent<{ roomId?: string }>
    if (customEvent.detail?.roomId !== props.roomId) return
    if (!props.modelValue) return
    if (savingGeneral.value || savingSecurity.value) return
    if (isGeneralDirty.value || isSecurityDirty.value) return

    void loadRoomSettings()
}

function openSecurityConfirm() {
    isSecurityConfirmOpen.value = true
}

async function saveSecurity() {
    savingSecurity.value = true

    try {
        const response = await apiService.updateRoomSettings(props.roomId, {
            is_private: securityDraft.is_private,
            settings: {
                permissions: {
                    defaultRole: securityDraft.defaultRole
                }
            }
        })

        if (!response.success) {
            toast.error(response.message || copy.value.saveFailed)
            return
        }

        applyRoomPayload(response.data)
        toast.success(copy.value.saved)
        emit('updated')
    } catch (error: any) {
        toast.error(error?.message || copy.value.saveFailed)
    } finally {
        savingSecurity.value = false
    }
}

watch(() => props.modelValue, (open) => {
    if (open) void loadRoomSettings()
})

onMounted(() => {
    window.addEventListener('room-settings-updated', handleRoomSettingsUpdated as EventListener)
})

onUnmounted(() => {
    window.removeEventListener('room-settings-updated', handleRoomSettingsUpdated as EventListener)
})
</script>

<style scoped>
.panel-overlay{position:fixed;inset:0;z-index:10800;background:rgba(15,23,42,.58);backdrop-filter:blur(10px);display:flex;justify-content:flex-end}
.panel-shell{position:relative;width:min(760px,calc(100vw - 24px));height:100%;background:linear-gradient(180deg,var(--bg-primary) 0%,color-mix(in srgb,var(--bg-primary) 96%,#eef2ff 4%) 100%);border-left:1px solid var(--border-color);border-radius:18px 0 0 18px;display:flex;flex-direction:column;box-shadow:-18px 0 40px rgba(15,23,42,.18)}
.panel-header{display:flex;justify-content:space-between;gap:12px;padding:20px 24px;border-bottom:1px solid var(--border-color);-webkit-app-region:drag}
.panel-title{margin:0;font-size:20px;color:var(--text-primary)}
.panel-subtitle{margin:6px 0 0;color:var(--text-secondary);font-size:13px;line-height:1.5}
.close-btn{width:32px;height:32px;border:none;border-radius:8px;background:transparent;color:var(--text-secondary);display:flex;align-items:center;justify-content:center;-webkit-app-region:no-drag;transition:all .2s ease}
.close-btn:hover{background:var(--bg-tertiary);color:var(--text-primary)}
.close-btn svg{width:16px;height:16px}
.panel-body{flex:1;overflow:auto;padding:clamp(18px,2.4vw,24px);display:grid;gap:18px}
.hero-card{display:flex;align-items:center;gap:16px;padding:18px;border:1px solid color-mix(in srgb,var(--accent-primary) 14%,var(--border-light));border-radius:20px;background:linear-gradient(135deg,color-mix(in srgb,var(--bg-secondary) 84%,transparent),color-mix(in srgb,var(--bg-primary) 94%,#eff6ff 6%));box-shadow:0 8px 24px rgba(15,23,42,.06)}
.hero-icon{width:54px;height:54px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(102,126,234,.18) 0%,rgba(16,185,129,.14) 100%);color:var(--accent-primary);font-size:24px;font-weight:900;flex-shrink:0}
.hero-copy{min-width:0;display:grid;gap:5px;flex:1}
.hero-copy strong{color:var(--text-primary);font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hero-copy span{color:var(--text-secondary);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hero-chip,.cap-chip{padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;height:max-content;white-space:nowrap}
.hero-chip{background:rgba(16,185,129,.14);color:#047857}
.hero-chip.private{background:rgba(245,158,11,.16);color:#b45309}
.settings-section{padding:18px;border:1px solid var(--border-light);border-radius:18px;background:var(--bg-secondary);display:grid;gap:16px;box-shadow:0 6px 20px rgba(15,23,42,.04)}
.section-head{display:flex;justify-content:space-between;gap:12px}
.section-head h3{margin:0;color:var(--text-primary);font-size:16px}
.section-head p{margin:6px 0 0;color:var(--text-secondary);font-size:13px;line-height:1.5}
.cap-chip{background:rgba(59,130,246,.22);color:#1d4ed8;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}
.cap-chip.danger{background:rgba(239,68,68,.22);color:#b91c1c}
.field{display:grid;gap:8px}
.field>span,.toggle-row strong{color:var(--text-primary);font-size:13px;font-weight:700}
.field small{color:var(--text-tertiary);font-size:12px;line-height:1.5}
.field-stack{display:grid;gap:14px}
.text-input,.text-area{width:100%;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);border-radius:12px;padding:11px 12px}
.icon-field{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;align-items:start}
.icon-preview{width:64px;height:54px;display:flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb,var(--accent-primary) 16%,var(--border-color));border-radius:16px;background:linear-gradient(135deg,rgba(102,126,234,.12) 0%,rgba(16,185,129,.08) 100%);color:var(--accent-primary);font-size:26px;font-weight:900;box-shadow:inset 0 1px 0 rgba(255,255,255,.45)}
.icon-copy-block{display:grid;gap:8px}
.icon-input{font-family:inherit;font-weight:700;letter-spacing:.02em}
.text-area{min-height:92px;resize:vertical}
.chip-row{display:flex;flex-wrap:wrap;gap:8px}
.choice-chip{padding:8px 12px;border:1px solid var(--border-color);border-radius:999px;background:var(--bg-primary);color:var(--text-primary);font-weight:700;font-size:12px;transition:all .2s ease}
.choice-chip.active{background:var(--accent-primary);border-color:var(--accent-primary);color:#fff}
.toggle-row{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:12px 0;border-top:1px solid var(--border-light)}
.toggle-row p{margin:6px 0 0;color:var(--text-secondary);font-size:12px;line-height:1.5;max-width:430px}
.toggle-row input{width:44px;height:24px;accent-color:var(--accent-primary);flex-shrink:0}
.panel-footer{display:flex;justify-content:flex-end;gap:10px;padding:14px 24px;border-top:1px solid var(--border-color);background:var(--bg-primary)}
.primary-btn,.danger-btn,.secondary-btn{border:none;border-radius:12px;padding:10px 14px;font-weight:800}
.primary-btn{background:var(--accent-primary);color:#fff}
.danger-btn{background:#b91c1c;color:#fff}
.secondary-btn{background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)}
.primary-btn:disabled,.danger-btn:disabled,.secondary-btn:disabled,.text-input:disabled,.text-area:disabled,.choice-chip:disabled{opacity:.55;cursor:not-allowed}
.state-block{padding:20px;border:1px dashed var(--border-color);border-radius:16px;text-align:center;color:var(--text-secondary)}
.state-block.error{color:#b91c1c}
.room-panel-enter-active,.room-panel-leave-active{transition:opacity .28s ease,background-color .28s ease,backdrop-filter .28s ease}
.room-panel-enter-from,.room-panel-leave-to{opacity:0;background:rgba(0,0,0,0);backdrop-filter:blur(0)}
.room-panel-enter-active .panel-shell{animation:room-panel-in .3s cubic-bezier(.4,0,.2,1) both}
.room-panel-leave-active .panel-shell{animation:room-panel-out .24s cubic-bezier(.4,0,1,1) both}
@keyframes room-panel-in{from{transform:translateX(100%)}to{transform:translateX(0)}}
@keyframes room-panel-out{from{transform:translateX(0)}to{transform:translateX(100%)}}
@media (max-width:768px){.panel-shell{width:100%}.section-head,.toggle-row{display:grid;grid-template-columns:1fr}.panel-footer{flex-direction:column}.primary-btn,.danger-btn,.secondary-btn{width:100%}.hero-card{align-items:flex-start}.hero-chip{align-self:flex-start}.icon-field{grid-template-columns:1fr}.icon-preview{width:100%;height:56px}}
</style>

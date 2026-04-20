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
                                <SectionHead :title="copy.generalTitle" :subtitle="copy.generalSubtitle" :chip="copy.generalTag" />

                                <div class="field-stack">
                                    <label class="field">
                                        <span>{{ copy.roomName }}</span>
                                        <input v-model.trim="generalDraft.name" class="text-input" :disabled="!canManageRoom || savingGeneral" />
                                    </label>

                                    <label class="field">
                                        <span>{{ copy.roomId }}</span>
                                        <div class="id-copy-row">
                                            <input :value="props.roomId" class="text-input" readonly />
                                            <button class="secondary-inline-btn" type="button" @click="copyRoomId">
                                                {{ copy.copyId }}
                                            </button>
                                        </div>
                                        <small>{{ copy.roomIdHint }}</small>
                                    </label>

                                    <label v-if="canManageSecurity" class="field">
                                        <span>{{ copy.inviteCode }}</span>
                                        <div class="chip-row">
                                            <button
                                                class="choice-chip"
                                                :class="{ active: inviteRole === 'editor' }"
                                                :disabled="creatingInviteCode"
                                                @click="inviteRole = 'editor'"
                                            >
                                                {{ copy.editor }}
                                            </button>
                                            <button
                                                class="choice-chip"
                                                :class="{ active: inviteRole === 'viewer' }"
                                                :disabled="creatingInviteCode"
                                                @click="inviteRole = 'viewer'"
                                            >
                                                {{ copy.viewer }}
                                            </button>
                                        </div>
                                        <div class="id-copy-row">
                                            <input :value="generatedInviteCode" class="text-input invite-code-input" :placeholder="copy.invitePlaceholder" readonly />
                                            <button class="secondary-inline-btn" type="button" :disabled="creatingInviteCode" @click="handleInviteCodeAction">
                                                {{ generatedInviteCode ? copy.copyCode : copy.generateCode }}
                                            </button>
                                        </div>
                                        <small>{{ inviteCodeHint }}</small>
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
                                                    maxlength="16"
                                                    :disabled="!canManageRoom || savingGeneral"
                                                />
                                                <small>{{ copy.roomIconHint }}</small>
                                            </div>
                                        </div>
                                    </label>

                                    <label class="field">
                                        <span>{{ copy.roomDescription }}</span>
                                        <textarea v-model.trim="generalDraft.description" class="text-area" :disabled="!canManageRoom || savingGeneral" />
                                        <small>{{ copy.descriptionHint }}</small>
                                    </label>
                                </div>
                            </section>

                            <section class="settings-section">
                                <SectionHead :title="copy.securityTitle" :subtitle="copy.securitySubtitle" :chip="copy.ownerTag" danger />

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

                                <ToggleRow
                                    v-model="securityDraft.showPrivateInList"
                                    :disabled="!canManageSecurity || savingSecurity || !securityDraft.is_private"
                                    :title="copy.showPrivateInList"
                                    :hint="copy.showPrivateInListHint"
                                />

                                <div v-if="showPasswordCard" class="password-card">
                                    <div class="password-head">
                                        <strong>{{ copy.passwordTitle }}</strong>
                                        <span>{{ passwordModeLabel }}</span>
                                    </div>

                                    <div v-if="canTogglePasswordEditor" class="password-toggle-row">
                                        <p>{{ passwordSummary }}</p>
                                        <button
                                            class="secondary-inline-btn"
                                            :disabled="!canManageSecurity || savingSecurity"
                                            @click="togglePasswordEditor"
                                        >
                                            {{ passwordEditorRequested ? copy.cancelPasswordChange : copy.changePassword }}
                                        </button>
                                    </div>

                                    <label v-if="showCurrentPasswordField" class="field">
                                        <span>{{ copy.currentPassword }}</span>
                                        <input
                                            v-model="passwordDraft.current_password"
                                            type="password"
                                            class="text-input"
                                            :placeholder="copy.currentPasswordPlaceholder"
                                            :disabled="!canManageSecurity || savingSecurity"
                                        />
                                    </label>

                                    <label v-if="showNewPasswordField" class="field">
                                        <span>{{ copy.newPassword }}</span>
                                        <input
                                            v-model="passwordDraft.new_password"
                                            type="password"
                                            class="text-input"
                                            :placeholder="copy.newPasswordPlaceholder"
                                            :disabled="!canManageSecurity || savingSecurity"
                                        />
                                    </label>

                                    <small>{{ passwordHint }}</small>
                                </div>
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
import { getErrorMessage } from '@/utils/errorHandler'
import { useToast } from '@/utils/useToast'

const { t } = useI18n()
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
            h('span', { class: ['switch-shell', { checked: rowProps.modelValue, disabled: rowProps.disabled }] }, [
                h('input', {
                    type: 'checkbox',
                    class: 'switch-input',
                    checked: rowProps.modelValue,
                    disabled: rowProps.disabled,
                    onChange: (event: Event) => rowEmit('update:modelValue', (event.target as HTMLInputElement).checked)
                }),
                h('span', { class: 'switch-track' }, [h('span', { class: 'switch-thumb' })])
            ])
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

const copy = computed(() => ({
    title: t('roomSettings.title'),
    subtitle: t('roomSettings.subtitle'),
    loading: t('roomSettings.loading'),
    untitled: t('roomSettings.untitled'),
    noDescription: t('roomSettings.noDescription'),
    publicRoom: t('roomSettings.publicRoom'),
    privateRoom: t('roomSettings.privateRoom'),
    generalTitle: t('roomSettings.generalTitle'),
    generalSubtitle: t('roomSettings.generalSubtitle'),
    securityTitle: t('roomSettings.securityTitle'),
    securitySubtitle: t('roomSettings.securitySubtitle'),
    generalTag: t('roomSettings.generalTag'),
    ownerTag: t('roomSettings.ownerTag'),
    roomName: t('roomSettings.roomName'),
    roomId: t('roomSettings.roomId'),
    copyId: t('roomSettings.copyId'),
    roomIdHint: t('roomSettings.roomIdHint'),
    inviteCode: t('roomSettings.inviteCode'),
    invitePlaceholder: t('roomSettings.invitePlaceholder'),
    generateCode: t('roomSettings.generateCode'),
    copyCode: t('roomSettings.copyCode'),
    inviteHintEmpty: t('roomSettings.inviteHintEmpty'),
    noExpiry: t('roomSettings.noExpiry'),
    roomIcon: t('roomSettings.roomIcon'),
    roomIconHint: t('roomSettings.roomIconHint'),
    roomIconPlaceholder: t('roomSettings.roomIconPlaceholder'),
    roomDescription: t('roomSettings.roomDescription'),
    descriptionHint: t('roomSettings.descriptionHint'),
    privateHint: t('roomSettings.privateHint'),
    defaultRole: t('roomSettings.defaultRole'),
    defaultRoleHint: t('roomSettings.defaultRoleHint'),
    showPrivateInList: t('roomSettings.showPrivateInList'),
    showPrivateInListHint: t('roomSettings.showPrivateInListHint'),
    editor: t('roomSettings.editor'),
    viewer: t('roomSettings.viewer'),
    passwordTitle: t('roomSettings.passwordTitle'),
    currentPassword: t('roomSettings.currentPassword'),
    currentPasswordPlaceholder: t('roomSettings.currentPasswordPlaceholder'),
    newPassword: t('roomSettings.newPassword'),
    newPasswordPlaceholder: t('roomSettings.newPasswordPlaceholder'),
    changePassword: t('roomSettings.changePassword'),
    cancelPasswordChange: t('roomSettings.cancelPasswordChange'),
    passwordTurnPrivate: t('roomSettings.passwordTurnPrivate'),
    passwordTurnPublic: t('roomSettings.passwordTurnPublic'),
    passwordRotate: t('roomSettings.passwordRotate'),
    passwordOptional: t('roomSettings.passwordOptional'),
    passwordHiddenSummary: t('roomSettings.passwordHiddenSummary'),
    reset: t('roomSettings.reset'),
    saveGeneral: t('roomSettings.saveGeneral'),
    saveSecurity: t('roomSettings.saveSecurity'),
    saving: t('roomSettings.saving'),
    saved: t('roomSettings.saved'),
    saveFailed: t('roomSettings.saveFailed'),
    securityConfirmTitle: t('roomSettings.securityConfirmTitle'),
    securityConfirmMessage: t('roomSettings.securityConfirmMessage'),
    confirm: t('roomSettings.confirm')
}))

const loading = ref(false)
const loadError = ref('')
const savingGeneral = ref(false)
const savingSecurity = ref(false)
const creatingInviteCode = ref(false)
const isSecurityConfirmOpen = ref(false)
const passwordEditorRequested = ref(false)
const generatedInviteCode = ref('')
const generatedInviteCodeExpiresAt = ref('')
const inviteRole = ref<'editor' | 'viewer'>('editor')

const defaultIcon = '#'

const defaultGeneral = {
    name: '',
    description: '',
    icon: defaultIcon
}

const defaultSecurity = {
    is_private: false,
    defaultRole: 'editor',
    showPrivateInList: false
}

const defaultPassword = {
    current_password: '',
    new_password: ''
}

const roomIconWeightLimit = 4
const emojiPattern = /\p{Extended_Pictographic}/u
const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u

const initialGeneral = reactive({ ...defaultGeneral })
const generalDraft = reactive({ ...defaultGeneral })
const initialSecurity = reactive({ ...defaultSecurity })
const securityDraft = reactive({ ...defaultSecurity })
const passwordDraft = reactive({ ...defaultPassword })

const privacyChanged = computed(() => securityDraft.is_private !== initialSecurity.is_private)
const passwordChanged = computed(() => Boolean(passwordDraft.current_password.trim() || passwordDraft.new_password.trim()))
const passwordActionRequested = computed(() => privacyChanged.value || passwordEditorRequested.value || passwordChanged.value)
const requiresCurrentPassword = computed(() => {
    if (privacyChanged.value && !securityDraft.is_private) return true
    if (!privacyChanged.value && passwordActionRequested.value && initialSecurity.is_private) return true
    return false
})
const needsNewPassword = computed(() => {
    if (privacyChanged.value && securityDraft.is_private) return true
    if (!privacyChanged.value && passwordActionRequested.value && initialSecurity.is_private) return true
    return false
})
const showPasswordCard = computed(() => securityDraft.is_private || initialSecurity.is_private || passwordActionRequested.value)
const canTogglePasswordEditor = computed(() => initialSecurity.is_private && !privacyChanged.value)
const showCurrentPasswordField = computed(() => requiresCurrentPassword.value && passwordActionRequested.value)
const showNewPasswordField = computed(() => needsNewPassword.value && passwordActionRequested.value)
const isGeneralDirty = computed(() => JSON.stringify(generalDraft) !== JSON.stringify(initialGeneral))
const isSecurityDirty = computed(() => JSON.stringify(securityDraft) !== JSON.stringify(initialSecurity) || passwordChanged.value)

const passwordModeLabel = computed(() => {
    if (privacyChanged.value) {
        return securityDraft.is_private ? copy.value.privateRoom : copy.value.publicRoom
    }
    return initialSecurity.is_private ? copy.value.privateRoom : copy.value.publicRoom
})

const passwordHint = computed(() => {
    if (privacyChanged.value && securityDraft.is_private) return copy.value.passwordTurnPrivate
    if (privacyChanged.value && !securityDraft.is_private) return copy.value.passwordTurnPublic
    if (passwordActionRequested.value && initialSecurity.is_private) return copy.value.passwordRotate
    return copy.value.passwordOptional
})

const passwordSummary = computed(() => {
    if (privacyChanged.value) return passwordHint.value
    if (passwordActionRequested.value && initialSecurity.is_private) return copy.value.passwordRotate
    return copy.value.passwordHiddenSummary
})

const inviteCodeHint = computed(() => {
    const roleLabel = inviteRole.value === 'viewer' ? copy.value.viewer : copy.value.editor
    const expiresAt = generatedInviteCodeExpiresAt.value
        ? new Date(generatedInviteCodeExpiresAt.value).toLocaleString()
        : copy.value.noExpiry

    if (!generatedInviteCode.value) {
        return copy.value.inviteHintEmpty
    }

    return t('roomSettings.inviteHintActive', {
        role: roleLabel,
        expiresAt
    })
})

function resolveApiError(source: any, fallback: string): string {
    return getErrorMessage(source?.errorCode, fallback)
}

function closePanel() {
    emit('update:modelValue', false)
}

function assign<T extends Record<string, any>>(target: T, source: T) {
    Object.assign(target, source)
}

function splitRoomIconGraphemes(value: string): string[] {
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
        const SegmenterCtor = (Intl as any).Segmenter
        const segmenter = new SegmenterCtor(undefined, { granularity: 'grapheme' })
        return Array.from(segmenter.segment(value), (segment: any) => segment.segment)
    }

    return Array.from(value)
}

function getRoomIconWeight(segment: string): number {
    if (emojiPattern.test(segment)) return 4
    if (cjkPattern.test(segment)) return 2
    return 1
}

function normalizeRoomIcon(input: string): string {
    const trimmed = input.trim()
    if (!trimmed) return ''

    const normalized: string[] = []
    let usedWeight = 0

    for (const segment of splitRoomIconGraphemes(trimmed)) {
        const segmentWeight = getRoomIconWeight(segment)
        if (usedWeight + segmentWeight > roomIconWeightLimit) {
            break
        }

        normalized.push(segment)
        usedWeight += segmentWeight
    }

    return normalized.join('')
}

function resetDrafts() {
    assign(generalDraft, initialGeneral)
    assign(securityDraft, initialSecurity)
    assign(passwordDraft, defaultPassword)
    passwordEditorRequested.value = false
    inviteRole.value = 'editor'
}

function applyRoomPayload(payload: any) {
    const room = payload?.room || payload || {}
    const settings = room.settings || {}
    const permissions = settings.permissions || {}
    const appearance = settings.appearance || {}

    const nextGeneral = {
        name: room.name || '',
        description: room.description || '',
        icon: typeof appearance.icon === 'string' && appearance.icon.trim() ? appearance.icon.trim().slice(0, 4) : defaultIcon
    }

    const nextSecurity = {
        // SQLite may return 1/0 for booleans; normalize to a strict boolean.
        is_private: Boolean(room.is_private),
        defaultRole: permissions.defaultRole === 'viewer' ? 'viewer' : 'editor',
        showPrivateInList: Boolean(permissions.showPrivateInList)
    }

    assign(initialGeneral, nextGeneral)
    assign(generalDraft, nextGeneral)
    assign(initialSecurity, nextSecurity)
    assign(securityDraft, nextSecurity)
    assign(passwordDraft, defaultPassword)
    passwordEditorRequested.value = false
}

function togglePasswordEditor() {
    passwordEditorRequested.value = !passwordEditorRequested.value
    if (!passwordEditorRequested.value) {
        assign(passwordDraft, defaultPassword)
    }
}

async function copyRoomId() {
    try {
        await navigator.clipboard.writeText(props.roomId)
        toast.success(t('roomSettings.messages.roomIdCopied'))
    } catch {
        toast.error(t('roomSettings.messages.roomIdCopyFailed'))
    }
}

async function createInviteCode() {
    creatingInviteCode.value = true

    try {
        const response = await apiService.createInviteCode(props.roomId, inviteRole.value)
        if (!response.success) {
            toast.error(resolveApiError(response, copy.value.saveFailed))
            return
        }

        generatedInviteCode.value = response.data?.invite_code || ''
        generatedInviteCodeExpiresAt.value = response.data?.expires_at || ''
        toast.success(t('roomSettings.messages.inviteCodeCreated'))
    } catch (error: any) {
        toast.error(resolveApiError(error, t('roomSettings.messages.inviteCodeCreateFailed')))
    } finally {
        creatingInviteCode.value = false
    }
}

async function copyInviteCode() {
    if (!generatedInviteCode.value) {
        await createInviteCode()
        return
    }

    try {
        await navigator.clipboard.writeText(generatedInviteCode.value)
        toast.success(t('roomSettings.messages.inviteCodeCopied'))
    } catch {
        toast.error(t('roomSettings.messages.inviteCodeCopyFailed'))
    }
}

async function handleInviteCodeAction() {
    if (generatedInviteCode.value) {
        await copyInviteCode()
        return
    }

    await createInviteCode()
}

watch(
    () => generalDraft.icon,
    (value) => {
        const normalized = normalizeRoomIcon(value || '')
        if (normalized !== (value || '')) {
            generalDraft.icon = normalized
        }
    },
    { immediate: true }
)

async function loadRoomSettings() {
    if (!props.modelValue) return
    loading.value = true
    loadError.value = ''

    try {
        const response = await apiService.getRoomById(props.roomId)
        if (!response.success) {
            loadError.value = resolveApiError(response, copy.value.saveFailed)
            return
        }

        applyRoomPayload(response.data)
        generatedInviteCode.value = ''
        generatedInviteCodeExpiresAt.value = ''
    } catch (error: any) {
        loadError.value = resolveApiError(error, copy.value.saveFailed)
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
                    icon: normalizeRoomIcon(generalDraft.icon || defaultIcon) || defaultIcon
                }
            }
        })

        if (!response.success) {
            toast.error(resolveApiError(response, copy.value.saveFailed))
            return
        }

        applyRoomPayload(response.data)
        toast.success(copy.value.saved)
        emit('updated')
    } catch (error: any) {
        toast.error(resolveApiError(error, copy.value.saveFailed))
    } finally {
        savingGeneral.value = false
    }
}

function validateSecurityDraft(): string | null {
    const currentPassword = passwordDraft.current_password.trim()
    const newPassword = passwordDraft.new_password.trim()

    if (!passwordActionRequested.value) {
        return null
    }

    if (privacyChanged.value && securityDraft.is_private && !newPassword) {
        return copy.value.passwordTurnPrivate
    }

    if ((privacyChanged.value && !securityDraft.is_private) || (!privacyChanged.value && passwordChanged.value && initialSecurity.is_private)) {
        if (requiresCurrentPassword.value && !currentPassword) {
            return copy.value.currentPasswordPlaceholder
        }
    }

    if ((securityDraft.is_private && !privacyChanged.value && passwordChanged.value) || (privacyChanged.value && securityDraft.is_private)) {
        if (!newPassword || newPassword.length < 6) {
            return copy.value.newPasswordPlaceholder
        }
    }

    return null
}

async function saveSecurity() {
    const validationError = validateSecurityDraft()
    if (validationError) {
        toast.error(validationError)
        return
    }

    savingSecurity.value = true

    try {
        if (privacyChanged.value || passwordChanged.value) {
            const passwordResponse = await apiService.updateRoomPassword(props.roomId, {
                current_password: passwordDraft.current_password.trim() || undefined,
                new_password: passwordDraft.new_password.trim() || undefined,
                is_private: securityDraft.is_private
            })

            if (!passwordResponse.success) {
                toast.error(resolveApiError(passwordResponse, copy.value.saveFailed))
                return
            }

            applyRoomPayload(passwordResponse.data)
        }

        const roleChanged = securityDraft.defaultRole !== initialSecurity.defaultRole
        const visibilityChanged = securityDraft.showPrivateInList !== initialSecurity.showPrivateInList
        if (roleChanged || visibilityChanged) {
            const settingsResponse = await apiService.updateRoomSettings(props.roomId, {
                settings: {
                    permissions: {
                        defaultRole: securityDraft.defaultRole,
                        showPrivateInList: securityDraft.showPrivateInList
                    }
                }
            })

            if (!settingsResponse.success) {
                toast.error(resolveApiError(settingsResponse, copy.value.saveFailed))
                return
            }

            applyRoomPayload(settingsResponse.data)
        }

        window.dispatchEvent(new CustomEvent('room-settings-updated', {
            detail: { roomId: props.roomId }
        }))
        toast.success(copy.value.saved)
        emit('updated')
    } catch (error: any) {
        toast.error(resolveApiError(error, copy.value.saveFailed))
    } finally {
        savingSecurity.value = false
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

watch(() => props.modelValue, open => {
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
.panel-shell{position:relative;width:min(760px,calc(100vw - 24px));height:100%;background:linear-gradient(180deg,var(--bg-primary) 0%,color-mix(in srgb,var(--bg-primary) 96%,#eef2ff 4%) 100%);border-left:1px solid var(--border-color);border-radius:18px 0 0 18px;display:flex;flex-direction:column;box-shadow:-18px 0 40px rgba(15,23,42,.18);font-size:14px;line-height:1.5}
.panel-header{display:flex;justify-content:space-between;gap:12px;padding:20px 24px;border-bottom:1px solid var(--border-color);-webkit-app-region:drag}
.panel-title{margin:0;font-size:20px;font-weight:700;color:var(--text-primary);line-height:1.3}
.panel-subtitle{margin:6px 0 0;color:var(--text-secondary);font-size:13px;line-height:1.5}
.close-btn{width:32px;height:32px;border:none;border-radius:8px;background:transparent;color:var(--text-secondary);display:flex;align-items:center;justify-content:center;-webkit-app-region:no-drag;transition:all .2s ease}
.close-btn:hover{background:var(--bg-tertiary);color:var(--text-primary)}
.close-btn svg{width:16px;height:16px}
.panel-body{flex:1;overflow:auto;padding:clamp(18px,2.4vw,24px);display:grid;gap:18px}
.hero-card{display:flex;align-items:center;gap:16px;padding:18px;border:1px solid color-mix(in srgb,var(--accent-primary) 14%,var(--border-light));border-radius:20px;background:linear-gradient(135deg,color-mix(in srgb,var(--bg-secondary) 84%,transparent),color-mix(in srgb,var(--bg-primary) 94%,#eff6ff 6%));box-shadow:0 8px 24px rgba(15,23,42,.06)}
.hero-icon{width:54px;height:54px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(102,126,234,.18) 0%,rgba(16,185,129,.14) 100%);color:var(--accent-primary);font-size:24px;font-weight:900;flex-shrink:0;overflow:hidden;word-break:break-all}
.hero-copy{min-width:0;display:grid;gap:5px;flex:1}
.hero-copy strong{color:var(--text-primary);font-size:16px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hero-copy span{color:var(--text-secondary);font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hero-chip,.cap-chip{padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;height:max-content;white-space:nowrap}
.hero-chip{background:rgba(16,185,129,.14);color:#047857}
.hero-chip.private{background:rgba(245,158,11,.16);color:#b45309}
.settings-section{padding:18px;border:1px solid var(--border-light);border-radius:18px;background:var(--bg-secondary);display:grid;gap:16px;box-shadow:0 6px 20px rgba(15,23,42,.04)}
.section-head{display:flex;justify-content:space-between;gap:12px}
.section-head h3{margin:0;color:var(--text-primary);font-size:16px;font-weight:700;line-height:1.35}
.section-head p{margin:6px 0 0;color:var(--text-secondary);font-size:13px;line-height:1.5}
.cap-chip{background:rgba(59,130,246,.22);color:#1d4ed8}
.cap-chip.danger{background:rgba(239,68,68,.22);color:#b91c1c}
.field{display:grid;gap:8px}
.field>span,.toggle-row strong{color:var(--text-primary);font-size:14px;font-weight:700;line-height:1.45}
.field small{color:var(--text-tertiary);font-size:12px;line-height:1.5}
.field-stack,.password-card{display:grid;gap:14px}
.id-copy-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px}
.text-input,.text-area{width:100%;border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);border-radius:12px;padding:11px 12px}
.invite-code-input{text-transform:uppercase;letter-spacing:.08em}
.icon-field{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;align-items:start}
.icon-preview{width:64px;height:54px;display:flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb,var(--accent-primary) 16%,var(--border-color));border-radius:16px;background:linear-gradient(135deg,rgba(102,126,234,.12) 0%,rgba(16,185,129,.08) 100%);color:var(--accent-primary);font-size:26px;font-weight:900;overflow:hidden;word-break:break-all}
.icon-copy-block{display:grid;gap:8px}
.icon-input{font-family:inherit;font-weight:700;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.text-area{min-height:92px;resize:vertical}
.chip-row{display:flex;flex-wrap:wrap;gap:8px}
.choice-chip{padding:8px 12px;border:1px solid var(--border-color);border-radius:999px;background:var(--bg-primary);color:var(--text-primary);font-weight:700;font-size:12px;transition:all .2s ease}
.choice-chip.active{background:var(--accent-primary);border-color:var(--accent-primary);color:#fff}
.toggle-row{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:12px 0;border-top:1px solid var(--border-light)}
.toggle-row p{margin:6px 0 0;color:var(--text-secondary);font-size:12px;line-height:1.5;max-width:430px}
.switch-shell{position:relative;display:inline-flex;align-items:center;justify-content:center;width:52px;height:32px;flex-shrink:0}
.switch-input{position:absolute;inset:0;opacity:0;cursor:pointer;margin:0}
.switch-track{position:relative;display:block;width:52px;height:32px;border-radius:999px;background:color-mix(in srgb,var(--border-color) 72%,var(--bg-primary));border:1px solid color-mix(in srgb,var(--border-color) 86%,transparent);box-shadow:inset 0 1px 2px rgba(15,23,42,.08);transition:background-color .2s ease,border-color .2s ease,box-shadow .2s ease}
.switch-thumb{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 6px 14px rgba(15,23,42,.18);transition:transform .22s cubic-bezier(.4,0,.2,1)}
.switch-shell.checked .switch-track{background:color-mix(in srgb,var(--accent-primary) 86%,#fff 14%);border-color:color-mix(in srgb,var(--accent-primary) 82%,transparent);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent-primary) 14%,transparent)}
.switch-shell.checked .switch-thumb{transform:translateX(20px)}
.switch-shell.disabled{opacity:.55}
.switch-shell.disabled .switch-input{cursor:not-allowed}
.password-card{padding:14px;border:1px solid var(--border-light);border-radius:16px;background:color-mix(in srgb,var(--bg-primary) 92%,#fff3cd 8%)}
.password-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.password-head strong{color:var(--text-primary);font-size:16px;font-weight:700;line-height:1.35}
.password-head span{padding:4px 8px;border-radius:999px;background:var(--bg-primary);color:var(--text-secondary);font-size:12px;font-weight:700}
.password-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.password-toggle-row p{margin:0;color:var(--text-secondary);font-size:13px;line-height:1.5}
.secondary-inline-btn{border:1px solid var(--border-color);background:var(--bg-primary);color:var(--text-primary);border-radius:10px;padding:8px 12px;font-weight:700;font-size:12px;white-space:nowrap}
.panel-footer{display:flex;justify-content:flex-end;gap:10px;padding:14px 24px;border-top:1px solid var(--border-color);background:var(--bg-primary)}
.primary-btn,.danger-btn,.secondary-btn{border:none;border-radius:12px;padding:10px 14px;font-weight:800}
.primary-btn{background:var(--accent-primary);color:#fff}
.danger-btn{background:#b91c1c;color:#fff}
.secondary-btn{background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)}
.primary-btn:disabled,.danger-btn:disabled,.secondary-btn:disabled,.text-input:disabled,.text-area:disabled,.choice-chip:disabled,.secondary-inline-btn:disabled{opacity:.55;cursor:not-allowed}
.state-block{padding:20px;border:1px dashed var(--border-color);border-radius:16px;text-align:center;color:var(--text-secondary);font-size:14px}
.state-block.error{color:#b91c1c}
.room-panel-enter-active,.room-panel-leave-active{transition:opacity .28s ease,background-color .28s ease,backdrop-filter .28s ease}
.room-panel-enter-from,.room-panel-leave-to{opacity:0;background:rgba(0,0,0,0);backdrop-filter:blur(0)}
.room-panel-enter-active .panel-shell{animation:room-panel-in .3s cubic-bezier(.4,0,.2,1) both}
.room-panel-leave-active .panel-shell{animation:room-panel-out .24s cubic-bezier(.4,0,1,1) both}
@keyframes room-panel-in{from{transform:translateX(100%)}to{transform:translateX(0)}}
@keyframes room-panel-out{from{transform:translateX(0)}to{transform:translateX(100%)}}
@media (max-width:768px){.panel-shell{width:100%}.section-head,.toggle-row,.password-head,.password-toggle-row,.id-copy-row{display:grid;grid-template-columns:1fr}.panel-footer{flex-direction:column}.primary-btn,.danger-btn,.secondary-btn{width:100%}.hero-card{align-items:flex-start}.hero-chip{align-self:flex-start}.icon-field{grid-template-columns:1fr}.icon-preview{width:100%;height:56px}}
</style>

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

async function loadActiveInviteCode() {
    if (!props.canManageSecurity) {
        generatedInviteCode.value = ''
        generatedInviteCodeExpiresAt.value = ''
        inviteRole.value = 'editor'
        return
    }

    try {
        const response = await apiService.getActiveInviteCode(props.roomId)
        if (!response.success) {
            generatedInviteCode.value = ''
            generatedInviteCodeExpiresAt.value = ''
            return
        }

        generatedInviteCode.value = response.data?.invite_code || ''
        generatedInviteCodeExpiresAt.value = response.data?.expires_at || ''
        inviteRole.value = response.data?.role === 'viewer' ? 'viewer' : 'editor'
    } catch {
        generatedInviteCode.value = ''
        generatedInviteCodeExpiresAt.value = ''
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
        await loadActiveInviteCode()
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

<style scoped src="./RoomSettingsPanel.css"></style>

<template>
    <Transition name="dialog-fade">
        <div v-if="modelValue" class="dialog-overlay" @click="handleOverlayClick">
            <div class="dialog-container" @click.stop>
                <div class="dialog-header">
                    <h3 class="dialog-title">{{ copy.title }}</h3>
                    <button class="close-btn" @click="handleClose">&times;</button>
                </div>

                <div class="dialog-body">
                    <p class="dialog-description">{{ copy.description }}</p>

                    <form @submit.prevent="handleSubmit">
                        <div class="form-group">
                            <label class="form-label">{{ copy.inviteCode }}</label>
                            <input
                                v-model.trim="inviteCode"
                                type="text"
                                class="form-input"
                                :class="{ error: inviteCodeError || submitError }"
                                :placeholder="copy.inviteCodePlaceholder"
                                :disabled="loading"
                                maxlength="24"
                                autofocus
                            />
                            <span v-if="inviteCodeError" class="error-text">{{ inviteCodeError }}</span>
                        </div>

                        <p v-if="submitError" class="error-text submit-error">{{ submitError }}</p>
                    </form>
                </div>

                <div class="dialog-footer">
                    <button class="btn btn-secondary" @click="handleClose" :disabled="loading">
                        {{ t('common.cancel') }}
                    </button>
                    <button class="btn btn-primary" @click="handleSubmit" :disabled="loading">
                        <span v-if="loading" class="loading-spinner"></span>
                        {{ loading ? copy.joining : copy.join }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiService } from '@/services/api'
import { getErrorMessage } from '@/utils/errorHandler'

const { t } = useI18n()

const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true
    }
})

const emit = defineEmits(['update:modelValue', 'joined'])

const copy = computed(() => ({
    title: t('inviteRoom.title'),
    description: t('inviteRoom.description'),
    inviteCode: t('inviteRoom.inviteCode'),
    inviteCodePlaceholder: t('inviteRoom.inviteCodePlaceholder'),
    join: t('inviteRoom.join'),
    joining: t('inviteRoom.joining'),
    inviteCodeRequired: t('inviteRoom.errors.inviteCodeRequired'),
    joinFailed: t('inviteRoom.errors.joinFailed'),
    invalidCode: t('inviteRoom.errors.invalidCode'),
    expiredCode: t('inviteRoom.errors.expiredCode'),
    usedCode: t('inviteRoom.errors.usedCode')
}))

const inviteCode = ref('')
const inviteCodeError = ref('')
const submitError = ref('')
const loading = ref(false)

function resetForm() {
    inviteCode.value = ''
    inviteCodeError.value = ''
    submitError.value = ''
}

function handleClose() {
    if (!loading.value) {
        emit('update:modelValue', false)
    }
}

function handleOverlayClick() {
    handleClose()
}

async function handleSubmit() {
    inviteCodeError.value = ''
    submitError.value = ''

    if (!inviteCode.value) {
        inviteCodeError.value = copy.value.inviteCodeRequired
        return
    }

    loading.value = true

    try {
        const response = await apiService.joinRoomByInviteCode(inviteCode.value.trim().toUpperCase())

        if (response.success) {
            const roomId = response.data?.room?.id || response.data?.member?.room_id
            emit('joined', { id: roomId })
            emit('update:modelValue', false)
            resetForm()
            return
        }

        if (response.errorCode === 'INVITE_CODE_INVALID' || response.message === 'Invite code is invalid') {
            submitError.value = copy.value.invalidCode
        } else if (response.errorCode === 'INVITE_CODE_EXPIRED' || response.message === 'Invite code has expired') {
            submitError.value = copy.value.expiredCode
        } else if (response.errorCode === 'INVITE_CODE_USED' || response.message === 'Invite code has already been used') {
            submitError.value = copy.value.usedCode
        } else {
            submitError.value = getErrorMessage(response.errorCode, copy.value.joinFailed)
        }
    } catch (error) {
        submitError.value = getErrorMessage(error?.errorCode, copy.value.joinFailed)
    } finally {
        loading.value = false
    }
}

watch(() => props.modelValue, open => {
    if (open) {
        resetForm()
    }
})
</script>

<style scoped>
.dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
}

.dialog-container {
    background: var(--bg-primary);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 450px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.dialog-header {
    padding: 24px 24px 16px;
    border-bottom: 1px solid var(--border-light);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.dialog-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.close-btn {
    width: 32px;
    height: 32px;
    border-radius: 16px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.close-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.dialog-body {
    padding: 24px;
}

.dialog-description {
    margin: 0 0 18px;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.6;
}

.form-group {
    margin-bottom: 20px;
}

.form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.form-input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 14px;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.form-input:focus {
    border-color: var(--accent-primary);
    outline: none;
}

.form-input.error {
    border-color: #e53935;
}

.error-text {
    display: block;
    color: #e53935;
    font-size: 12px;
    margin-top: 6px;
}

.submit-error {
    margin: 0;
}

.dialog-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--border-light);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.btn {
    padding: 10px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
    background: var(--bg-secondary);
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.loading-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
    transition: opacity 0.3s ease;
}

.dialog-fade-enter-active .dialog-container,
.dialog-fade-leave-active .dialog-container {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
    opacity: 0;
}

.dialog-fade-enter-from .dialog-container,
.dialog-fade-leave-to .dialog-container {
    transform: scale(0.95);
    opacity: 0;
}

@media (max-width: 768px) {
    .dialog-container {
        max-width: 100%;
        margin: 0;
        border-radius: 16px 16px 0 0;
        align-self: flex-end;
    }
}
</style>

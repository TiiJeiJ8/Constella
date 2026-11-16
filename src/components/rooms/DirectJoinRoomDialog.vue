<template>
    <Transition name="ct-room-dialog-fade">
        <div v-if="modelValue" class="ct-room-dialog-overlay" @click="handleOverlayClick">
            <div class="ct-room-dialog-panel ct-room-dialog-sheet" @click.stop>
                <div class="ct-room-dialog-header">
                    <h3 class="ct-room-dialog-title">{{ copy.title }}</h3>
                    <button class="ct-room-dialog-close" @click="handleClose">&times;</button>
                </div>

                <div class="ct-room-dialog-body">
                    <p class="dialog-description">{{ copy.description }}</p>

                    <form @submit.prevent="handleSubmit">
                        <div class="ct-room-form-group">
                            <label class="ct-room-form-label">{{ copy.inviteCode }}</label>
                            <input
                                v-model.trim="inviteCode"
                                type="text"
                                class="ct-room-form-input"
                                :class="{ error: inviteCodeError || submitError }"
                                :placeholder="copy.inviteCodePlaceholder"
                                :disabled="loading"
                                maxlength="24"
                                autofocus
                            />
                            <span v-if="inviteCodeError" class="ct-room-form-error">{{ inviteCodeError }}</span>
                        </div>

                        <p v-if="submitError" class="ct-room-form-error submit-error">{{ submitError }}</p>
                    </form>
                </div>

                <div class="ct-room-dialog-footer ct-room-dialog-footer-bordered">
                    <button class="ct-room-dialog-action ct-room-dialog-secondary" @click="handleClose" :disabled="loading">
                        {{ t('common.cancel') }}
                    </button>
                    <button class="ct-room-dialog-action ct-room-dialog-primary" @click="handleSubmit" :disabled="loading">
                        <span v-if="loading" class="ct-room-dialog-spinner"></span>
                        {{ loading ? copy.joining : copy.join }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import '@/styles/room-dialogs.css'
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
.ct-room-dialog-panel {
    --ct-room-dialog-width: 450px;
}

.ct-room-dialog-close {
    font-size: 20px;
    transition: all 0.2s ease;
}

.dialog-description {
    margin: 0 0 18px;
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.6;
}

.ct-room-form-input {
    padding: 12px 16px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.submit-error {
    margin: 0;
}
</style>

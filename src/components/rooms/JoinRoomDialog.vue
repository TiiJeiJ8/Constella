<template>
    <Transition name="dialog-fade">
        <div v-if="modelValue" class="dialog-overlay" @click="handleOverlayClick">
            <div class="dialog-container" @click.stop>
                <div class="dialog-header">
                    <h3 class="dialog-title">{{ dialogTitle }}</h3>
                    <button class="close-btn" @click="handleClose">&times;</button>
                </div>

                <div class="dialog-body">
                    <div v-if="room" class="room-info">
                        <div class="room-icon">{{ roomIcon }}</div>
                        <div class="room-details">
                            <h4 class="room-name">{{ room.name }}</h4>
                            <p class="room-meta">
                                <span>{{ room.creator }}</span>
                                <span class="separator">|</span>
                                <span>{{ memberCountLabel }}</span>
                            </p>
                            <p v-if="room.description" class="room-description">{{ room.description }}</p>
                            <p class="join-mode-hint">{{ joinModeHint }}</p>
                        </div>
                    </div>

                    <form @submit.prevent="handleSubmit">
                        <div class="form-group">
                            <label class="form-label">{{ t('joinRoom.password') }}</label>
                            <input
                                v-model="password"
                                type="password"
                                class="form-input"
                                :class="{ error: error }"
                                :placeholder="t('joinRoom.passwordPlaceholder')"
                                :disabled="loading"
                                autofocus
                            />
                            <span v-if="error" class="error-text">{{ error }}</span>
                        </div>
                    </form>
                </div>

                <div class="dialog-footer">
                    <button class="btn btn-secondary" :disabled="loading" @click="handleClose">
                        {{ t('common.cancel') }}
                    </button>
                    <button class="btn btn-primary" :disabled="loading || !password" @click="handleSubmit">
                        <span v-if="loading" class="loading-spinner"></span>
                        {{ loading ? t('joinRoom.joining') : submitLabel }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiService } from '@/services/api'
import { getErrorMessage } from '@/utils/errorHandler'

const { t } = useI18n()

const props = defineProps<{
    modelValue: boolean
    room: Record<string, any> | null
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'joined', payload: any): void
}>()

const password = ref('')
const error = ref('')
const loading = ref(false)

const roomIcon = computed(() => props.room?.settings?.appearance?.icon || '#')
const dialogTitle = computed(() => t('joinRoom.title'))
const submitLabel = computed(() => t('joinRoom.join'))
const joinModeHint = computed(() => t('joinRoom.directHint'))
const memberCountLabel = computed(() =>
    t(props.room?.memberCount === 1 ? 'rooms.memberCount.one' : 'rooms.memberCount.other', { count: props.room?.memberCount ?? 0 })
)

async function handleSubmit() {
    if (!password.value) {
        error.value = t('joinRoom.errors.passwordRequired')
        return
    }

    if (!props.room) {
        error.value = t('joinRoom.errors.roomNotFound')
        return
    }

    loading.value = true
    error.value = ''

    try {
        const response = await apiService.joinRoom(props.room.id, password.value)
        if (!response.success) {
            if (response.errorCode === 'ROOM_INVALID_PASSWORD') {
                error.value = t('joinRoom.errors.wrongPassword')
            } else if (response.errorCode === 'ROOM_ALREADY_JOINED') {
                emit('joined', { room: props.room, status: 'joined' })
                handleClose()
                resetForm()
            } else {
                error.value = getErrorMessage(response.errorCode, t('joinRoom.errors.joinFailed'))
            }
            return
        }

        emit('joined', { room: props.room, status: 'joined', data: response.data })
        handleClose()
        resetForm()
    } catch (err: any) {
        error.value = getErrorMessage(err?.errorCode, t('joinRoom.errors.joinFailed'))
    } finally {
        loading.value = false
    }
}

function handleClose() {
    emit('update:modelValue', false)
}

function handleOverlayClick() {
    if (!loading.value) {
        handleClose()
    }
}

function resetForm() {
    password.value = ''
    error.value = ''
}

watch(() => props.modelValue, (open) => {
    if (open) {
        resetForm()
    }
})
</script>

<style scoped>
.dialog-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.dialog-container{background:var(--bg-primary);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:100%;max-width:460px;display:flex;flex-direction:column;overflow:hidden}
.dialog-header{padding:24px 24px 16px;border-bottom:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between}
.dialog-title{font-size:20px;font-weight:600;color:var(--text-primary);margin:0}
.close-btn{width:32px;height:32px;border-radius:16px;background:transparent;color:var(--text-secondary);font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer}
.close-btn:hover{background:var(--bg-tertiary);color:var(--text-primary)}
.dialog-body{padding:24px}
.room-info{display:flex;gap:16px;margin-bottom:24px;padding:16px;background:var(--bg-secondary);border-radius:12px}
.room-icon{width:56px;height:56px;border-radius:12px;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;font-size:32px;flex-shrink:0}
.room-details{flex:1;min-width:0}
.room-name{font-size:16px;font-weight:600;color:var(--text-primary);margin:0 0 6px}
.room-meta{display:flex;gap:8px;align-items:center;margin:0 0 8px;color:var(--text-secondary);font-size:13px}
.separator{opacity:.45}
.room-description,.join-mode-hint{margin:0;color:var(--text-secondary);font-size:13px;line-height:1.5}
.join-mode-hint{margin-top:8px}
.form-group{display:grid;gap:8px}
.form-label{font-size:13px;font-weight:600;color:var(--text-primary)}
.form-input{width:100%;padding:12px 14px;border:1px solid var(--border-color);border-radius:12px;background:var(--bg-primary);color:var(--text-primary)}
.form-input.error{border-color:#dc2626}
.error-text{color:#dc2626;font-size:12px}
.dialog-footer{padding:16px 24px 24px;display:flex;justify-content:flex-end;gap:12px}
.btn{border:none;border-radius:12px;padding:10px 16px;font-weight:700;cursor:pointer}
.btn-secondary{background:var(--bg-secondary);color:var(--text-primary);border:1px solid var(--border-color)}
.btn-primary{background:var(--accent-primary);color:#fff}
.loading-spinner{display:inline-block;width:14px;height:14px;margin-right:6px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>

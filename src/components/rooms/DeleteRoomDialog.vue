<template>
    <Teleport to="body">
        <Transition name="dialog-fade">
            <div v-if="modelValue" class="dialog-overlay" @click.self="closeDialog">
                <div class="dialog-container">
                    <div class="dialog-header">
                        <h2 class="dialog-title">{{ t('rooms.delete.title') }}</h2>
                        <button class="close-btn" @click="closeDialog">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
                            </svg>
                        </button>
                    </div>

                    <div class="dialog-content">
                        <div class="warning-banner">
                            <svg class="warning-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 4.5 21 19H3L12 4.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.9" />
                                <path d="M12 10v4M12 17h.01" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2.1" />
                            </svg>
                            <div class="warning-text">
                                <p class="warning-title">{{ t('rooms.delete.warning') }}</p>
                                <p class="warning-desc">{{ t('rooms.delete.warningDesc') }}</p>
                            </div>
                        </div>

                        <div class="room-info-box">
                            <div class="info-row">
                                <span class="label">{{ t('rooms.delete.roomName') }}:</span>
                                <span class="value">{{ room?.name }}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">{{ t('rooms.delete.memberCount') }}:</span>
                                <span class="value">{{ room?.memberCount }} {{ t('rooms.members') }}</span>
                            </div>
                            <div v-if="room?.isPrivate" class="info-row">
                                <span class="label">{{ t('rooms.delete.privacy') }}:</span>
                                <span class="value private">
                                    <svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true">
                                        <rect x="6.5" y="10.5" width="11" height="8.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" />
                                        <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
                                    </svg>
                                    {{ t('rooms.private') }}
                                </span>
                            </div>
                        </div>

                        <div v-if="room?.isPrivate" class="password-section">
                            <label class="password-label">
                                {{ t('rooms.delete.passwordRequired') }}
                            </label>
                            <div class="input-wrapper">
                                <input
                                    v-model="password"
                                    :type="showPassword ? 'text' : 'password'"
                                    class="password-input"
                                    :placeholder="t('rooms.delete.enterPassword')"
                                    @keyup.enter="handleConfirm"
                                />
                                <button
                                    class="toggle-password"
                                    type="button"
                                    @click="showPassword = !showPassword"
                                >
                                    <svg v-if="showPassword" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M3.75 12s3-5.5 8.25-5.5S20.25 12 20.25 12s-3 5.5-8.25 5.5S3.75 12 3.75 12Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8" />
                                        <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8" />
                                    </svg>
                                    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M4 4l16 16M10.55 6.78A8.92 8.92 0 0 1 12 6.65c5.25 0 8.25 5.35 8.25 5.35a16.83 16.83 0 0 1-2.17 2.78M8.7 8.04C5.56 9.43 3.75 12 3.75 12s3 5.35 8.25 5.35c1.28 0 2.42-.32 3.42-.8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div v-if="error" class="error-message">
                            {{ error }}
                        </div>
                    </div>

                    <div class="dialog-footer">
                        <button
                            class="btn btn-cancel"
                            :disabled="loading"
                            @click="closeDialog"
                        >
                            {{ t('common.cancel') }}
                        </button>
                        <button
                            class="btn btn-danger"
                            :disabled="loading || (room?.isPrivate && !password)"
                            @click="handleConfirm"
                        >
                            <span v-if="loading" class="loading-spinner"></span>
                            {{ loading ? t('rooms.delete.deleting') : t('rooms.delete.confirm') }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    room: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

watch(() => props.modelValue, newVal => {
    if (newVal) {
        password.value = ''
        showPassword.value = false
        error.value = ''
        loading.value = false
    }
})

function closeDialog() {
    if (!loading.value) {
        emit('update:modelValue', false)
    }
}

function handleConfirm() {
    if (loading.value) return

    if (props.room?.isPrivate && !password.value) {
        error.value = t('rooms.delete.passwordEmpty')
        return
    }

    error.value = ''
    loading.value = true

    emit('confirm', {
        roomId: props.room?.id,
        password: props.room?.isPrivate ? password.value : undefined,
        callback: (success, errorMsg) => {
            loading.value = false
            if (success) {
                closeDialog()
            } else {
                error.value = errorMsg || t('rooms.delete.failed')
            }
        }
    })
}
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
    z-index: 10000;
    padding: 20px;
}

.dialog-container {
    background: var(--bg-primary);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 480px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.dialog-header {
    padding: 24px 24px 20px;
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
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-btn svg {
    width: 15px;
    height: 15px;
    display: block;
}

.close-btn:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

.dialog-content {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
}

.warning-banner {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: rgba(255, 152, 0, 0.1);
    border: 1px solid rgba(255, 152, 0, 0.3);
    border-radius: 12px;
    margin-bottom: 20px;
}

html[data-theme='dark'] .warning-banner {
    background: rgba(255, 152, 0, 0.15);
    border-color: rgba(255, 152, 0, 0.4);
}

.warning-icon {
    width: 24px;
    height: 24px;
    color: #ff9800;
    flex-shrink: 0;
}

.warning-text {
    flex: 1;
}

.warning-title {
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px 0;
    font-size: 14px;
}

.warning-desc {
    color: var(--text-secondary);
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
}

.room-info-box {
    background: var(--bg-secondary);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 20px;
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
}

.info-row:not(:last-child) {
    border-bottom: 1px solid var(--border-light);
}

.label {
    color: var(--text-secondary);
    font-size: 14px;
}

.value {
    color: var(--text-primary);
    font-weight: 500;
    font-size: 14px;
}

.value.private {
    color: #ff9800;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.inline-icon {
    width: 15px;
    height: 15px;
    display: block;
}

.password-section {
    margin-bottom: 20px;
}

.password-label {
    display: block;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.password-input {
    flex: 1;
    padding: 12px 40px 12px 12px;
    border: 1px solid var(--border-light);
    border-radius: 8px;
    font-size: 14px;
    background: var(--bg-primary);
    color: var(--text-primary);
    transition: all 0.2s;
}

.password-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(103, 128, 232, 0.1);
}

.toggle-password {
    position: absolute;
    right: 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.2s;
    color: var(--text-secondary);
}

.toggle-password svg {
    width: 16px;
    height: 16px;
    display: block;
}

.toggle-password:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

.error-message {
    padding: 12px;
    background: rgba(244, 67, 54, 0.1);
    border: 1px solid rgba(244, 67, 54, 0.3);
    border-radius: 8px;
    color: #f44336;
    font-size: 13px;
}

.dialog-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--border-light);
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-cancel {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

.btn-cancel:hover:not(:disabled) {
    background: var(--bg-tertiary);
}

.btn-danger {
    background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
    color: white;
}

.btn-danger:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

.loading-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
    transition: opacity 0.3s ease;
}

.dialog-fade-enter-active .dialog-container,
.dialog-fade-leave-active .dialog-container {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
    opacity: 0;
}

.dialog-fade-enter-from .dialog-container,
.dialog-fade-leave-to .dialog-container {
    transform: scale(0.9) translateY(20px);
}
</style>

<template>
    <Transition name="ct-room-dialog-fade">
        <div v-if="modelValue" class="ct-room-dialog-overlay" @click="handleOverlayClick">
            <div class="ct-room-dialog-panel ct-room-dialog-sheet" @click.stop>
                <div class="ct-room-dialog-header">
                    <h3 class="ct-room-dialog-title">{{ t('createRoom.title') }}</h3>
                    <button class="ct-room-dialog-close" @click="handleClose">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
                        </svg>
                    </button>
                </div>

                <div class="ct-room-dialog-body">
                    <form @submit.prevent="handleSubmit">
                        <div class="ct-room-form-group">
                            <label class="ct-room-form-label">{{ t('createRoom.name') }}</label>
                            <input
                                v-model="formData.name"
                                type="text"
                                class="ct-room-form-input"
                                :class="{ error: errors.name }"
                                :placeholder="t('createRoom.namePlaceholder')"
                                maxlength="100"
                            />
                            <span v-if="errors.name" class="ct-room-form-error">{{ errors.name }}</span>
                        </div>

                        <div class="ct-room-form-group">
                            <label class="ct-room-form-label">{{ t('createRoom.description') }}</label>
                            <textarea
                                v-model="formData.description"
                                class="ct-room-form-textarea"
                                :placeholder="t('createRoom.descriptionPlaceholder')"
                                rows="3"
                                maxlength="500"
                            ></textarea>
                            <span class="char-count">{{ formData.description?.length || 0 }}/500</span>
                        </div>

                        <div class="ct-room-form-group">
                            <label class="ct-room-form-label">{{ t('createRoom.icon') }}</label>
                            <div class="icon-selector">
                                <button
                                    v-for="icon in iconOptions"
                                    :key="icon"
                                    type="button"
                                    class="icon-option"
                                    :class="{ active: formData.icon === icon }"
                                    @click="formData.icon = icon"
                                >
                                    {{ icon }}
                                </button>
                            </div>
                        </div>

                        <div class="ct-room-form-group">
                            <div class="checkbox-group">
                                <label class="checkbox-label">
                                    <input
                                        v-model="formData.isPrivate"
                                        type="checkbox"
                                        class="checkbox-input"
                                    />
                                    <span class="checkbox-text">
                                        <svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true">
                                            <rect x="6.5" y="10.5" width="11" height="8.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.8" />
                                            <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
                                        </svg>
                                        {{ t('createRoom.private') }}
                                    </span>
                                </label>
                            </div>
                            <p class="form-hint">{{ t('createRoom.privateHint') }}</p>
                        </div>

                        <div class="ct-room-form-group">
                            <label class="ct-room-form-label">{{ t('createRoom.defaultRole') }}</label>
                            <select v-model="formData.defaultRole" class="ct-room-form-input">
                                <option value="editor">{{ t('createRoom.defaultRoleOptions.editor') }}</option>
                                <option value="viewer">{{ t('createRoom.defaultRoleOptions.viewer') }}</option>
                            </select>
                            <p class="form-hint">
                                {{ t('createRoom.defaultRoleHint') }}
                            </p>
                        </div>

                        <Transition name="slide-fade">
                            <div v-if="formData.isPrivate" class="ct-room-form-group">
                                <label class="ct-room-form-label">{{ t('createRoom.password') }}</label>
                                <input
                                    v-model="formData.password"
                                    type="password"
                                    class="ct-room-form-input"
                                    :class="{ error: errors.password }"
                                    :placeholder="t('createRoom.passwordPlaceholder')"
                                    maxlength="50"
                                />
                                <span v-if="errors.password" class="ct-room-form-error">{{ errors.password }}</span>
                            </div>
                        </Transition>
                    </form>
                </div>

                <div class="ct-room-dialog-footer ct-room-dialog-footer-bordered">
                    <button class="ct-room-dialog-action ct-room-dialog-secondary" :disabled="loading" @click="handleClose">
                        {{ t('common.cancel') }}
                    </button>
                    <button class="ct-room-dialog-action ct-room-dialog-primary" :disabled="loading" @click="handleSubmit">
                        <span v-if="loading" class="ct-room-dialog-spinner"></span>
                        {{ loading ? t('createRoom.creating') : t('createRoom.create') }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import '@/styles/room-dialogs.css'
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiService } from '@/services/api'
import { getErrorMessage } from '@/utils/errorHandler'

const { t } = useI18n()

defineProps({
    modelValue: {
        type: Boolean,
        required: true
    }
})

const emit = defineEmits(['update:modelValue', 'created'])

const iconOptions = ['💡', '🎯', '📊', '🚀', '📝', '⭐', '🔥', '🧩', '🧠', '🗺️', '⚗️', '🔭']

const formData = reactive({
    name: '',
    description: '',
    icon: '💡',
    isPrivate: false,
    password: '',
    defaultRole: 'editor'
})

const errors = reactive({
    name: '',
    password: ''
})

const loading = ref(false)

//TODO 可以考虑引入更全面的密码强度验证库,后端相关验证在room.service.ts中validateRoomPasswordStrength方法
function validatePasswordStrength(password) {
    const trimmed = password.trim()

    if (trimmed.length < 6) {
        return t('createRoom.errors.passwordTooShort')
    }
    // if (!/[a-z]/.test(value)) {
    //     return t('createRoom.errors.passwordMissingLowercase')
    // }
    // if (!/[A-Z]/.test(value)) {
    //     return t('createRoom.errors.passwordMissingUppercase')
    // }
    // if (!/[0-9]/.test(value)) {
    //     return t('createRoom.errors.passwordMissingNumber')
    // }
    // if (!/[^A-Za-z0-9]/.test(value)) {
    //     return t('createRoom.errors.passwordMissingSpecialChar')
    // }

    return ''
}

function validateForm() {
    errors.name = ''
    errors.password = ''

    if (!formData.name.trim()) {
        errors.name = t('createRoom.errors.nameRequired')
        return false
    }

    if (formData.name.trim().length < 2) {
        errors.name = t('createRoom.errors.nameTooShort')
        return false
    }

    if (formData.isPrivate) {
        if (!formData.password.trim()) {
            errors.password = t('createRoom.errors.passwordRequired')
            return false
        }

        const passwordError = validatePasswordStrength(formData.password)
        if (passwordError) {
            errors.password = passwordError
            return false
        }
    }

    return true
}

async function handleSubmit() {
    if (!validateForm()) return

    loading.value = true

    try {
        const settings = {
            permissions: {
                defaultRole: formData.defaultRole
            },
            appearance: {
                icon: formData.icon
            }
        }

        const response = await apiService.createRoom({
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            is_private: formData.isPrivate,
            password: formData.password || undefined,
            settings
        })

        if (response.success) {
            emit('created', response.data.room)
            handleClose()
            resetForm()
        } else if (response.errorCode === 'UNAUTHORIZED' || response.message?.includes('token')) {
            errors.name = t('common.errors.tokenExpired')
        } else {
            errors.name = getErrorMessage(response.errorCode, t('createRoom.errors.createFailed'))
        }
    } catch (error) {
        errors.name = getErrorMessage(error?.errorCode, t('createRoom.errors.createFailed'))
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
    formData.name = ''
    formData.description = ''
    formData.icon = '💡'
    formData.isPrivate = false
    formData.password = ''
    formData.defaultRole = 'editor'
    errors.name = ''
    errors.password = ''
}

watch(() => formData.isPrivate, isPrivate => {
    if (!isPrivate) {
        formData.password = ''
        errors.password = ''
    }
})
</script>

<style scoped>
.ct-room-dialog-panel {
    --ct-room-dialog-width: 500px;
    max-height: 90vh;
    transition: background-color 0.3s ease;
}

.ct-room-dialog-close {
    border: none;
    transition: all 0.2s ease;
}

.ct-room-dialog-body {
    overflow-y: auto;
    flex: 1;
}

.ct-room-form-group:last-child {
    margin-bottom: 0;
}

.ct-room-form-input,
.ct-room-form-textarea {
    padding: 10px 14px;
}

.ct-room-form-textarea {
    resize: vertical;
    min-height: 80px;
}

.char-count {
    display: block;
    text-align: right;
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 4px;
}

.form-hint {
    font-size: 12px;
    color: var(--text-tertiary);
    margin: 6px 0 0;
}

.icon-selector {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
}

.icon-option {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--bg-tertiary);
    border: 2px solid transparent;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.icon-option:hover {
    background: var(--bg-secondary);
    transform: scale(1.05);
}

.icon-option.active {
    border-color: var(--accent-primary);
    background: rgba(66, 153, 225, 0.1);
}

.checkbox-group {
    margin-bottom: 8px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
}

.checkbox-input {
    width: 18px;
    height: 18px;
    margin-right: 10px;
    cursor: pointer;
    accent-color: var(--accent-primary);
}

.checkbox-text {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.inline-icon {
    width: 15px;
    height: 15px;
    display: block;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
    transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

@media (max-width: 768px) {
    .ct-room-dialog-panel {
        max-height: 85vh;
    }

    .icon-selector {
        grid-template-columns: repeat(4, 1fr);
    }
}
</style>

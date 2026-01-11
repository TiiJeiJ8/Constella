<template>
    <Teleport to="body">
        <Transition name="dialog-fade">
            <div v-if="modelValue" class="dialog-overlay" @click.self="closeDialog">
                <div class="dialog-container">
                    <div class="dialog-header">
                        <h2 class="dialog-title">{{ t('rooms.delete.title') }}</h2>
                        <button class="close-btn" @click="closeDialog">✕</button>
                    </div>

                    <div class="dialog-content">
                        <!-- 警告信息 -->
                        <div class="warning-banner">
                            <span class="warning-icon">⚠️</span>
                            <div class="warning-text">
                                <p class="warning-title">{{ t('rooms.delete.warning') }}</p>
                                <p class="warning-desc">{{ t('rooms.delete.warningDesc') }}</p>
                            </div>
                        </div>

                        <!-- 房间信息 -->
                        <div class="room-info-box">
                            <div class="info-row">
                                <span class="label">{{ t('rooms.delete.roomName') }}:</span>
                                <span class="value">{{ room?.name }}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">{{ t('rooms.delete.memberCount') }}:</span>
                                <span class="value">{{ room?.memberCount }} {{ t('rooms.members') }}</span>
                            </div>
                            <div class="info-row" v-if="room?.isPrivate">
                                <span class="label">{{ t('rooms.delete.privacy') }}:</span>
                                <span class="value private">🔒 {{ t('rooms.private') }}</span>
                            </div>
                        </div>

                        <!-- 私密房间需要密码验证 -->
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
                                    @click="showPassword = !showPassword"
                                    type="button"
                                >
                                    {{ showPassword ? '👁️' : '👁️‍🗨️' }}
                                </button>
                            </div>
                        </div>

                        <!-- 错误提示 -->
                        <div v-if="error" class="error-message">
                            {{ error }}
                        </div>
                    </div>

                    <div class="dialog-footer">
                        <button 
                            class="btn btn-cancel" 
                            @click="closeDialog"
                            :disabled="loading"
                        >
                            {{ t('common.cancel') }}
                        </button>
                        <button 
                            class="btn btn-danger" 
                            @click="handleConfirm"
                            :disabled="loading || (room?.isPrivate && !password)"
                        >
                            <span v-if="loading" class="loading-spinner">⏳</span>
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

// 监听对话框打开/关闭，重置状态
watch(() => props.modelValue, (newVal) => {
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
    
    // 私密房间需要密码
    if (props.room?.isPrivate && !password.value) {
        error.value = t('rooms.delete.passwordEmpty')
        return
    }

    error.value = ''
    loading.value = true
    
    // 发出确认事件
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
    font-size: 20px;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
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
    font-size: 24px;
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
    font-size: 16px;
    border-radius: 4px;
    transition: background 0.2s;
}

.toggle-password:hover {
    background: var(--bg-secondary);
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
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

/* 对话框动画 */
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

.dialog-fade-enter-from .dialog-container {
    transform: scale(0.9) translateY(20px);
}

.dialog-fade-leave-to .dialog-container {
    transform: scale(0.9) translateY(20px);
}
</style>

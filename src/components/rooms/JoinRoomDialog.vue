<template>
    <Transition name="dialog-fade">
        <div v-if="modelValue" class="dialog-overlay" @click="handleOverlayClick">
            <div class="dialog-container" @click.stop>
                <!-- 对话框头部 -->
                <div class="dialog-header">
                    <h3 class="dialog-title">{{ t('joinRoom.title') }}</h3>
                    <button class="close-btn" @click="handleClose">✕</button>
                </div>

                <!-- 对话框内容 -->
                <div class="dialog-body">
                    <!-- 房间信息 -->
                    <div v-if="room" class="room-info">
                        <div class="room-icon">{{ room.icon || '🔒' }}</div>
                        <div class="room-details">
                            <h4 class="room-name">{{ room.name }}</h4>
                            <p class="room-meta">
                                <span>👤 {{ room.creator }}</span>
                                <span class="separator">·</span>
                                <span>👥 {{ room.memberCount }}</span>
                            </p>
                            <p v-if="room.description" class="room-description">{{ room.description }}</p>
                        </div>
                    </div>

                    <!-- 密码输入 -->
                    <form @submit.prevent="handleSubmit">
                        <div class="form-group">
                            <label class="form-label">{{ t('joinRoom.password') }}</label>
                            <input
                                v-model="password"
                                type="password"
                                class="form-input"
                                :class="{ 'error': error }"
                                :placeholder="t('joinRoom.passwordPlaceholder')"
                                :disabled="loading"
                                autofocus
                            />
                            <span v-if="error" class="error-text">{{ error }}</span>
                        </div>
                    </form>
                </div>

                <!-- 对话框底部 -->
                <div class="dialog-footer">
                    <button class="btn btn-secondary" @click="handleClose" :disabled="loading">
                        {{ t('common.cancel') }}
                    </button>
                    <button class="btn btn-primary" @click="handleSubmit" :disabled="loading || !password">
                        <span v-if="loading" class="loading-spinner"></span>
                        {{ loading ? t('joinRoom.joining') : t('joinRoom.join') }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiService } from '@/services/api'

const { t } = useI18n()

const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true
    },
    room: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['update:modelValue', 'joined'])

// 状态
const password = ref('')
const error = ref('')
const loading = ref(false)

// 提交表单
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
        
        if (response.success) {
            emit('joined', props.room)
            handleClose()
            resetForm()
        } else {
            // 处理错误
            if (response.errorCode === 'ROOM_WRONG_PASSWORD') {
                error.value = t('joinRoom.errors.wrongPassword')
            } else if (response.errorCode === 'ROOM_ALREADY_MEMBER') {
                error.value = t('joinRoom.errors.alreadyMember')
            } else {
                error.value = response.message || t('joinRoom.errors.joinFailed')
            }
        }
    } catch (err) {
        error.value = err.message || t('joinRoom.errors.joinFailed')
    } finally {
        loading.value = false
    }
}

// 关闭对话框
function handleClose() {
    emit('update:modelValue', false)
}

// 点击遮罩层关闭
function handleOverlayClick() {
    if (!loading.value) {
        handleClose()
    }
}

// 重置表单
function resetForm() {
    password.value = ''
    error.value = ''
}

// 监听对话框打开，重置表单
watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        resetForm()
    }
})
</script>

<style scoped>
/* ==================== 对话框遮罩 ==================== */
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

/* ==================== 对话框容器 ==================== */
.dialog-container {
    background: var(--bg-primary);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 450px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: background-color 0.3s ease;
}

/* ==================== 对话框头部 ==================== */
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

/* ==================== 对话框主体 ==================== */
.dialog-body {
    padding: 24px;
}

/* ==================== 房间信息 ==================== */
.room-info {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 12px;
}

.room-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    flex-shrink: 0;
}

.room-details {
    flex: 1;
    min-width: 0;
}

.room-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 6px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.room-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 8px 0;
}

.separator {
    opacity: 0.5;
}

.room-description {
    font-size: 13px;
    color: var(--text-tertiary);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
}

/* ==================== 表单 ==================== */
.form-group {
    margin-bottom: 20px;
}

.form-group:last-child {
    margin-bottom: 0;
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

/* ==================== 对话框底部 ==================== */
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

/* ==================== 动画 ==================== */
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

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
    .dialog-container {
        max-width: 100%;
        margin: 0;
        border-radius: 16px 16px 0 0;
        align-self: flex-end;
    }
}
</style>

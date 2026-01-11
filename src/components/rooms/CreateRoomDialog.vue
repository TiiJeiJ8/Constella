<template>
    <Transition name="dialog-fade">
        <div v-if="modelValue" class="dialog-overlay" @click="handleOverlayClick">
            <div class="dialog-container" @click.stop>
                <!-- 对话框头部 -->
                <div class="dialog-header">
                    <h3 class="dialog-title">{{ t('createRoom.title') }}</h3>
                    <button class="close-btn" @click="handleClose">✕</button>
                </div>

                <!-- 对话框内容 -->
                <div class="dialog-body">
                    <form @submit.prevent="handleSubmit">
                        <!-- 房间名称 -->
                        <div class="form-group">
                            <label class="form-label">{{ t('createRoom.name') }}</label>
                            <input
                                v-model="formData.name"
                                type="text"
                                class="form-input"
                                :class="{ 'error': errors.name }"
                                :placeholder="t('createRoom.namePlaceholder')"
                                maxlength="100"
                            />
                            <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
                        </div>

                        <!-- 房间描述 -->
                        <div class="form-group">
                            <label class="form-label">{{ t('createRoom.description') }}</label>
                            <textarea
                                v-model="formData.description"
                                class="form-textarea"
                                :placeholder="t('createRoom.descriptionPlaceholder')"
                                rows="3"
                                maxlength="500"
                            ></textarea>
                            <span class="char-count">{{ formData.description?.length || 0 }}/500</span>
                        </div>

                        <!-- 房间图标 -->
                        <div class="form-group">
                            <label class="form-label">{{ t('createRoom.icon') }}</label>
                            <div class="icon-selector">
                                <button
                                    v-for="icon in iconOptions"
                                    :key="icon"
                                    type="button"
                                    class="icon-option"
                                    :class="{ 'active': formData.icon === icon }"
                                    @click="formData.icon = icon"
                                >
                                    {{ icon }}
                                </button>
                            </div>
                        </div>

                        <!-- 隐私设置 -->
                        <div class="form-group">
                            <div class="checkbox-group">
                                <label class="checkbox-label">
                                    <input
                                        v-model="formData.isPrivate"
                                        type="checkbox"
                                        class="checkbox-input"
                                    />
                                    <span class="checkbox-text">
                                        🔒 {{ t('createRoom.private') }}
                                    </span>
                                </label>
                            </div>
                            <p class="form-hint">{{ t('createRoom.privateHint') }}</p>
                        </div>

                        <!-- 房间密码（仅私密房间） -->
                        <Transition name="slide-fade">
                            <div v-if="formData.isPrivate" class="form-group">
                                <label class="form-label">{{ t('createRoom.password') }}</label>
                                <input
                                    v-model="formData.password"
                                    type="password"
                                    class="form-input"
                                    :class="{ 'error': errors.password }"
                                    :placeholder="t('createRoom.passwordPlaceholder')"
                                    maxlength="50"
                                />
                                <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
                            </div>
                        </Transition>
                    </form>
                </div>

                <!-- 对话框底部 -->
                <div class="dialog-footer">
                    <button class="btn btn-secondary" @click="handleClose" :disabled="loading">
                        {{ t('common.cancel') }}
                    </button>
                    <button class="btn btn-primary" @click="handleSubmit" :disabled="loading">
                        <span v-if="loading" class="loading-spinner"></span>
                        {{ loading ? t('createRoom.creating') : t('createRoom.create') }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiService } from '@/services/api'

const { t } = useI18n()

const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true
    }
})

const emit = defineEmits(['update:modelValue', 'created'])

// 图标选项
const iconOptions = ['💼', '🎨', '📊', '💡', '🚀', '📝', '🎯', '⭐', '🔥', '💻', '📱', '🎮']

// 表单数据
const formData = reactive({
    name: '',
    description: '',
    icon: '💼',
    isPrivate: false,
    password: ''
})

// 错误信息
const errors = reactive({
    name: '',
    password: ''
})

// 加载状态
const loading = ref(false)

// 验证表单
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
    
    if (formData.isPrivate && !formData.password) {
        errors.password = t('createRoom.errors.passwordRequired')
        return false
    }
    
    if (formData.password && formData.password.length < 4) {
        errors.password = t('createRoom.errors.passwordTooShort')
        return false
    }
    
    return true
}

// 提交表单
async function handleSubmit() {
    if (!validateForm()) {
        return
    }
    
    loading.value = true
    
    try {
        // 准备设置数据
        const settings = {
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
        } else {
            // 显示错误，映射常见错误码到翻译
            if (response.errorCode === 'UNAUTHORIZED' || response.message?.includes('token')) {
                errors.name = t('common.errors.tokenExpired')
            } else {
                errors.name = response.message || t('createRoom.errors.createFailed')
            }
        }
    } catch (error) {
        errors.name = error.message || t('createRoom.errors.createFailed')
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
    formData.name = ''
    formData.description = ''
    formData.icon = '💼'
    formData.isPrivate = false
    formData.password = ''
    errors.name = ''
    errors.password = ''
}

// 监听对话框关闭，清空错误
watch(() => props.modelValue, (newVal) => {
    if (!newVal) {
        errors.name = ''
        errors.password = ''
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
    max-width: 500px;
    max-height: 90vh;
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
    overflow-y: auto;
    flex: 1;
}

/* ==================== 表单组 ==================== */
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

.form-input,
.form-textarea {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 14px;
    transition: all 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
    border-color: var(--accent-primary);
    outline: none;
}

.form-input.error,
.form-textarea.error {
    border-color: #e53935;
}

.form-textarea {
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

.error-text {
    display: block;
    color: #e53935;
    font-size: 12px;
    margin-top: 6px;
}

.form-hint {
    font-size: 12px;
    color: var(--text-tertiary);
    margin: 6px 0 0;
}

/* ==================== 图标选择器 ==================== */
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

/* ==================== 复选框 ==================== */
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

.slide-fade-enter-active,
.slide-fade-leave-active {
    transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
    .dialog-container {
        max-width: 100%;
        margin: 0;
        border-radius: 16px 16px 0 0;
        align-self: flex-end;
        max-height: 85vh;
    }
    
    .icon-selector {
        grid-template-columns: repeat(4, 1fr);
    }
}
</style>

<template>
    <Transition name="overlay-fade">
        <div v-if="modelValue" class="dialog-overlay" @click="handleOverlayClick">
            <Transition name="dialog-scale">
                <div v-if="modelValue" class="dialog-container" @click.stop>
                    <!-- 对话框标题 -->
                    <div class="dialog-header">
                        <h3 class="dialog-title">{{ title }}</h3>
                    </div>

                    <!-- 对话框内容 -->
                    <div class="dialog-content">
                        <p class="dialog-message">{{ message }}</p>
                    </div>

                    <!-- 对话框按钮 -->
                    <div class="dialog-actions">
                        <button 
                            class="dialog-btn cancel-btn" 
                            @click="handleCancel"
                        >
                            {{ cancelText || t('common.cancel') }}
                        </button>
                        <button 
                            class="dialog-btn confirm-btn"
                            :class="{ danger: type === 'danger' }"
                            @click="handleConfirm"
                        >
                            {{ confirmText || t('common.confirm') }}
                        </button>
                    </div>
                </div>
            </Transition>
        </div>
    </Transition>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    confirmText: {
        type: String,
        default: ''
    },
    cancelText: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        default: 'default', // 'default' | 'danger'
        validator: (value) => ['default', 'danger'].includes(value)
    }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

function handleConfirm() {
    emit('confirm')
    emit('update:modelValue', false)
}

function handleCancel() {
    emit('cancel')
    emit('update:modelValue', false)
}

function handleOverlayClick() {
    handleCancel()
}
</script>

<style scoped>
/* ==================== 遮罩层 ==================== */
.dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

/* ==================== 对话框容器 ==================== */
.dialog-container {
    background: var(--bg-secondary);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    width: 90%;
    max-width: 400px;
    overflow: hidden;
    border: 1px solid var(--border-light);
}

/* ==================== 对话框头部 ==================== */
.dialog-header {
    padding: 24px 24px 16px;
}

.dialog-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

/* ==================== 对话框内容 ==================== */
.dialog-content {
    padding: 0 24px 24px;
}

.dialog-message {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
}

/* ==================== 对话框按钮 ==================== */
.dialog-actions {
    padding: 16px 24px;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    border-top: 1px solid var(--border-light);
}

.dialog-btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
}

.cancel-btn {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.cancel-btn:hover {
    background: var(--bg-quaternary);
}

.confirm-btn {
    background: var(--accent-primary);
    color: #fff;
}

.confirm-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
}

.confirm-btn.danger {
    background: #e53935;
}

.confirm-btn.danger:hover {
    background: #c62828;
}

/* ==================== 遮罩层淡入淡出动画 ==================== */
.overlay-fade-enter-active,
.overlay-fade-leave-active {
    transition: all 0.3s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
    opacity: 0;
    backdrop-filter: blur(0);
    -webkit-backdrop-filter: blur(0);
}

/* ==================== 对话框缩放动画 ==================== */
.dialog-scale-enter-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dialog-scale-leave-active {
    transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
}

.dialog-scale-enter-from {
    opacity: 0;
    transform: scale(0.9);
}

.dialog-scale-leave-to {
    opacity: 0;
    transform: scale(0.95);
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
    .dialog-container {
        width: 95%;
    }

    .dialog-header,
    .dialog-content,
    .dialog-actions {
        padding-left: 20px;
        padding-right: 20px;
    }
}
</style>

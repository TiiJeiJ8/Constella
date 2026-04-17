<template>
    <Teleport to="body">
        <Transition name="overlay-fade">
            <div v-if="modelValue" class="dialog-overlay" @click="handleOverlayClick">
                <Transition name="dialog-scale">
                    <div v-if="modelValue" class="dialog-container" @click.stop>
                        <div class="dialog-header">
                            <h3 class="dialog-title">{{ title }}</h3>
                        </div>

                        <div class="dialog-content">
                            <p class="dialog-message">{{ message }}</p>
                        </div>

                        <div class="dialog-actions">
                            <button class="dialog-btn cancel-btn" @click="handleCancel">
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
    </Teleport>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
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
        default: 'default',
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
.dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.78);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 11000;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}

.dialog-container {
    width: min(420px, calc(100vw - 24px));
    background: color-mix(in srgb, var(--bg-primary) 92%, #000 8%);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--border-color) 82%, #fff 18%);
}

.dialog-header {
    padding: 24px 24px 16px;
}

.dialog-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.dialog-content {
    padding: 0 24px 24px;
}

.dialog-message {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-primary);
    margin: 0;
}

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

@media (max-width: 768px) {
    .dialog-container {
        width: calc(100vw - 16px);
    }

    .dialog-header,
    .dialog-content,
    .dialog-actions {
        padding-left: 20px;
        padding-right: 20px;
    }
}
</style>

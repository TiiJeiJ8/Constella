<template>
    <Teleport to="body">
        <TransitionGroup name="toast" tag="div" class="toast-container">
            <div
                v-for="toast in toasts"
                :key="toast.id"
                class="toast"
                :class="toast.type"
                @click="removeToast(toast.id)"
            >
                <span class="toast-icon">{{ getIcon(toast.type) }}</span>
                <span class="toast-message">{{ toast.message }}</span>
            </div>
        </TransitionGroup>
    </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

export interface Toast {
    id: number
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
    duration?: number
}

const toasts = ref<Toast[]>([])
let nextId = 0

function getIcon(type: string) {
    switch (type) {
        case 'success': return '✓'
        case 'error': return '✕'
        case 'warning': return '⚠'
        case 'info': return 'ℹ'
        default: return 'ℹ'
    }
}

function addToast(message: string, type: Toast['type'] = 'info', duration = 3000) {
    const id = nextId++
    toasts.value.push({ id, message, type, duration })
    
    if (duration > 0) {
        setTimeout(() => removeToast(id), duration)
    }
    
    return id
}

function removeToast(id: number) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
        toasts.value.splice(index, 1)
    }
}

function success(message: string, duration?: number) {
    return addToast(message, 'success', duration)
}

function error(message: string, duration?: number) {
    return addToast(message, 'error', duration)
}

function warning(message: string, duration?: number) {
    return addToast(message, 'warning', duration)
}

function info(message: string, duration?: number) {
    return addToast(message, 'info', duration)
}

defineExpose({
    success,
    error,
    warning,
    info,
    addToast,
    removeToast
})
</script>

<style scoped>
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
}

.toast {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    border-radius: 8px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    color: var(--text-primary);
    font-size: 14px;
    pointer-events: auto;
    cursor: pointer;
    max-width: 360px;
    backdrop-filter: blur(10px);
}

.toast.success {
    background: linear-gradient(135deg, rgba(72, 187, 120, 0.15), rgba(72, 187, 120, 0.05));
    border-color: rgba(72, 187, 120, 0.4);
}

.toast.success .toast-icon {
    color: #48bb78;
}

.toast.error {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));
    border-color: rgba(239, 68, 68, 0.4);
}

.toast.error .toast-icon {
    color: #ef4444;
}

.toast.warning {
    background: linear-gradient(135deg, rgba(237, 137, 54, 0.15), rgba(237, 137, 54, 0.05));
    border-color: rgba(237, 137, 54, 0.4);
}

.toast.warning .toast-icon {
    color: #ed8936;
}

.toast.info {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(102, 126, 234, 0.05));
    border-color: rgba(102, 126, 234, 0.4);
}

.toast.info .toast-icon {
    color: #667eea;
}

.toast-icon {
    font-size: 16px;
    font-weight: bold;
}

.toast-message {
    flex: 1;
}

/* 动画 */
.toast-enter-active {
    animation: toastIn 0.3s ease-out;
}

.toast-leave-active {
    animation: toastOut 0.2s ease-in;
}

@keyframes toastIn {
    from {
        opacity: 0;
        transform: translateX(100px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes toastOut {
    from {
        opacity: 1;
        transform: translateX(0);
    }
    to {
        opacity: 0;
        transform: translateX(100px);
    }
}
</style>

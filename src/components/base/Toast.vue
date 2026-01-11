<template>
    <Teleport to="body">
        <Transition name="toast-fade">
            <div v-if="visible" class="toast" :class="type">
                <span class="toast-icon">{{ icon }}</span>
                <span class="toast-message">{{ message }}</span>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        default: 'info', // info, success, warning, error
        validator: (value) => ['info', 'success', 'warning', 'error'].includes(value)
    },
    duration: {
        type: Number,
        default: 3000
    },
    show: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['update:show'])

const visible = ref(props.show)

const icon = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
}[props.type]

let timer = null

watch(() => props.show, (newVal) => {
    visible.value = newVal
    if (newVal) {
        clearTimeout(timer)
        timer = setTimeout(() => {
            visible.value = false
            emit('update:show', false)
        }, props.duration)
    }
})

watch(visible, (newVal) => {
    if (!newVal) {
        emit('update:show', false)
    }
})
</script>

<style scoped>
.toast {
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    min-width: 200px;
    max-width: 400px;
}

html[data-theme='dark'] .toast {
    background: rgba(40, 40, 40, 0.95);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.toast-icon {
    font-size: 18px;
    flex-shrink: 0;
}

.toast-message {
    font-size: 14px;
    color: var(--text-primary);
    line-height: 1.5;
}

.toast.info {
    border-left: 3px solid #409eff;
}

.toast.success {
    border-left: 3px solid #67c23a;
}

.toast.warning {
    border-left: 3px solid #e6a23c;
}

.toast.error {
    border-left: 3px solid #f56c6c;
}

/* 动画 */
.toast-fade-enter-active,
.toast-fade-leave-active {
    transition: all 0.3s ease;
}

.toast-fade-enter-from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
}

.toast-fade-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
}
</style>

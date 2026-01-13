<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div 
                v-if="modelValue" 
                class="input-dialog-overlay"
                @click.self="handleCancel"
                @keydown.esc="handleCancel"
                @keydown.enter="handleConfirm"
                tabindex="-1"
                ref="overlayRef"
            >
                <div class="input-dialog">
                    <h3 class="dialog-title">{{ title }}</h3>
                    <input 
                        ref="inputRef"
                        type="text"
                        class="dialog-input"
                        v-model="inputValue"
                        :placeholder="placeholder"
                    />
                    <div class="dialog-actions">
                        <button class="dialog-btn cancel-btn" @click="handleCancel">
                            {{ t('common.cancel') }}
                        </button>
                        <button class="dialog-btn confirm-btn" @click="handleConfirm">
                            {{ t('common.confirm') }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(defineProps<{
    modelValue: boolean
    title: string
    placeholder?: string
    defaultValue?: string
}>(), {
    placeholder: '',
    defaultValue: ''
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'confirm', value: string): void
    (e: 'cancel'): void
}>()

const overlayRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const inputValue = ref('')

watch(() => props.modelValue, (visible) => {
    if (visible) {
        inputValue.value = props.defaultValue
        nextTick(() => {
            overlayRef.value?.focus()
            inputRef.value?.focus()
            inputRef.value?.select()
        })
    }
})

function handleConfirm() {
    emit('confirm', inputValue.value)
    emit('update:modelValue', false)
}

function handleCancel() {
    emit('cancel')
    emit('update:modelValue', false)
}
</script>

<style scoped>
.input-dialog-overlay {
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
}

.input-dialog {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    min-width: 320px;
    max-width: 400px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.dialog-title {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

.dialog-input {
    width: 100%;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 14px;
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.2s;
}

.dialog-input:focus {
    border-color: var(--color-primary);
}

.dialog-input::placeholder {
    color: var(--text-tertiary);
}

.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
}

.dialog-btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.cancel-btn {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
}

.cancel-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.confirm-btn {
    background: var(--color-primary);
    border: none;
    color: white;
}

.confirm-btn:hover {
    filter: brightness(1.1);
}

/* 动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-enter-active .input-dialog {
    animation: dialog-in 0.2s ease-out;
}

.modal-fade-leave-active .input-dialog {
    animation: dialog-out 0.15s ease-in;
}

@keyframes dialog-in {
    from {
        opacity: 0;
        transform: scale(0.9) translateY(-10px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

@keyframes dialog-out {
    from {
        opacity: 1;
        transform: scale(1);
    }
    to {
        opacity: 0;
        transform: scale(0.9);
    }
}
</style>

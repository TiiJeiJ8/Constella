/**
 * Hyperlink 编辑器 (URL 输入弹窗)
*/
<template>
    <Teleport to="body">
        <div class="hyperlink-overlay" @click.self="$emit('close')" @keydown.esc.stop="$emit('close')" tabindex="-1" ref="overlayRef">
            <div class="hyperlink-dialog">
                <div class="dialog-header">
                    <span class="dialog-title">{{ t('plugins.hyperlink.editor.title') }}</span>
                    <button class="close-btn" @click="$emit('close')">✕</button>
                </div>

                <div class="dialog-body">
                    <div class="field-group">
                        <label class="field-label">{{ t('plugins.hyperlink.editor.urlLabel') }} <span class="required">*</span></label>
                        <input
                            ref="urlInputRef"
                            v-model="url"
                            type="url"
                            class="field-input"
                            :readonly="readOnly"
                            :placeholder="t('plugins.hyperlink.editor.urlPlaceholder')"
                            @keydown.enter="handleSave"
                            @keydown.esc.stop="$emit('close')"
                        />
                        <span v-if="urlErrorMessage" class="field-error">{{ urlErrorMessage }}</span>
                    </div>
                    <div class="field-group">
                        <label class="field-label">{{ t('plugins.hyperlink.editor.titleLabel') }}</label>
                        <input
                            v-model="title"
                            type="text"
                            class="field-input"
                            :readonly="readOnly"
                            :placeholder="t('plugins.hyperlink.editor.titlePlaceholder')"
                            @keydown.enter="handleSave"
                            @keydown.esc.stop="$emit('close')"
                        />
                    </div>
                </div>

                <div class="dialog-footer">
                    <button class="btn btn-open" @click="handleOpen" :disabled="!url.trim()" :title="t('plugins.hyperlink.editor.openTitle')">
                        ↗ {{ t('plugins.hyperlink.editor.open') }}
                    </button>
                    <div class="footer-right">
                        <button class="btn btn-cancel" @click="$emit('close')">{{ t('plugins.hyperlink.editor.cancel') }}</button>
                        <button v-if="!readOnly" class="btn btn-save" @click="handleSave" :disabled="!url.trim()">{{ t('plugins.hyperlink.editor.save') }}</button>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
    nodeId: { type: String, required: true },
    content: { type: Object, required: true },
    readOnly: { type: Boolean, default: false }
})

const emit = defineEmits(['update', 'close'])
const { t } = useI18n()

const urlInputRef = ref(null)
const url = ref(props.content.data || '')
const title = ref(props.content?.metadata?.title || '')
const urlErrorKey = ref('')
const urlErrorMessage = computed(() => (urlErrorKey.value ? t(urlErrorKey.value) : ''))

onMounted(() => {
    urlInputRef.value?.focus()
})

function handleSave() {
    if (props.readOnly) return
    const trimmed = url.value.trim()
    if (!trimmed) return

    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

    try {
        new URL(normalized)  // 验证 URL 格式
        urlErrorKey.value = ''
        emit('update', props.nodeId, {
            ...props.content,
            data: normalized,
            metadata: { ...(props.content.metadata || {}), title: title.value.trim() }
        })
    } catch {
        urlErrorKey.value = 'plugins.hyperlink.editor.invalidUrl'
    }
}

function handleOpen() {
    const trimmed = url.value.trim()
    if (!trimmed) return
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    if (window.electron) {
        window.electron.openExternal(normalized)
    } else {
        window.open(normalized, '_blank', 'noopener,noreferrer')
    }
}
</script>

<style scoped>
.hyperlink-overlay {
    position: fixed;
    inset: 0;
    background: var(--dialog-backdrop);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 24px;
    backdrop-filter: blur(8px);
}

.hyperlink-dialog {
    width: min(640px, calc(100vw - 48px));
    background: var(--dialog-bg);
    border: 1px solid var(--dialog-border);
    border-radius: 8px;
    color: var(--dialog-text);
    overflow: hidden;
    box-shadow: var(--dialog-shadow);
}

.dialog-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--dialog-border);
    background: var(--dialog-section-bg);
}
.dialog-title { font-size: 16px; font-weight: 600; color: var(--dialog-text); flex: 1; }
.close-btn {
    background: transparent; border: none; color: var(--dialog-muted);
    cursor: pointer; font-size: 14px; padding: 4px;
}
.close-btn:hover { color: var(--dialog-text); }

.dialog-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }

.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 13px; color: var(--dialog-muted); font-weight: 600; }
.required { color: var(--dialog-danger); }
.field-input {
    background: var(--dialog-control-bg);
    border: 1px solid var(--dialog-control-border);
    border-radius: 8px;
    color: var(--dialog-text);
    font-size: 14px;
    padding: 12px 14px;
    outline: none;
    transition: border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease;
}
.field-input:focus {
    border-color: var(--dialog-primary);
    box-shadow: 0 0 0 3px var(--dialog-focus);
}
.field-input::placeholder {
    color: var(--dialog-placeholder);
}
.field-input[readonly] { opacity: 0.82; cursor: default; }
.field-error { font-size: 12px; color: var(--dialog-danger); }

.dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 16px 20px;
    border-top: 1px solid var(--dialog-border);
    background: var(--dialog-section-bg);
}
.footer-right {
    display: flex;
    gap: 8px;
}
.btn {
    padding: 10px 16px; border-radius: 8px; font-size: 14px;
    cursor: pointer; border: none; font-weight: 600;
    transition: transform 140ms ease, background-color 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease;
}
.btn:hover:not(:disabled) {
    transform: translateY(-1px);
}
.btn-cancel {
    background: var(--dialog-control-hover);
    color: var(--dialog-text);
    border: 1px solid transparent;
}
.btn-cancel:hover { color: var(--dialog-text); }
.btn-save {
    background: var(--dialog-primary);
    color: #ffffff;
    box-shadow: 0 8px 18px rgba(102, 126, 234, 0.18);
}
.btn-save:hover:not(:disabled) { background: var(--dialog-primary-hover); }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-open {
    background: transparent;
    color: var(--dialog-primary);
    border: 1px solid var(--dialog-primary);
    padding: 10px 14px;
}
.btn-open:hover:not(:disabled) { background: var(--dialog-focus); }
.btn-open:disabled { opacity: 0.35; cursor: not-allowed; }

@media (max-width: 720px) {
    .hyperlink-overlay {
        padding: 12px;
    }

    .hyperlink-dialog {
        width: 100%;
    }

    .dialog-footer {
        flex-direction: column;
        align-items: stretch;
    }

    .footer-right {
        justify-content: flex-end;
    }
}
</style>

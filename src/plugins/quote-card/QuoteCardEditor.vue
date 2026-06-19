<template>
    <Teleport to="body">
        <div class="quote-editor-overlay" tabindex="-1" @click.self="$emit('close')" @keydown.esc.stop="$emit('close')">
            <div class="quote-editor">
                <div class="editor-header">
                    <h3>{{ t('plugins.quoteCard.editor.title') }}</h3>
                    <button class="close-btn" :title="t('plugins.quoteCard.editor.close')" @click="$emit('close')">×</button>
                </div>

                <div class="editor-body">
                    <label class="field">
                        <span>{{ t('plugins.quoteCard.editor.quoteLabel') }}</span>
                        <textarea v-model="draft" :readonly="readOnly" :placeholder="t('plugins.quoteCard.editor.quotePlaceholder')" />
                    </label>

                    <label class="field">
                        <span>{{ t('plugins.quoteCard.editor.authorLabel') }}</span>
                        <input v-model="author" :readonly="readOnly" :placeholder="t('plugins.quoteCard.editor.authorPlaceholder')" />
                    </label>
                </div>

                <div class="editor-footer">
                    <button class="btn btn-secondary" @click="$emit('close')">{{ t('plugins.quoteCard.editor.cancel') }}</button>
                    <button v-if="!readOnly" class="btn btn-primary" @click="save">{{ t('plugins.quoteCard.editor.save') }}</button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NodeContent } from '../index'

const props = defineProps<{
    nodeId: string
    content: NodeContent
    readOnly?: boolean
}>()

const emit = defineEmits<{
    (e: 'update', nodeId: string, contentPatch: NodeContent): void
    (e: 'close'): void
}>()

const { t } = useI18n()
const draft = ref(String(props.content?.data || ''))
const author = ref(String(props.content?.metadata?.author || ''))

function save() {
    if (props.readOnly) return
    emit('update', props.nodeId, {
        ...props.content,
        data: draft.value,
        metadata: {
            ...(props.content?.metadata || {}),
            author: author.value
        }
    })
    emit('close')
}
</script>

<style scoped>
.quote-editor-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: var(--dialog-backdrop);
    backdrop-filter: blur(8px);
}

.quote-editor {
    width: min(640px, calc(100vw - 32px));
    background: var(--dialog-bg);
    border: 1px solid var(--dialog-border);
    border-radius: 8px;
    color: var(--dialog-text);
    box-shadow: var(--dialog-shadow);
    overflow: hidden;
}

.editor-header,
.editor-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--dialog-border);
    background: var(--dialog-section-bg);
}

.editor-footer {
    border-bottom: none;
    border-top: 1px solid var(--dialog-border);
    justify-content: flex-end;
    gap: 10px;
}

.editor-header h3 {
    margin: 0;
    font-size: 16px;
    color: var(--dialog-text);
}

.editor-body {
    display: grid;
    gap: 14px;
    padding: 18px 20px;
}

.field {
    display: grid;
    gap: 8px;
    color: var(--dialog-muted);
    font-size: 13px;
    font-weight: 600;
}

.field textarea,
.field input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--dialog-control-border);
    border-radius: 8px;
    padding: 12px 14px;
    background: var(--dialog-control-bg);
    color: var(--dialog-text);
    font-size: 14px;
    line-height: 1.5;
    outline: none;
    transition: border-color 140ms ease, box-shadow 140ms ease, background-color 140ms ease;
}

.field textarea:focus,
.field input:focus {
    border-color: var(--dialog-primary);
    box-shadow: 0 0 0 3px var(--dialog-focus);
}

.field textarea::placeholder,
.field input::placeholder {
    color: var(--dialog-placeholder);
}

.field textarea {
    min-height: 180px;
    resize: vertical;
}

.close-btn,
.btn {
    border: none;
    cursor: pointer;
}

.close-btn {
    background: transparent;
    font-size: 24px;
    color: var(--dialog-muted);
}

.btn {
    border-radius: 8px;
    padding: 10px 16px;
    font-weight: 600;
    transition: transform 140ms ease, background-color 140ms ease, color 140ms ease, box-shadow 140ms ease;
}

.close-btn:hover,
.btn:hover {
    transform: translateY(-1px);
}

.btn-primary {
    background: var(--dialog-primary);
    color: #ffffff;
    box-shadow: 0 8px 18px rgba(102, 126, 234, 0.18);
}

.btn-secondary {
    background: var(--dialog-control-hover);
    color: var(--dialog-text);
}

@media (max-width: 720px) {
    .quote-editor-overlay {
        padding: 12px;
    }

    .quote-editor {
        width: 100%;
    }
}
</style>

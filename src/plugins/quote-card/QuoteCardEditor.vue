<template>
    <div class="quote-editor">
        <div class="editor-header">
            <h3>Quote Card Editor</h3>
            <button class="close-btn" @click="$emit('close')">×</button>
        </div>

        <div class="editor-body">
            <label class="field">
                <span>Quote</span>
                <textarea v-model="draft" placeholder="Type your quote..." />
            </label>

            <label class="field">
                <span>Author</span>
                <input v-model="author" placeholder="Anonymous" />
            </label>
        </div>

        <div class="editor-footer">
            <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
            <button class="btn btn-primary" @click="save">Save</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { NodeContent } from '../index'

const props = defineProps<{
    nodeId: string
    content: NodeContent
}>()

const emit = defineEmits<{
    (e: 'update', nodeId: string, contentPatch: NodeContent): void
    (e: 'close'): void
}>()

const draft = ref(String(props.content?.data || ''))
const author = ref(String(props.content?.metadata?.author || ''))

function save() {
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
.quote-editor {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    width: min(640px, calc(100vw - 32px));
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 30px 80px rgba(15, 23, 42, 0.25);
    overflow: hidden;
}

.editor-header,
.editor-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
}

.editor-footer {
    border-bottom: none;
    border-top: 1px solid #e5e7eb;
    justify-content: flex-end;
    gap: 10px;
}

.editor-header h3 {
    margin: 0;
    font-size: 16px;
    color: #111827;
}

.editor-body {
    display: grid;
    gap: 14px;
    padding: 18px 20px;
}

.field {
    display: grid;
    gap: 8px;
    color: #374151;
    font-size: 13px;
    font-weight: 600;
}

.field textarea,
.field input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 14px;
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
    color: #6b7280;
}

.btn {
    border-radius: 999px;
    padding: 10px 16px;
    font-weight: 600;
}

.btn-primary {
    background: #111827;
    color: #ffffff;
}

.btn-secondary {
    background: #f3f4f6;
    color: #374151;
}
</style>

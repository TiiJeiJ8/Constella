/**
 * Hyperlink 编辑器 (URL 输入弹窗)
*/
<template>
    <Teleport to="body">
        <div class="hyperlink-overlay" @click.self="$emit('close')" @keydown.esc.stop="$emit('close')" tabindex="-1" ref="overlayRef">
            <div class="hyperlink-dialog">
                <div class="dialog-header">
                    <span class="dialog-icon">🌍</span>
                    <span class="dialog-title">超链接</span>
                    <button class="close-btn" @click="$emit('close')">✕</button>
                </div>

                <div class="dialog-body">
                    <div class="field-group">
                        <label class="field-label">链接地址 <span class="required">*</span></label>
                        <input
                            ref="urlInputRef"
                            v-model="url"
                            type="url"
                            class="field-input"
                            placeholder="https://example.com"
                            @keydown.enter="handleSave"
                            @keydown.esc.stop="$emit('close')"
                        />
                        <span v-if="urlError" class="field-error">{{ urlError }}</span>
                    </div>
                    <div class="field-group">
                        <label class="field-label">显示标题（可选）</label>
                        <input
                            v-model="title"
                            type="text"
                            class="field-input"
                            placeholder="留空则自动使用域名"
                            @keydown.enter="handleSave"
                            @keydown.esc.stop="$emit('close')"
                        />
                    </div>
                </div>

                <div class="dialog-footer">
                    <button class="btn btn-open" @click="handleOpen" :disabled="!url.trim()" title="在浏览器中打开">
                        ↗ 打开链接
                    </button>
                    <div class="footer-right">
                        <button class="btn btn-cancel" @click="$emit('close')">取消</button>
                        <button class="btn btn-save" @click="handleSave" :disabled="!url.trim()">保存</button>
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps({
    nodeId: { type: String, required: true },
    content: { type: Object, required: true }
})

const emit = defineEmits(['update', 'close'])

const urlInputRef = ref(null)
const url = ref(props.content.data || '')
const title = ref(props.content?.metadata?.title || '')
const urlError = ref('')

onMounted(() => {
    urlInputRef.value?.focus()
})

function handleSave() {
    const trimmed = url.value.trim()
    if (!trimmed) return

    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

    try {
        new URL(normalized)  // 验证 URL 格式
        urlError.value = ''
        emit('update', props.nodeId, {
            ...props.content,
            data: normalized,
            metadata: { ...(props.content.metadata || {}), title: title.value.trim() }
        })
    } catch {
        urlError.value = '请输入有效的网址'
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
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.hyperlink-dialog {
    background: var(--bg-primary, #1e1e2e);
    border: 1px solid var(--border-color, #3a3a5c);
    border-radius: 12px;
    width: 480px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.dialog-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color, #3a3a5c);
}
.dialog-icon { font-size: 18px; }
.dialog-title { font-size: 15px; font-weight: 600; color: var(--text-primary, #fff); flex: 1; }
.close-btn {
    background: none; border: none; color: var(--text-secondary, #aaa);
    cursor: pointer; font-size: 14px; padding: 4px;
}
.close-btn:hover { color: var(--text-primary, #fff); }

.dialog-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }

.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 13px; color: var(--text-secondary, #aaa); }
.required { color: #f56565; }
.field-input {
    background: var(--bg-secondary, #2a2a3e);
    border: 1px solid var(--border-color, #3a3a5c);
    border-radius: 8px;
    color: var(--text-primary, #fff);
    font-size: 14px;
    padding: 10px 12px;
    outline: none;
    transition: border-color 0.2s;
}
.field-input:focus { border-color: #667eea; }
.field-error { font-size: 12px; color: #f56565; }

.dialog-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 16px 20px;
    border-top: 1px solid var(--border-color, #3a3a5c);
}
.footer-right {
    display: flex;
    gap: 8px;
}
.btn {
    padding: 8px 20px; border-radius: 8px; font-size: 14px;
    cursor: pointer; border: none; font-weight: 500;
}
.btn-cancel {
    background: var(--bg-secondary, #2a2a3e);
    color: var(--text-secondary, #aaa);
    border: 1px solid var(--border-color, #3a3a5c);
}
.btn-cancel:hover { color: var(--text-primary); }
.btn-save {
    background: #667eea; color: #fff;
}
.btn-save:hover:not(:disabled) { background: #5568d3; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-open {
    background: transparent;
    color: #667eea;
    border: 1px solid #667eea;
    padding: 8px 14px;
}
.btn-open:hover:not(:disabled) { background: rgba(102,126,234,0.15); }
.btn-open:disabled { opacity: 0.35; cursor: not-allowed; }
</style>
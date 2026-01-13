<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div 
                v-if="true"
                class="editor-overlay" 
                @click.self="handleClose"
                @keydown.esc.stop="handleClose"
                tabindex="-1"
                ref="overlayRef"
            >
                <Transition name="modal-scale" appear>
                    <div class="editor-container">
                        <!-- 头部 -->
                        <div class="editor-header">
                            <div class="header-left">
                                <span class="type-icon">{{ pluginMeta?.icon || '📝' }}</span>
                                <span class="type-label">{{ pluginMeta?.label || '编辑' }}</span>
                            </div>
                            <button class="close-btn" @click="handleClose" title="关闭 (Esc)">
                                <span>✕</span>
                            </button>
                        </div>
                        
                        <!-- 编辑器主体 -->
                        <div class="editor-body" :class="{ 'split-view': isMarkdown }">
                            <!-- 编辑区 -->
                            <div class="edit-pane">
                                <div class="pane-header" v-if="isMarkdown">编辑</div>
                                <textarea
                                    ref="textareaRef"
                                    class="editor-textarea"
                                    :value="localContent"
                                    @input="handleInput"
                                    @keydown="handleKeyDown"
                                    :placeholder="placeholder"
                                    spellcheck="false"
                                />
                                
                                <!-- 斜杠命令菜单 -->
                                <div 
                                    v-if="showSlashMenu" 
                                    class="slash-menu"
                                    :style="slashMenuStyle"
                                >
                                    <div class="slash-menu-header">插入块</div>
                                    <div 
                                        v-for="(cmd, index) in filteredCommands" 
                                        :key="cmd.id"
                                        class="slash-menu-item"
                                        :class="{ active: index === selectedCommandIndex }"
                                        @click="executeCommand(cmd)"
                                        @mouseenter="selectedCommandIndex = index"
                                    >
                                        <span class="cmd-icon">{{ cmd.icon }}</span>
                                        <div class="cmd-info">
                                            <span class="cmd-label">{{ cmd.label }}</span>
                                            <span class="cmd-desc">{{ cmd.description }}</span>
                                        </div>
                                    </div>
                                    <div v-if="filteredCommands.length === 0" class="slash-menu-empty">
                                        无匹配命令
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 预览区（仅 Markdown） -->
                            <div v-if="isMarkdown" class="preview-pane">
                                <div class="pane-header">预览</div>
                                <div class="preview-content" v-html="renderedHtml" />
                            </div>
                        </div>
                        
                        <!-- 底部状态栏 -->
                        <div class="editor-footer">
                            <div class="footer-hint">
                                <kbd>/</kbd> 插入块 · <kbd>Esc</kbd> 关闭
                            </div>
                            <div class="char-count">{{ localContent.length }} 字符</div>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
// @ts-ignore
import { pluginRegistry, type NodeContent } from '@/plugins'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

interface SlashCommand {
    id: string
    icon: string
    label: string
    description: string
    action: () => string
}

const props = defineProps<{
    nodeId: string
    content: NodeContent
}>()

const emit = defineEmits<{
    (e: 'update', nodeId: string, data: string): void
    (e: 'close'): void
}>()

const overlayRef = ref<HTMLDivElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const localContent = ref('')
const showSlashMenu = ref(false)
const slashMenuPosition = ref({ top: 0, left: 0 })
const selectedCommandIndex = ref(0)
const slashQuery = ref('')
const slashStartPosition = ref(0)

// Markdown 解析器
const md = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
    typographer: true
})

// 插件元信息
const pluginMeta = computed(() => pluginRegistry.getMeta(props.content.kind))
const isMarkdown = computed(() => props.content.kind === 'markdown')

const placeholder = computed(() => {
    if (isMarkdown.value) {
        return '输入 Markdown 内容...\n\n使用 / 插入块'
    }
    return '输入内容...\n\n使用 / 插入块'
})

const slashMenuStyle = computed(() => ({
    top: `${slashMenuPosition.value.top}px`,
    left: `${slashMenuPosition.value.left}px`
}))

// 渲染 Markdown 预览
const renderedHtml = computed(() => {
    if (!localContent.value) {
        return '<p class="placeholder">预览区域</p>'
    }
    const rawHtml = md.render(localContent.value)
    return DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
                       'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                       'ul', 'ol', 'li', 'blockquote', 'a', 'hr', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
    })
})

// 斜杠命令列表
const slashCommands: SlashCommand[] = [
    { id: 'h1', icon: 'H1', label: '一级标题', description: '大标题', action: () => '# ' },
    { id: 'h2', icon: 'H2', label: '二级标题', description: '中标题', action: () => '## ' },
    { id: 'h3', icon: 'H3', label: '三级标题', description: '小标题', action: () => '### ' },
    { id: 'bullet', icon: '•', label: '无序列表', description: '项目符号列表', action: () => '- ' },
    { id: 'numbered', icon: '1.', label: '有序列表', description: '编号列表', action: () => '1. ' },
    { id: 'todo', icon: '☐', label: '待办事项', description: '任务列表', action: () => '- [ ] ' },
    { id: 'quote', icon: '"', label: '引用', description: '引用文本', action: () => '> ' },
    { id: 'code', icon: '<>', label: '代码块', description: '代码片段', action: () => '```\n\n```' },
    { id: 'divider', icon: '—', label: '分割线', description: '水平分割线', action: () => '\n---\n' },
    { id: 'bold', icon: 'B', label: '粗体', description: '加粗文本', action: () => '**粗体**' },
    { id: 'italic', icon: 'I', label: '斜体', description: '斜体文本', action: () => '*斜体*' },
    { id: 'link', icon: '🔗', label: '链接', description: '超链接', action: () => '[文本](url)' },
]

// 过滤后的命令
const filteredCommands = computed(() => {
    if (!slashQuery.value) return slashCommands
    const query = slashQuery.value.toLowerCase()
    return slashCommands.filter(cmd => 
        cmd.label.toLowerCase().includes(query) ||
        cmd.id.toLowerCase().includes(query)
    )
})

// 初始化
onMounted(() => {
    localContent.value = props.content.data || ''
    nextTick(() => {
        overlayRef.value?.focus()
        textareaRef.value?.focus()
    })
})

// 监听内容变化
watch(() => props.content.data, (newData) => {
    if (newData !== localContent.value) {
        localContent.value = newData || ''
    }
})

function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement
    localContent.value = target.value
    emit('update', props.nodeId, target.value)
    checkSlashCommand(target)
}

function checkSlashCommand(textarea: HTMLTextAreaElement) {
    const cursorPos = textarea.selectionStart
    const textBefore = textarea.value.substring(0, cursorPos)
    const lastSlashIndex = textBefore.lastIndexOf('/')
    
    if (lastSlashIndex !== -1) {
        const charBefore = lastSlashIndex > 0 ? textBefore[lastSlashIndex - 1] : '\n'
        if (charBefore === ' ' || charBefore === '\n' || lastSlashIndex === 0) {
            const query = textBefore.substring(lastSlashIndex + 1)
            if (!query.includes(' ') && !query.includes('\n')) {
                slashQuery.value = query
                slashStartPosition.value = lastSlashIndex
                selectedCommandIndex.value = 0
                showSlashMenu.value = true
                slashMenuPosition.value = { top: 60, left: 20 }
                return
            }
        }
    }
    showSlashMenu.value = false
    slashQuery.value = ''
}

function handleKeyDown(e: KeyboardEvent) {
    if (showSlashMenu.value) {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            selectedCommandIndex.value = Math.min(selectedCommandIndex.value + 1, filteredCommands.value.length - 1)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            selectedCommandIndex.value = Math.max(selectedCommandIndex.value - 1, 0)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const cmd = filteredCommands.value[selectedCommandIndex.value]
            if (cmd) executeCommand(cmd)
        } else if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            showSlashMenu.value = false
        }
    } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        handleClose()
    }
}

function executeCommand(cmd: SlashCommand) {
    const textarea = textareaRef.value
    if (!textarea) return
    
    const insertText = cmd.action()
    const before = localContent.value.substring(0, slashStartPosition.value)
    const after = localContent.value.substring(textarea.selectionStart)
    
    localContent.value = before + insertText + after
    emit('update', props.nodeId, localContent.value)
    
    showSlashMenu.value = false
    slashQuery.value = ''
    
    nextTick(() => {
        const newPos = before.length + insertText.length
        textarea.setSelectionRange(newPos, newPos)
        textarea.focus()
    })
}

function handleClose() {
    emit('close')
}
</script>

<style scoped>
.editor-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
}

.editor-container {
    width: 100%;
    height: 100%;
    max-width: 1400px;
    max-height: 100%;
    background: #1a1a1a;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
}

.editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
    flex-shrink: 0;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.type-icon {
    font-size: 20px;
}

.type-label {
    font-size: 16px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
}

.close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.6);
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.15s;
}

.close-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
}

.editor-body {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
}

.editor-body.split-view {
    gap: 1px;
    background: rgba(255, 255, 255, 0.1);
}

.edit-pane, .preview-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #1a1a1a;
    min-width: 0;
    position: relative;
}

.pane-header {
    padding: 10px 20px;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    flex-shrink: 0;
}

.editor-textarea {
    flex: 1;
    width: 100%;
    padding: 20px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.9);
    font-size: 15px;
    line-height: 1.8;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    resize: none;
    outline: none;
    caret-color: #60a5fa;
}

.editor-textarea:focus {
    caret-color: #60a5fa;
}

.editor-textarea::placeholder {
    color: rgba(255, 255, 255, 0.25);
}

.preview-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    color: rgba(255, 255, 255, 0.9);
    font-size: 15px;
    line-height: 1.7;
}

.preview-content :deep(h1) { font-size: 1.8em; margin: 0.5em 0; font-weight: 600; }
.preview-content :deep(h2) { font-size: 1.5em; margin: 0.5em 0; font-weight: 600; }
.preview-content :deep(h3) { font-size: 1.2em; margin: 0.5em 0; font-weight: 600; }
.preview-content :deep(p) { margin: 0.8em 0; }
.preview-content :deep(code) { 
    background: rgba(255, 255, 255, 0.1); 
    padding: 2px 6px; 
    border-radius: 4px; 
    font-family: monospace;
}
.preview-content :deep(pre) {
    background: rgba(0, 0, 0, 0.3);
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
}
.preview-content :deep(blockquote) {
    border-left: 4px solid rgba(255, 255, 255, 0.2);
    margin: 1em 0;
    padding-left: 16px;
    color: rgba(255, 255, 255, 0.7);
}
.preview-content :deep(ul), .preview-content :deep(ol) {
    margin: 0.8em 0;
    padding-left: 1.5em;
}
.preview-content :deep(a) {
    color: #60a5fa;
    text-decoration: none;
}
.preview-content :deep(hr) {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 1.5em 0;
}
.preview-content .placeholder {
    color: rgba(255, 255, 255, 0.3);
    font-style: italic;
}

/* 斜杠命令菜单 */
.slash-menu {
    position: absolute;
    background: #2a2a2a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    min-width: 260px;
    max-height: 320px;
    overflow-y: auto;
    z-index: 100;
}

.slash-menu-header {
    padding: 10px 14px;
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.slash-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    cursor: pointer;
    transition: background 0.1s;
}

.slash-menu-item:hover,
.slash-menu-item.active {
    background: rgba(255, 255, 255, 0.1);
}

.cmd-icon {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
}

.cmd-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.cmd-label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.9);
}

.cmd-desc {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
}

.slash-menu-empty {
    padding: 20px 14px;
    text-align: center;
    color: rgba(255, 255, 255, 0.4);
    font-size: 13px;
}

.editor-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
    flex-shrink: 0;
}

.footer-hint {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
}

.footer-hint kbd {
    display: inline-block;
    padding: 3px 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    font-family: monospace;
    font-size: 11px;
    margin: 0 3px;
}

.char-count {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
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

.modal-scale-enter-active {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-scale-leave-active {
    transition: all 0.15s ease-in;
}

.modal-scale-enter-from {
    opacity: 0;
    transform: scale(0.95);
}

.modal-scale-leave-to {
    opacity: 0;
    transform: scale(0.98);
}
</style>

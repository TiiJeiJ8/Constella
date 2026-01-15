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
                                <span class="type-label">{{ pluginMeta ? t(`canvas.nodeTypes.${pluginMeta.kind}`) : t('canvas.editor.edit') }}</span>
                                <!-- 在线协作用户指示器 -->
                                <div v-if="editingUsers.length > 0" class="collab-users">
                                    <div
                                        v-for="user in editingUsers"
                                        :key="user.clientId"
                                        class="collab-avatar"
                                        :style="{ backgroundColor: user.user.color }"
                                        :title="user.user.name"
                                    >
                                        {{ user.user.name.charAt(0).toUpperCase() }}
                                    </div>
                                </div>
                            </div>
                            <button class="close-btn" @click="handleClose" :title="t('canvas.editor.closeHint')">
                                <span>✕</span>
                            </button>
                        </div>
                        
                        <!-- 编辑器主体 -->
                        <div class="editor-body" :class="{ 'split-view': isMarkdown }">
                            <!-- 编辑区 -->
                            <div class="edit-pane">
                                <div class="pane-header" v-if="isMarkdown">{{ t('canvas.editor.edit') }}</div>
                                <div class="textarea-wrapper">
                                    <textarea
                                        ref="textareaRef"
                                        class="editor-textarea"
                                        :value="localContent"
                                        @input="handleInput"
                                        @keydown="handleKeyDown"
                                        @select="handleSelection"
                                        @click="handleCursorChange"
                                        @keyup="handleCursorChange"
                                        :placeholder="placeholder"
                                        spellcheck="false"
                                    />
                                    <!-- 远程用户光标指示器 -->
                                    <div
                                        v-for="cursor in remoteCursors"
                                        :key="cursor.clientId"
                                        class="remote-cursor"
                                        :style="cursor.style"
                                    >
                                        <div
                                            class="remote-cursor-caret" 
                                            :style="{ backgroundColor: cursor.color }"
                                        />
                                        <div
                                            class="remote-cursor-label"
                                            :style="{ backgroundColor: cursor.color }"
                                        >
                                            {{ cursor.name }}
                                        </div>
                                        <!-- 选区高亮 -->
                                        <div
                                            v-if="cursor.selectionWidth > 0"
                                            class="remote-selection"
                                            :style="{
                                                backgroundColor: cursor.color + '40',
                                                width: cursor.selectionWidth + 'ch'
                                            }"
                                        />
                                    </div>
                                </div>
                                
                                <!-- 斜杠命令菜单 -->
                                <div
                                    v-if="showSlashMenu"
                                    class="slash-menu"
                                    :style="slashMenuStyle"
                                    ref="slashMenuRef"
                                >
                                    <div class="slash-menu-header">{{ t('canvas.editor.insertBlock') }}</div>
                                    <div class="slash-menu-scroll">
                                        <div
                                            v-for="(cmd, index) in filteredCommands"
                                            :key="cmd.id"
                                            class="slash-menu-item"
                                            :class="{ active: index === selectedCommandIndex }"
                                            @click="executeCommand(cmd)"
                                            @mouseenter="selectedCommandIndex = index"
                                        >
                                            <span class="cmd-icon" :class="cmd.iconClass">{{ cmd.icon }}</span>
                                            <div class="cmd-info">
                                                <span class="cmd-label">{{ cmd.label }}</span>
                                                <span class="cmd-desc">{{ cmd.description }}</span>
                                            </div>
                                            <span v-if="cmd.shortcut" class="cmd-shortcut">{{ cmd.shortcut }}</span>
                                        </div>
                                    </div>
                                    <div v-if="filteredCommands.length === 0" class="slash-menu-empty">
                                        {{ t('canvas.editor.noMatch') }}
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 预览区（仅 Markdown） -->
                            <div v-if="isMarkdown" class="preview-pane">
                                <div class="pane-header">{{ t('canvas.editor.preview') }}</div>
                                <div class="preview-content" v-html="renderedHtml" ref="previewRef" />
                            </div>
                        </div>
                        
                        <!-- 底部状态栏 -->
                        <div class="editor-footer">
                            <div class="footer-hint">
                                <kbd>/</kbd> {{ t('canvas.editor.footerHint') }} · <kbd>Esc</kbd> {{ t('canvas.editor.footerClose') }}
                            </div>
                            <div class="footer-right">
                                <span v-if="editingUsers.length > 0" class="collab-indicator">
                                    👥 {{ t('canvas.editor.collaborating', { count: editingUsers.length + 1 }) }}
                                </span>
                                <span class="char-count">{{ t('canvas.editor.characters', { count: localContent.length }) }}</span>
                            </div>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, inject } from 'vue'
import { useI18n } from 'vue-i18n'
// @ts-ignore
import { pluginRegistry, type NodeContent } from '@/plugins'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import katex from 'katex'
import hljs from 'highlight.js'
import mermaid from 'mermaid'
import type { UserState } from '@/composables/useAwareness'

const { t } = useI18n()

// 获取当前主题
const isDarkTheme = computed(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark'
})

// 初始化 Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'system-ui, -apple-system, sans-serif'
})

interface SlashCommand {
    id: string
    icon: string
    iconClass?: string
    label: string
    description: string
    shortcut?: string
    action: () => string
}

interface RemoteCursor {
    clientId: number
    name: string
    color: string
    position: number
    selectionEnd: number
    style: { top: string; left: string }
    selectionWidth: number
}

const props = defineProps<{
    nodeId: string
    content: NodeContent
}>()

const emit = defineEmits<{
    (e: 'update', nodeId: string, data: string): void
    (e: 'close'): void
}>()

// 注入协作功能
const awareness = inject<{
    otherUsers: { value: UserState[] }
    updateTextCursor?: (nodeId: string, position: number, selectionEnd: number) => void
}>('awareness', { otherUsers: { value: [] } })

const overlayRef = ref<HTMLDivElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const previewRef = ref<HTMLDivElement | null>(null)
const slashMenuRef = ref<HTMLDivElement | null>(null)
const localContent = ref('')
const showSlashMenu = ref(false)
const slashMenuPosition = ref({ top: 0, left: 0 })
const selectedCommandIndex = ref(0)
const slashQuery = ref('')
const slashStartPosition = ref(0)

// Mermaid 图表计数器
let mermaidCounter = 0

// Markdown 解析器 - 增强版本
const md = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
    typographer: true,
    highlight: function (str: string, lang: string) {
        // Mermaid 图表特殊处理
        if (lang === 'mermaid') {
            const id = `mermaid-${mermaidCounter++}`
            return `<div class="mermaid-wrapper"><pre class="mermaid" id="${id}">${str}</pre></div>`
        }
        
        // 代码语法高亮
        if (lang && hljs.getLanguage(lang)) {
            try {
                return `<pre class="hljs"><code class="language-${lang}">${
                    hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
                }</code></pre>`
            } catch (__) {}
        }
        return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
    }
})

// 自定义 KaTeX 渲染规则
function renderKaTeX(tex: string, displayMode: boolean): string {
    try {
        return katex.renderToString(tex, {
            displayMode,
            throwOnError: false,
            errorColor: '#f56565',
            trust: true,
            strict: false
        })
    } catch (e) {
        return `<span class="katex-error">${tex}</span>`
    }
}

// 使用占位符保护公式，避免被 Markdown 解析器处理
const mathPlaceholders = new Map<string, string>()
let placeholderCounter = 0

function protectMath(text: string): string {
    mathPlaceholders.clear()
    placeholderCounter = 0
    
    // 块级公式 $$...$$（先处理块级，避免被行内匹配）
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
        const id = `%%MATH_BLOCK_${placeholderCounter++}%%`
        mathPlaceholders.set(id, `<div class="katex-block">${renderKaTeX(tex.trim(), true)}</div>`)
        return id
    })
    
    // 行内公式 $...$（不跨行）
    text = text.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
        const id = `%%MATH_INLINE_${placeholderCounter++}%%`
        mathPlaceholders.set(id, renderKaTeX(tex.trim(), false))
        return id
    })
    
    return text
}

function restoreMath(html: string): string {
    mathPlaceholders.forEach((replacement, placeholder) => {
        html = html.replace(placeholder, replacement)
    })
    return html
}

// 插件元信息
const pluginMeta = computed(() => pluginRegistry.getMeta(props.content.kind))
const isMarkdown = computed(() => props.content.kind === 'markdown')

const placeholder = computed(() => {
    if (isMarkdown.value) {
        return t('canvas.editor.markdownPlaceholder')
    }
    return t('canvas.editor.textPlaceholder')
})

const slashMenuStyle = computed(() => ({
    top: `${slashMenuPosition.value.top}px`,
    left: `${slashMenuPosition.value.left}px`
}))

// 正在编辑此节点的其他用户
const editingUsers = computed(() => {
    return awareness.otherUsers.value.filter(u => 
        u.selection?.includes(props.nodeId)
    )
})

// 远程用户在文本编辑器中的光标
const remoteCursors = computed<RemoteCursor[]>(() => {
    if (!textareaRef.value) return []
    
    return awareness.otherUsers.value
        .filter(u => u.textCursor?.nodeId === props.nodeId)
        .map(u => {
            const pos = u.textCursor!.position
            const selEnd = u.textCursor!.selectionEnd || pos
            const { top, left } = getCaretCoordinates(pos)
            
            return {
                clientId: u.clientId,
                name: u.user.name,
                color: u.user.color,
                position: pos,
                selectionEnd: selEnd,
                style: { top: `${top}px`, left: `${left}px` },
                selectionWidth: Math.abs(selEnd - pos)
            }
        })
})

// 计算光标在 textarea 中的坐标（简化版本）
function getCaretCoordinates(position: number): { top: number; left: number } {
    const textarea = textareaRef.value
    if (!textarea) return { top: 0, left: 0 }
    
    // 限制 position 在有效范围内，避免超出文本长度
    const safePos = Math.max(0, Math.min(position, textarea.value.length))
    const text = textarea.value.substring(0, safePos)
    const lines = text.split('\n')
    const lineIndex = Math.max(0, lines.length - 1)
    const currentLine = lines[lineIndex] ?? ''
    const charIndex = currentLine.length
    
    // 估算坐标（基于等宽字体）
    const lineHeight = 27 // 15px * 1.8 line-height
    const charWidth = 9 // 约等于 15px 字体的字符宽度
    
    return {
        top: lineIndex * lineHeight + 20, // 20px padding
        left: charIndex * charWidth + 20
    }
}

// 渲染 Markdown 预览（支持公式和代码高亮）
const renderedHtml = computed(() => {
    // 重置 mermaid 计数器
    mermaidCounter = 0
    
    if (!localContent.value) {
        return `<p class="placeholder">${t('canvas.editor.previewArea')}</p>`
    }
    
    // 1. 先用占位符保护数学公式
    let processed = protectMath(localContent.value)
    
    // 2. 渲染 Markdown
    let rawHtml = md.render(processed)
    
    // 3. 恢复数学公式
    rawHtml = restoreMath(rawHtml)
    
    // 4. 清理 HTML（允许 KaTeX 和 Mermaid 标签）
    return DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['span', 'svg', 'path', 'line', 'rect', 'circle', 'g', 'semantics', 
                   'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mroot', 
                   'msqrt', 'mtext', 'annotation', 'math', 'foreignObject', 
                   'polygon', 'polyline', 'ellipse', 'text', 'tspan', 'marker', 
                   'defs', 'clipPath', 'use', 'image', 'pattern', 'linearGradient',
                   'radialGradient', 'stop', 'title', 'desc'],
        ADD_ATTR: ['xmlns', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 
                   'stroke-width', 'transform', 'style', 'aria-hidden', 'focusable',
                   'role', 'encoding', 'id', 'class', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
                   'cx', 'cy', 'r', 'rx', 'ry', 'points', 'marker-end', 'marker-start',
                   'text-anchor', 'dominant-baseline', 'font-size', 'font-family',
                   'font-weight', 'fill-opacity', 'stroke-opacity', 'stroke-dasharray',
                   'clip-path', 'xlink:href', 'href', 'preserveAspectRatio'],
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
                       'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                       'ul', 'ol', 'li', 'blockquote', 'a', 'hr', 'span',
                       'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
                       'svg', 'path', 'line', 'rect', 'circle', 'g',
                       'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub',
                       'mfrac', 'mroot', 'msqrt', 'mtext', 'annotation', 'math',
                       'polygon', 'polyline', 'ellipse', 'text', 'tspan', 
                       'marker', 'defs', 'clipPath', 'use', 'foreignObject'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'id',
                       'xmlns', 'width', 'height', 'viewBox', 'd', 
                       'fill', 'stroke', 'stroke-width', 'transform',
                       'aria-hidden', 'focusable', 'role', 'encoding',
                       'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
                       'points', 'marker-end', 'text-anchor', 'dominant-baseline',
                       'font-size', 'font-family', 'font-weight']
    })
})

// 渲染 Mermaid 图表
async function renderMermaidDiagrams() {
    await nextTick()
    const preview = previewRef.value
    if (!preview) return
    
    const mermaidElements = preview.querySelectorAll('.mermaid')
    if (mermaidElements.length === 0) return
    
    try {
        // 使用 mermaid.run 渲染所有图表
        await mermaid.run({
            nodes: mermaidElements as NodeListOf<HTMLElement>,
            suppressErrors: true
        })
    } catch (e) {
        console.warn('[Mermaid] Render error:', e)
    }
}

// 监听内容变化，渲染 Mermaid
watch(renderedHtml, () => {
    renderMermaidDiagrams()
}, { flush: 'post' })

// 扩展的斜杠命令列表（使用多语言）
const slashCommands = computed<SlashCommand[]>(() => [
    // 标题
    { id: 'h1', icon: 'H1', label: t('canvas.editor.commands.h1'), description: t('canvas.editor.commands.h1Desc'), action: () => '# ' },
    { id: 'h2', icon: 'H2', label: t('canvas.editor.commands.h2'), description: t('canvas.editor.commands.h2Desc'), action: () => '## ' },
    { id: 'h3', icon: 'H3', label: t('canvas.editor.commands.h3'), description: t('canvas.editor.commands.h3Desc'), action: () => '### ' },
    
    // 列表
    { id: 'bullet', icon: '•', label: t('canvas.editor.commands.bullet'), description: t('canvas.editor.commands.bulletDesc'), action: () => '- ' },
    { id: 'numbered', icon: '1.', label: t('canvas.editor.commands.numbered'), description: t('canvas.editor.commands.numberedDesc'), action: () => '1. ' },
    { id: 'todo', icon: '☐', label: t('canvas.editor.commands.todo'), description: t('canvas.editor.commands.todoDesc'), action: () => '- [ ] ' },
    
    // 引用和分割
    { id: 'quote', icon: '"', label: t('canvas.editor.commands.quote'), description: t('canvas.editor.commands.quoteDesc'), action: () => '> ' },
    { id: 'divider', icon: '—', label: t('canvas.editor.commands.divider'), description: t('canvas.editor.commands.dividerDesc'), action: () => '\n---\n' },
    
    // 代码块（带语言选择）
    { id: 'code', icon: '<>', iconClass: 'code-icon', label: t('canvas.editor.commands.code'), description: t('canvas.editor.commands.codeDesc'), action: () => '```\n\n```' },
    { id: 'code-js', icon: 'JS', iconClass: 'lang-js', label: t('canvas.editor.commands.codeJs'), description: t('canvas.editor.commands.codeJsDesc'), action: () => '```javascript\n\n```' },
    { id: 'code-ts', icon: 'TS', iconClass: 'lang-ts', label: t('canvas.editor.commands.codeTs'), description: t('canvas.editor.commands.codeTsDesc'), action: () => '```typescript\n\n```' },
    { id: 'code-py', icon: 'PY', iconClass: 'lang-py', label: t('canvas.editor.commands.codePy'), description: t('canvas.editor.commands.codePyDesc'), action: () => '```python\n\n```' },
    { id: 'code-java', icon: '☕', label: t('canvas.editor.commands.codeJava'), description: t('canvas.editor.commands.codeJavaDesc'), action: () => '```java\n\n```' },
    { id: 'code-css', icon: '#', iconClass: 'lang-css', label: t('canvas.editor.commands.codeCss'), description: t('canvas.editor.commands.codeCssDesc'), action: () => '```css\n\n```' },
    { id: 'code-html', icon: '<>', iconClass: 'lang-html', label: t('canvas.editor.commands.codeHtml'), description: t('canvas.editor.commands.codeHtmlDesc'), action: () => '```html\n\n```' },
    { id: 'code-sql', icon: 'DB', label: t('canvas.editor.commands.codeSql'), description: t('canvas.editor.commands.codeSqlDesc'), action: () => '```sql\n\n```' },
    { id: 'code-sh', icon: '$', label: t('canvas.editor.commands.codeSh'), description: t('canvas.editor.commands.codeShDesc'), action: () => '```bash\n\n```' },
    { id: 'code-json', icon: '{}', label: t('canvas.editor.commands.codeJson'), description: t('canvas.editor.commands.codeJsonDesc'), action: () => '```json\n\n```' },
    
    // 数学公式
    { id: 'math', icon: '∑', iconClass: 'math-icon', label: t('canvas.editor.commands.math'), description: t('canvas.editor.commands.mathDesc'), shortcut: '$...$', action: () => '$E = mc^2$' },
    { id: 'math-block', icon: '∫', iconClass: 'math-icon', label: t('canvas.editor.commands.mathBlock'), description: t('canvas.editor.commands.mathBlockDesc'), shortcut: '$$...$$', action: () => '$$\n\\int_{a}^{b} f(x) dx\n$$' },
    
    // 图表（Mermaid）
    { id: 'mermaid-flow', icon: '📊', label: t('canvas.editor.commands.flowchart'), description: t('canvas.editor.commands.flowchartDesc'), action: () => `\`\`\`mermaid\nflowchart TD\n    A[${t('canvas.editor.examples.start')}] --> B{${t('canvas.editor.examples.decision')}}\n    B -->|${t('canvas.editor.examples.yes')}| C[${t('canvas.editor.examples.execute')}]\n    B -->|${t('canvas.editor.examples.no')}| D[${t('canvas.editor.examples.end')}]\n\`\`\`` },
    { id: 'mermaid-seq', icon: '📈', label: t('canvas.editor.commands.sequence'), description: t('canvas.editor.commands.sequenceDesc'), action: () => '```mermaid\nsequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi\n```' },
    { id: 'mermaid-mindmap', icon: '🧠', label: t('canvas.editor.commands.mindmap'), description: t('canvas.editor.commands.mindmapDesc'), action: () => `\`\`\`mermaid\nmindmap\n  root((${t('canvas.editor.examples.topic')}))\n    ${t('canvas.editor.examples.branch1')}\n      ${t('canvas.editor.examples.subitemA')}\n      ${t('canvas.editor.examples.subitemB')}\n    ${t('canvas.editor.examples.branch2')}\n      ${t('canvas.editor.examples.subitemC')}\n\`\`\`` },
    
    // 文本格式
    { id: 'bold', icon: 'B', iconClass: 'bold-icon', label: t('canvas.editor.commands.bold'), description: t('canvas.editor.commands.boldDesc'), action: () => `**${t('canvas.editor.examples.bold')}**` },
    { id: 'italic', icon: 'I', iconClass: 'italic-icon', label: t('canvas.editor.commands.italic'), description: t('canvas.editor.commands.italicDesc'), action: () => `*${t('canvas.editor.examples.italic')}*` },
    { id: 'strike', icon: 'S', iconClass: 'strike-icon', label: t('canvas.editor.commands.strike'), description: t('canvas.editor.commands.strikeDesc'), action: () => `~~${t('canvas.editor.examples.strikethrough')}~~` },
    { id: 'link', icon: '🔗', label: t('canvas.editor.commands.link'), description: t('canvas.editor.commands.linkDesc'), action: () => `[${t('canvas.editor.examples.text')}](${t('canvas.editor.examples.url')})` },
    { id: 'image', icon: '🖼️', label: t('canvas.editor.commands.image'), description: t('canvas.editor.commands.imageDesc'), action: () => `![${t('canvas.editor.examples.description')}](${t('canvas.editor.examples.url')})` },
    
    // 表格
    { id: 'table', icon: '▦', label: t('canvas.editor.commands.table'), description: t('canvas.editor.commands.tableDesc'), action: () => `| ${t('canvas.editor.examples.col1')} | ${t('canvas.editor.examples.col2')} | ${t('canvas.editor.examples.col3')} |\n| --- | --- | --- |\n| ${t('canvas.editor.examples.content')} | ${t('canvas.editor.examples.content')} | ${t('canvas.editor.examples.content')} |` },
])

// 过滤后的命令 - 默认显示所有命令
const filteredCommands = computed(() => {
    if (!slashQuery.value) return slashCommands.value // 显示所有命令
    const query = slashQuery.value.toLowerCase()
    return slashCommands.value.filter(cmd => 
        cmd.label.toLowerCase().includes(query) ||
        cmd.id.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query)
    )
})

// 初始化
onMounted(() => {
    localContent.value = props.content.data || ''
    nextTick(() => {
        overlayRef.value?.focus()
        textareaRef.value?.focus()
    })
    
    // 添加 KaTeX CSS
    if (!document.querySelector('link[href*="katex"]')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
        document.head.appendChild(link)
    }
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

function handleSelection() {
    handleCursorChange()
}

function handleCursorChange() {
    const textarea = textareaRef.value
    if (!textarea || !awareness.updateTextCursor) return
    
    awareness.updateTextCursor(
        props.nodeId,
        textarea.selectionStart,
        textarea.selectionEnd
    )
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
                // 计算菜单位置
                const rect = textarea.getBoundingClientRect()
                slashMenuPosition.value = { 
                    top: Math.min(100, rect.height - 350), 
                    left: 20 
                }
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
            scrollCommandIntoView()
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            selectedCommandIndex.value = Math.max(selectedCommandIndex.value - 1, 0)
            scrollCommandIntoView()
        } else if (e.key === 'Enter' || e.key === 'Tab') {
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

function scrollCommandIntoView() {
    nextTick(() => {
        const menu = slashMenuRef.value
        if (!menu) return
        const activeItem = menu.querySelector('.slash-menu-item.active')
        activeItem?.scrollIntoView({ block: 'nearest' })
    })
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
        // 智能光标定位：对于代码块，定位到中间
        let newPos = before.length + insertText.length
        if (insertText.includes('```') && insertText.endsWith('```')) {
            newPos = before.length + insertText.indexOf('\n') + 1
        } else if (insertText.includes('$$') && insertText.endsWith('$$')) {
            newPos = before.length + insertText.indexOf('\n') + 1
        }
        textarea.setSelectionRange(newPos, newPos)
        textarea.focus()
    })
}

function handleClose() {
    // 清除文本光标
    if (awareness.updateTextCursor) {
        awareness.updateTextCursor('', -1, -1)
    }
    emit('close')
}

// 组件卸载时清理
onUnmounted(() => {
    if (awareness.updateTextCursor) {
        awareness.updateTextCursor('', -1, -1)
    }
})
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

/* 协作用户头像 */
.collab-users {
    display: flex;
    align-items: center;
    margin-left: 16px;
    padding-left: 16px;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.collab-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: white;
    margin-left: -8px;
    border: 2px solid #1a1a1a;
    cursor: default;
}

.collab-avatar:first-child {
    margin-left: 0;
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

.textarea-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
}

.editor-textarea {
    width: 100%;
    height: 100%;
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

/* 远程用户光标 */
.remote-cursor {
    position: absolute;
    pointer-events: none;
    z-index: 10;
}

.remote-cursor-caret {
    width: 2px;
    height: 20px;
    animation: cursor-blink 1s ease-in-out infinite;
}

@keyframes cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.remote-cursor-label {
    position: absolute;
    top: -18px;
    left: 0;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 500;
    color: white;
    white-space: nowrap;
}

.remote-selection {
    position: absolute;
    top: 0;
    left: 2px;
    height: 20px;
    border-radius: 2px;
}

.preview-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    color: rgba(255, 255, 255, 0.9);
    font-size: 15px;
    line-height: 1.7;
}

/* Markdown 预览样式 */
.preview-content :deep(h1) { font-size: 1.8em; margin: 0.5em 0; font-weight: 600; }
.preview-content :deep(h2) { font-size: 1.5em; margin: 0.5em 0; font-weight: 600; }
.preview-content :deep(h3) { font-size: 1.2em; margin: 0.5em 0; font-weight: 600; }
.preview-content :deep(p) { margin: 0.8em 0; }
.preview-content :deep(code) { 
    background: rgba(255, 255, 255, 0.1); 
    padding: 2px 6px; 
    border-radius: 4px; 
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9em;
}
.preview-content :deep(pre) {
    background: rgba(0, 0, 0, 0.4);
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1em 0;
}
.preview-content :deep(pre code) {
    background: transparent;
    padding: 0;
    font-size: 13px;
    line-height: 1.5;
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
.preview-content :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
}
.preview-content :deep(th), .preview-content :deep(td) {
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 8px 12px;
    text-align: left;
}
.preview-content :deep(th) {
    background: rgba(255, 255, 255, 0.05);
    font-weight: 600;
}
.preview-content .placeholder {
    color: rgba(255, 255, 255, 0.3);
    font-style: italic;
}

/* KaTeX 数学公式样式 */
.preview-content :deep(.katex-block) {
    display: flex;
    justify-content: center;
    margin: 1.5em 0;
    padding: 1em;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    overflow-x: auto;
}
.preview-content :deep(.katex) {
    font-size: 1.1em;
}
.preview-content :deep(.katex-error) {
    color: #f56565;
    background: rgba(245, 101, 101, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
}

/* highlight.js 代码高亮样式 */
.preview-content :deep(.hljs) {
    background: transparent !important;
}
.preview-content :deep(.hljs-keyword) { color: #c678dd; }
.preview-content :deep(.hljs-string) { color: #98c379; }
.preview-content :deep(.hljs-number) { color: #d19a66; }
.preview-content :deep(.hljs-function) { color: #61afef; }
.preview-content :deep(.hljs-title) { color: #61afef; }
.preview-content :deep(.hljs-params) { color: #abb2bf; }
.preview-content :deep(.hljs-comment) { color: #5c6370; font-style: italic; }
.preview-content :deep(.hljs-doctag) { color: #c678dd; }
.preview-content :deep(.hljs-meta) { color: #e06c75; }
.preview-content :deep(.hljs-attr) { color: #d19a66; }
.preview-content :deep(.hljs-attribute) { color: #98c379; }
.preview-content :deep(.hljs-builtin-name) { color: #e06c75; }
.preview-content :deep(.hljs-name) { color: #e06c75; }
.preview-content :deep(.hljs-tag) { color: #e06c75; }
.preview-content :deep(.hljs-variable) { color: #e06c75; }
.preview-content :deep(.hljs-template-variable) { color: #e06c75; }
.preview-content :deep(.hljs-selector-tag) { color: #e06c75; }
.preview-content :deep(.hljs-selector-class) { color: #d19a66; }
.preview-content :deep(.hljs-selector-id) { color: #61afef; }
.preview-content :deep(.hljs-literal) { color: #56b6c2; }
.preview-content :deep(.hljs-type) { color: #56b6c2; }
.preview-content :deep(.hljs-symbol) { color: #56b6c2; }
.preview-content :deep(.hljs-bullet) { color: #56b6c2; }
.preview-content :deep(.hljs-link) { color: #56b6c2; text-decoration: underline; }
.preview-content :deep(.hljs-deletion) { color: #e06c75; background: rgba(224, 108, 117, 0.1); }
.preview-content :deep(.hljs-addition) { color: #98c379; background: rgba(152, 195, 121, 0.1); }

/* Mermaid 图表样式 */
.preview-content :deep(.mermaid-wrapper) {
    margin: 1.5em 0;
    padding: 1em;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    overflow-x: auto;
}
.preview-content :deep(.mermaid) {
    display: flex;
    justify-content: center;
    background: transparent !important;
}
.preview-content :deep(.mermaid svg) {
    max-width: 100%;
    height: auto;
}
/* Mermaid 文字颜色修正（暗色主题） */
.preview-content :deep(.mermaid .nodeLabel),
.preview-content :deep(.mermaid .edgeLabel),
.preview-content :deep(.mermaid .label),
.preview-content :deep(.mermaid text) {
    fill: rgba(255, 255, 255, 0.9) !important;
    color: rgba(255, 255, 255, 0.9) !important;
}
.preview-content :deep(.mermaid .node rect),
.preview-content :deep(.mermaid .node circle),
.preview-content :deep(.mermaid .node polygon) {
    fill: rgba(255, 255, 255, 0.1) !important;
    stroke: rgba(255, 255, 255, 0.3) !important;
}
.preview-content :deep(.mermaid .edgePath path) {
    stroke: rgba(255, 255, 255, 0.5) !important;
}
.preview-content :deep(.mermaid .arrowheadPath) {
    fill: rgba(255, 255, 255, 0.5) !important;
}

/* 斜杠命令菜单 */
.slash-menu {
    position: absolute;
    background: #2a2a2a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    min-width: 280px;
    max-width: 320px;
    max-height: 480px;
    overflow: hidden;
    z-index: 100;
    display: flex;
    flex-direction: column;
}

.slash-menu-header {
    padding: 10px 14px;
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
}

.slash-menu-scroll {
    overflow-y: auto;
    flex: 1;
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
    flex-shrink: 0;
}

/* 命令图标特殊样式 */
.cmd-icon.code-icon { color: #61afef; }
.cmd-icon.lang-js { background: #f7df1e20; color: #f7df1e; }
.cmd-icon.lang-ts { background: #3178c620; color: #3178c6; }
.cmd-icon.lang-py { background: #3776ab20; color: #3776ab; }
.cmd-icon.lang-css { background: #264de420; color: #264de4; }
.cmd-icon.lang-html { background: #e34f2620; color: #e34f26; }
.cmd-icon.math-icon { background: #9f7aea20; color: #9f7aea; }
.cmd-icon.bold-icon { font-weight: 800; }
.cmd-icon.italic-icon { font-style: italic; }
.cmd-icon.strike-icon { text-decoration: line-through; }

.cmd-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
}

.cmd-label {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.9);
}

.cmd-desc {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
}

.cmd-shortcut {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.3);
    font-family: 'JetBrains Mono', monospace;
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
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

.footer-right {
    display: flex;
    align-items: center;
    gap: 16px;
}

.collab-indicator {
    font-size: 12px;
    color: #48bb78;
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

/* ==================== 深浅色主题适配 ==================== */
/* 浅色主题 */
html[data-theme='light'] .editor-overlay {
    background: rgba(0, 0, 0, 0.5);
}

html[data-theme='light'] .editor-container {
    background: #ffffff;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.2);
}

html[data-theme='light'] .editor-header {
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(0, 0, 0, 0.02);
}

html[data-theme='light'] .type-label {
    color: rgba(0, 0, 0, 0.9);
}

html[data-theme='light'] .collab-users {
    border-left: 1px solid rgba(0, 0, 0, 0.1);
}

html[data-theme='light'] .collab-avatar {
    border-color: #ffffff;
}

html[data-theme='light'] .close-btn {
    background: rgba(0, 0, 0, 0.08);
    color: rgba(0, 0, 0, 0.6);
}

html[data-theme='light'] .close-btn:hover {
    background: rgba(0, 0, 0, 0.12);
    color: rgba(0, 0, 0, 0.9);
}

html[data-theme='light'] .editor-body.split-view {
    background: rgba(0, 0, 0, 0.08);
}

html[data-theme='light'] .edit-pane,
html[data-theme='light'] .preview-pane {
    background: #ffffff;
}

html[data-theme='light'] .pane-header {
    color: rgba(0, 0, 0, 0.5);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

html[data-theme='light'] .editor-textarea {
    color: rgba(0, 0, 0, 0.9);
    caret-color: #3b82f6;
}

html[data-theme='light'] .editor-textarea::placeholder {
    color: rgba(0, 0, 0, 0.3);
}

html[data-theme='light'] .preview-content {
    color: rgba(0, 0, 0, 0.9);
}

html[data-theme='light'] .preview-content :deep(code) {
    background: rgba(0, 0, 0, 0.06);
}

html[data-theme='light'] .preview-content :deep(pre) {
    background: #f5f5f5;
}

html[data-theme='light'] .preview-content :deep(blockquote) {
    border-left-color: rgba(0, 0, 0, 0.2);
    color: rgba(0, 0, 0, 0.7);
}

html[data-theme='light'] .preview-content :deep(hr) {
    border-top-color: rgba(0, 0, 0, 0.1);
}

html[data-theme='light'] .preview-content :deep(th),
html[data-theme='light'] .preview-content :deep(td) {
    border-color: rgba(0, 0, 0, 0.1);
}

html[data-theme='light'] .preview-content :deep(th) {
    background: rgba(0, 0, 0, 0.04);
}

/* 斜杠菜单浅色主题 */
html[data-theme='light'] .slash-menu {
    background: #ffffff;
    border-color: rgba(0, 0, 0, 0.15);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

html[data-theme='light'] .slash-menu-header {
    color: rgba(0, 0, 0, 0.5);
    border-bottom-color: rgba(0, 0, 0, 0.1);
}

html[data-theme='light'] .slash-menu-item:hover,
html[data-theme='light'] .slash-menu-item.active {
    background: rgba(0, 0, 0, 0.06);
}

html[data-theme='light'] .cmd-icon {
    background: rgba(0, 0, 0, 0.06);
    color: rgba(0, 0, 0, 0.7);
}

html[data-theme='light'] .cmd-label {
    color: rgba(0, 0, 0, 0.9);
}

html[data-theme='light'] .cmd-desc {
    color: rgba(0, 0, 0, 0.5);
}

html[data-theme='light'] .cmd-shortcut {
    color: rgba(0, 0, 0, 0.4);
    background: rgba(0, 0, 0, 0.04);
}

html[data-theme='light'] .slash-menu-empty {
    color: rgba(0, 0, 0, 0.5);
}

/* 底部状态栏浅色主题 */
html[data-theme='light'] .editor-footer {
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(0, 0, 0, 0.02);
}

html[data-theme='light'] .footer-hint {
    color: rgba(0, 0, 0, 0.5);
}

html[data-theme='light'] .footer-hint kbd {
    background: rgba(0, 0, 0, 0.08);
}

html[data-theme='light'] .char-count {
    color: rgba(0, 0, 0, 0.5);
}

/* 预览区 hljs 浅色主题 */
html[data-theme='light'] .preview-content :deep(.hljs-keyword) { color: #a626a4; }
html[data-theme='light'] .preview-content :deep(.hljs-string) { color: #50a14f; }
html[data-theme='light'] .preview-content :deep(.hljs-number) { color: #986801; }
html[data-theme='light'] .preview-content :deep(.hljs-function) { color: #4078f2; }
html[data-theme='light'] .preview-content :deep(.hljs-title) { color: #4078f2; }
html[data-theme='light'] .preview-content :deep(.hljs-params) { color: #383a42; }
html[data-theme='light'] .preview-content :deep(.hljs-comment) { color: #a0a1a7; font-style: italic; }

/* KaTeX 浅色主题 */
html[data-theme='light'] .preview-content :deep(.katex-block) {
    background: rgba(0, 0, 0, 0.03);
}

html[data-theme='light'] .preview-content :deep(.katex-error) {
    color: #e45649;
    background: rgba(228, 86, 73, 0.1);
}

/* Mermaid 浅色主题 */
html[data-theme='light'] .preview-content :deep(.mermaid .nodeLabel),
html[data-theme='light'] .preview-content :deep(.mermaid .edgeLabel),
html[data-theme='light'] .preview-content :deep(.mermaid .label),
html[data-theme='light'] .preview-content :deep(.mermaid text) {
    fill: rgba(0, 0, 0, 0.9) !important;
    color: rgba(0, 0, 0, 0.9) !important;
}

html[data-theme='light'] .preview-content :deep(.mermaid .node rect),
html[data-theme='light'] .preview-content :deep(.mermaid .node circle),
html[data-theme='light'] .preview-content :deep(.mermaid .node polygon) {
    fill: rgba(0, 0, 0, 0.05) !important;
    stroke: rgba(0, 0, 0, 0.2) !important;
}

/* ==================== 优化滚动条样式 ==================== */
/* 斜杠菜单滚动条 */
.slash-menu-scroll::-webkit-scrollbar {
    width: 6px;
}

.slash-menu-scroll::-webkit-scrollbar-track {
    background: transparent;
}

.slash-menu-scroll::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
}

.slash-menu-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
}

html[data-theme='light'] .slash-menu-scroll::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
}

html[data-theme='light'] .slash-menu-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.25);
}

/* 预览区滚动条 */
.preview-content::-webkit-scrollbar {
    width: 8px;
}

.preview-content::-webkit-scrollbar-track {
    background: transparent;
}

.preview-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
}

.preview-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
}

html[data-theme='light'] .preview-content::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
}

html[data-theme='light'] .preview-content::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.25);
}

/* 编辑器文本区滚动条 */
.editor-textarea::-webkit-scrollbar {
    width: 8px;
}

.editor-textarea::-webkit-scrollbar-track {
    background: transparent;
}

.editor-textarea::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
}

.editor-textarea::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
}

html[data-theme='light'] .editor-textarea::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
}

html[data-theme='light'] .editor-textarea::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.25);
}
</style>

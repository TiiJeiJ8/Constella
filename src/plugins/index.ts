/**
 * 插件系统入口
 * 管理节点类型插件的注册和获取
 */
import { markRaw, type Component } from 'vue'

/**
 * 节点内容类型
 */
export type ContentKind = 'blank' | 'text' | 'markdown' | 'image' | 'link-preview' | 'embed'

/**
 * 节点显示模式
 */
export type DisplayMode = 'full' | 'card'

/**
 * 节点内容结构
 */
export interface NodeContent {
    kind: ContentKind
    data: string
    displayMode?: DisplayMode  // 显示模式：全文或卡片
}

/**
 * 插件元信息
 */
export interface PluginMeta {
    kind: ContentKind
    label: string
    icon: string
    description: string
    editable: boolean           // 是否支持编辑
    supportsCardMode: boolean   // 是否支持卡片模式
}

/**
 * 渲染器 Props 接口
 */
export interface RendererProps {
    content: NodeContent
    width: number
    height: number
    displayMode?: DisplayMode
    scale?: number              // 画布缩放比例
}

/**
 * 编辑器 Props 接口
 */
export interface EditorProps {
    content: NodeContent
    onUpdate: (data: string) => void
    onClose: () => void
}

/**
 * 插件定义
 */
export interface NodePlugin {
    meta: PluginMeta
    renderer: Component<RendererProps>       // 画布渲染组件
    editor?: Component<EditorProps>          // 编辑器组件（可选）
}

/**
 * 所有内容类型的元数据
 */
export const pluginsMeta: PluginMeta[] = [
    { kind: 'blank', label: '空白', icon: '⬜', description: '空白占位节点', editable: false, supportsCardMode: false },
    { kind: 'text', label: '文本', icon: '📝', description: '纯文本内容', editable: true, supportsCardMode: true },
    { kind: 'markdown', label: 'Markdown', icon: '📄', description: 'Markdown 富文本', editable: true, supportsCardMode: true },
    { kind: 'image', label: '图片', icon: '🖼️', description: '图片内容', editable: false, supportsCardMode: false },
    { kind: 'link-preview', label: '链接', icon: '🔗', description: '链接预览卡片', editable: true, supportsCardMode: false },
    { kind: 'embed', label: '嵌入', icon: '📦', description: '嵌入外部内容', editable: false, supportsCardMode: false },
]

/**
 * 插件注册表
 */
class PluginRegistry {
    private plugins: Map<ContentKind, NodePlugin> = new Map()
    private fallbackPlugin: NodePlugin | null = null

    /**
     * 注册插件
     */
    register(plugin: NodePlugin): void {
        this.plugins.set(plugin.meta.kind, {
            ...plugin,
            renderer: markRaw(plugin.renderer),
            editor: plugin.editor ? markRaw(plugin.editor) : undefined
        })
        console.log(`[PluginRegistry] Registered: ${plugin.meta.kind}`)
    }

    /**
     * 设置回退插件
     */
    setFallback(plugin: NodePlugin): void {
        this.fallbackPlugin = {
            ...plugin,
            renderer: markRaw(plugin.renderer),
            editor: plugin.editor ? markRaw(plugin.editor) : undefined
        }
    }

    /**
     * 获取插件
     */
    get(kind: ContentKind): NodePlugin | null {
        return this.plugins.get(kind) || this.fallbackPlugin
    }

    /**
     * 获取渲染器
     */
    getRenderer(kind: ContentKind): Component<RendererProps> | null {
        const plugin = this.get(kind)
        return plugin?.renderer || null
    }

    /**
     * 获取编辑器
     */
    getEditor(kind: ContentKind): Component<EditorProps> | null {
        const plugin = this.get(kind)
        return plugin?.editor || null
    }

    /**
     * 获取插件元信息
     */
    getMeta(kind: ContentKind): PluginMeta | null {
        const plugin = this.get(kind)
        return plugin?.meta || null
    }

    /**
     * 检查是否有指定类型的插件
     */
    has(kind: ContentKind): boolean {
        return this.plugins.has(kind)
    }

    /**
     * 获取所有已注册的内容类型
     */
    getRegisteredKinds(): ContentKind[] {
        return Array.from(this.plugins.keys())
    }

    /**
     * 获取所有插件元信息
     */
    getAllMeta(): PluginMeta[] {
        return Array.from(this.plugins.values()).map(p => p.meta)
    }
}

// 单例导出
export const pluginRegistry = new PluginRegistry()

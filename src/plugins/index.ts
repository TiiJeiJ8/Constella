/**
 * 插件系统入口
 * 管理节点类型插件的注册和获取
 */
import { markRaw, type Component } from 'vue'

/**
 * 节点内容类型 - 支持动态扩展
 */
export type ContentKind = string

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
    metadata?: Record<string, any> // 可选的扩展元数据
}

/**
 * 插件元信息
 */
export interface PluginMeta {
    kind: string  // 使用 string 以支持动态插件类型
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
 * 获取所有插件的元数据
 * 动态从注册表获取（在 registerPlugins() 之后调用）
 */
export function getPluginsMeta(): PluginMeta[] {
    return pluginRegistry.getAllMeta()
}

/**
 * 插件注册表
 */
class PluginRegistry {
    private plugins: Map<string, NodePlugin> = new Map()
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
    getRegisteredKinds(): string[] {
        return Array.from(this.plugins.keys())
    }

    /**
     * 获取所有插件元信息
     */
    getAllMeta(): PluginMeta[] {
        return Array.from(this.plugins.values()).map(p => p.meta)
    }

    /**
     * 清空所有已注册的插件（用于测试或重新加载）
     */
    clear(): void {
        this.plugins.clear()
        this.fallbackPlugin = null
    }
}

// 单例导出
export const pluginRegistry = new PluginRegistry()

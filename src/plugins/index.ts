/**
 * 插件系统入口
 * 管理节点类型插件的注册和获取
 */
import { markRaw, ref, type Component } from 'vue'
import type { DevelopmentPluginRecord, InstalledPluginRecord, PluginDiagnosticRecord, PluginDiagnosticSource } from './package'

/**
 * 节点内容类型 - 支持动态扩展
 */
export type ContentKind = string

/**
 * 节点显示模式
 */
export type DisplayMode = 'full' | 'card'

/**
 * 插件自带的 i18n 消息
 * key 为 locale，例如 zh-CN / en-US
 */
export type PluginI18nMessages = Record<string, Record<string, any>>

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
    supportsFontSizeControl?: boolean // 是否支持在属性面板调整显示字号
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
    onDblClick?: (content: NodeContent) => boolean  // 自定义双击处理，返回 true 时不再打开编辑器
}

/**
 * 获取所有插件的元数据
 * 动态从注册表获取（在 registerPlugins() 之后调用）
 */
export function getPluginsMeta(): PluginMeta[] {
    return pluginRegistry.getAllMeta()
}

export const pluginCatalogVersion = ref(0)

/**
 * 插件注册表
 */
class PluginRegistry {
    private plugins: Map<string, NodePlugin> = new Map()
    private fallbackPlugin: NodePlugin | null = null
    private installedPlugins: InstalledPluginRecord[] = []
    private developmentPlugins: DevelopmentPluginRecord[] = []
    private builtinKinds: Set<string> = new Set()
    private pluginDiagnostics: PluginDiagnosticRecord[] = []

    /**
     * 注册插件
     */
    register(plugin: NodePlugin): void {
        this.plugins.set(plugin.meta.kind, {
            ...plugin,
            renderer: markRaw(plugin.renderer),
            editor: plugin.editor ? markRaw(plugin.editor) : undefined
        })
        pluginCatalogVersion.value += 1
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
        pluginCatalogVersion.value += 1
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

    setBuiltinKinds(kinds: string[]): void {
        this.builtinKinds = new Set(kinds)
        pluginCatalogVersion.value += 1
    }

    getBuiltinMeta(): PluginMeta[] {
        return Array.from(this.plugins.values())
            .filter(plugin => this.builtinKinds.has(plugin.meta.kind))
            .map(plugin => plugin.meta)
    }

    /**
     * 缓存已安装插件目录信息，供后续市集/运行时加载使用
     */
    setInstalledPlugins(plugins: InstalledPluginRecord[]): void {
        this.installedPlugins = [...plugins]
        pluginCatalogVersion.value += 1
    }

    /**
     * 获取已安装插件目录信息
     */
    getInstalledPlugins(): InstalledPluginRecord[] {
        return [...this.installedPlugins]
    }

    setDevelopmentPlugins(plugins: DevelopmentPluginRecord[]): void {
        this.developmentPlugins = [...plugins]
        pluginCatalogVersion.value += 1
    }

    getDevelopmentPlugins(): DevelopmentPluginRecord[] {
        return [...this.developmentPlugins]
    }

    setPluginDiagnostics(source: PluginDiagnosticSource, diagnostics: PluginDiagnosticRecord[]): void {
        this.pluginDiagnostics = [
            ...this.pluginDiagnostics.filter(item => item.source !== source),
            ...diagnostics
        ].sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        pluginCatalogVersion.value += 1
    }

    reportPluginDiagnostic(diagnostic: PluginDiagnosticRecord): void {
        const existingIndex = this.pluginDiagnostics.findIndex(item => item.id === diagnostic.id)
        if (existingIndex >= 0) {
            this.pluginDiagnostics.splice(existingIndex, 1, diagnostic)
        } else {
            this.pluginDiagnostics.unshift(diagnostic)
        }
        this.pluginDiagnostics.sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        pluginCatalogVersion.value += 1
    }

    clearPluginDiagnostics(source?: PluginDiagnosticSource): void {
        this.pluginDiagnostics = source
            ? this.pluginDiagnostics.filter(item => item.source !== source)
            : []
        pluginCatalogVersion.value += 1
    }

    getPluginDiagnostics(source?: PluginDiagnosticSource): PluginDiagnosticRecord[] {
        return source
            ? this.pluginDiagnostics.filter(item => item.source === source)
            : [...this.pluginDiagnostics]
    }

    /**
     * 清空所有已注册的插件（用于测试或重新加载）
     */
    clear(): void {
        this.plugins.clear()
        this.fallbackPlugin = null
        this.installedPlugins = []
        this.developmentPlugins = []
        this.builtinKinds.clear()
        this.pluginDiagnostics = []
        pluginCatalogVersion.value += 1
    }
}

// 单例导出
export const pluginRegistry = new PluginRegistry()

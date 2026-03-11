/**
 * Hyperlink 节点插件
 */
import type { NodePlugin, PluginI18nMessages } from '../index'
import HyperlinkRenderer from './HyperlinkRenderer.vue'
import HyperlinkEditor from './HyperlinkEditor.vue'
import { manifest } from './manifest'

export const pluginI18n: PluginI18nMessages = {
    'zh-CN': {
        canvas: {
            nodeTypes: {
                hyperlink: '超链接'
            },
            nodeTypeDesc: {
                hyperlink: '超链接节点'
            }
        },
        plugins: {
            hyperlink: {
                editor: {
                    title: '超链接',
                    urlLabel: '链接地址',
                    titleLabel: '显示标题（可选）',
                    urlPlaceholder: 'https://example.com',
                    titlePlaceholder: '留空则自动使用域名',
                    open: '打开链接',
                    openTitle: '在浏览器中打开',
                    cancel: '取消',
                    save: '保存',
                    invalidUrl: '请输入有效的网址'
                },
                renderer: {
                    emptyHint: '双击编辑链接',
                    defaultTitle: '超链接'
                }
            }
        }
    },
    'en-US': {
        canvas: {
            nodeTypes: {
                hyperlink: 'Hyperlink'
            },
            nodeTypeDesc: {
                hyperlink: 'Hyperlink node'
            }
        },
        plugins: {
            hyperlink: {
                editor: {
                    title: 'Hyperlink',
                    urlLabel: 'URL',
                    titleLabel: 'Display title (optional)',
                    urlPlaceholder: 'https://example.com',
                    titlePlaceholder: 'Leave empty to use the domain automatically',
                    open: 'Open link',
                    openTitle: 'Open in browser',
                    cancel: 'Cancel',
                    save: 'Save',
                    invalidUrl: 'Please enter a valid URL'
                },
                renderer: {
                    emptyHint: 'Double-click to edit the link',
                    defaultTitle: 'Hyperlink'
                }
            }
        }
    }
}

export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: HyperlinkRenderer,
    editor: HyperlinkEditor
    // 双击直接进编辑器（编辑器内有「在浏览器中打开」按钮）
}

export const hyperlinkPlugin = pluginPlugin

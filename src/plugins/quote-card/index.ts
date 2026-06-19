import type { NodePlugin, PluginI18nMessages } from '../index'
import QuoteCardRenderer from './QuoteCardRenderer.vue'
import QuoteCardEditor from './QuoteCardEditor.vue'
import { manifest } from './manifest'

export const pluginI18n: PluginI18nMessages = {
    'zh-CN': {
        canvas: {
            nodeTypes: {
                'quote-card': '引言卡片'
            },
            nodeTypeDesc: {
                'quote-card': '以卡片形式展示一段引言与作者'
            }
        },
        plugins: {
            quoteCard: {
                editor: {
                    title: '引言卡片',
                    quoteLabel: '引言',
                    quotePlaceholder: '输入引言内容...',
                    authorLabel: '作者',
                    authorPlaceholder: '匿名',
                    cancel: '取消',
                    save: '保存',
                    close: '关闭'
                },
                renderer: {
                    emptyQuote: '在这里写下一段引言',
                    anonymous: '匿名'
                }
            }
        }
    },
    'en-US': {
        canvas: {
            nodeTypes: {
                'quote-card': 'Quote Card'
            },
            nodeTypeDesc: {
                'quote-card': 'Display a quote with an author footer'
            }
        },
        plugins: {
            quoteCard: {
                editor: {
                    title: 'Quote Card',
                    quoteLabel: 'Quote',
                    quotePlaceholder: 'Type your quote...',
                    authorLabel: 'Author',
                    authorPlaceholder: 'Anonymous',
                    cancel: 'Cancel',
                    save: 'Save',
                    close: 'Close'
                },
                renderer: {
                    emptyQuote: 'Write a short quote here.',
                    anonymous: 'Anonymous'
                }
            }
        }
    }
}

export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: QuoteCardRenderer,
    editor: QuoteCardEditor as unknown as NodePlugin['editor']
}

export const quoteCardPlugin = pluginPlugin

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
        }
    }
}

export const pluginPlugin: NodePlugin = {
    meta: manifest,
    renderer: QuoteCardRenderer,
    editor: QuoteCardEditor as unknown as NodePlugin['editor']
}

export const quoteCardPlugin = pluginPlugin

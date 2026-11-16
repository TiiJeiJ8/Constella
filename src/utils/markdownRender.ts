import documentExportCss from '@/styles/export/document.css?inline'
import { katexExportCss } from './exportResources'
import { buildMermaidPrintScript } from './exportMermaid'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import katex from 'katex'
import mermaid from 'mermaid'
import type { MermaidConfig } from 'mermaid'

type MermaidThemeMode = 'light' | 'dark'
type PdfOrientation = 'portrait' | 'landscape'
type PdfMermaidOversize = 'scale' | 'page-break'
type PdfMermaidScaleMode = 'fit-page' | 'fit-width'
type PdfMermaidDensity = 'standard' | 'compact'

const markdownUtils = new MarkdownIt().utils
const mathPlaceholders = new Map<string, string>()
const codePlaceholders = new Map<string, string>()

let placeholderCounter = 0
let mermaidCounter = 0
let markdownParser: MarkdownIt | null = null

function getMermaidThemeVariables(mode: MermaidThemeMode) {
    if (mode === 'light') {
        return {
            primaryColor: '#e8eef9',
            primaryTextColor: '#172033',
            primaryBorderColor: '#9bb2d1',
            lineColor: '#7a93b8',
            secondaryColor: '#dfe8f5',
            tertiaryColor: '#f3f6fb',
            background: '#ffffff',
            mainBkg: '#e8eef9',
            secondBkg: '#dfe8f5',
            tertiaryBkg: '#f3f6fb',
            textColor: '#172033',
            nodeBorder: '#9bb2d1',
            clusterBkg: '#f5f7fb',
            clusterBorder: '#c8d4e8',
            edgeLabelBackground: '#ffffff',
            cScale0: '#d8e7ff',
            cScale1: '#dff4ea',
            cScale2: '#fff1d6',
            cScale3: '#f4e3ff',
            cScaleLabel0: '#172033',
            cScaleLabel1: '',
            cScaleLabel2: '#4b3200',
            cScaleLabel3: '#3d1d59'
        }
    }

    return {
        primaryColor: '#1e293b',
        primaryTextColor: '#e5eefc',
        primaryBorderColor: '#5f7ba6',
        lineColor: '#8aa4d0',
        secondaryColor: '#162132',
        tertiaryColor: '#111a28',
        background: '#17181c',
        mainBkg: '#1e293b',
        secondBkg: '#162132',
        tertiaryBkg: '#111a28',
        textColor: '#e5eefc',
        nodeBorder: '#5f7ba6',
        clusterBkg: '#111a28',
        clusterBorder: '#334155',
        edgeLabelBackground: '#17181c',
        cScale0: '#26476b',
        cScale1: '#173226',
        cScale2: '#6a4f1f',
        cScale3: '#4b2e67',
        cScaleLabel0: '#eff6ff',
        cScaleLabel1: '#ecfdf5',
        cScaleLabel2: '#fff7ed',
        cScaleLabel3: '#faf5ff'
    }
}

function getMermaidConfig(mode: MermaidThemeMode): MermaidConfig {
    return {
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        themeVariables: getMermaidThemeVariables(mode)
    }
}

function getMermaidDiagramLabel(source: string): string {
    const firstMeaningfulLine = source
        .split('\n')
        .map(line => line.trim())
        .find(line => Boolean(line))
        ?.toLowerCase() ?? ''

    const labelMap: Array<[RegExp, string]> = [
        [/^mindmap\b/, 'Mindmap'],
        [/^(flowchart|graph)\b/, 'Flowchart'],
        [/^sequencediagram\b/, 'Sequence'],
        [/^classdiagram\b/, 'Class'],
        [/^erdiagram\b/, 'ERD'],
        [/^journey\b/, 'Journey'],
        [/^gantt\b/, 'Gantt'],
        [/^statediagram(?:-v2)?\b/, 'State'],
        [/^pie\b/, 'Pie'],
        [/^quadrantchart\b/, 'Quadrant'],
        [/^requirementdiagram\b/, 'Requirement'],
        [/^gitgraph\b/, 'Git Graph'],
        [/^timeline\b/, 'Timeline'],
        [/^c4context\b/, 'C4 Context'],
        [/^c4container\b/, 'C4 Container'],
        [/^c4component\b/, 'C4 Component'],
        [/^c4dynamic\b/, 'C4 Dynamic'],
        [/^c4deployment\b/, 'C4 Deployment'],
        [/^block-beta\b/, 'Block']
    ]

    const matched = labelMap.find(([pattern]) => pattern.test(firstMeaningfulLine))
    return `Mermaid / ${matched?.[1] ?? 'Diagram'}`
}

function getMarkdownParser() {
    if (markdownParser) return markdownParser

    markdownParser = new MarkdownIt({
        html: false,
        breaks: true,
        linkify: true,
        typographer: true,
        highlight(str: string, lang: string): string {
            if (lang === 'mermaid') {
                const id = `mermaid-${mermaidCounter++}`
                const mermaidLabel = markdownUtils.escapeHtml(getMermaidDiagramLabel(str))
                return `<div class="mermaid-wrapper"><span class="mermaid-block-lang">${mermaidLabel}</span><pre class="mermaid" id="${id}">${markdownUtils.escapeHtml(str)}</pre></div>`
            }

            const languageLabel = markdownUtils.escapeHtml(lang || 'text')

            if (lang && hljs.getLanguage(lang)) {
                try {
                    return `<div class="code-block-shell"><span class="code-block-lang">${languageLabel}</span><pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre></div>`
                } catch {}
            }

            return `<div class="code-block-shell"><span class="code-block-lang">${languageLabel}</span><pre class="hljs"><code>${markdownUtils.escapeHtml(str)}</code></pre></div>`
        }
    })

    // The highlighter returns complete block containers; markdown-it's default fence
    // renderer would wrap them in another pre/code pair and distort print pagination.
    markdownParser.renderer.rules.fence = (tokens, index, options) => {
        const token = tokens[index]
        if (!token) return ''
        const language = token.info.trim().split(/\s+/)[0] || ''
        return `${options.highlight?.(token.content, language, token.info) || ''}\n`
    }

    const defaultLinkOpen = markdownParser.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
    markdownParser.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        if (!token) return ''
        token.attrSet('target', '_blank')
        token.attrSet('rel', 'noopener noreferrer')
        return defaultLinkOpen(tokens, idx, options, env, self)
    }

    return markdownParser
}

function renderKaTeX(tex: string, displayMode: boolean): string {
    try {
        return katex.renderToString(tex, {
            displayMode,
            throwOnError: false,
            errorColor: '#f56565',
            trust: true,
            strict: false
        })
    } catch {
        return `<span class="katex-error">${markdownUtils.escapeHtml(tex)}</span>`
    }
}

function protectCode(text: string): string {
    codePlaceholders.clear()
    text = text.replace(/(^|\n)(```[\s\S]*?```)(?=\n|$)/g, (_, prefix: string, block: string) => {
        const id = `%%CODE_BLOCK_${placeholderCounter++}%%`
        codePlaceholders.set(id, block)
        return `${prefix}${id}`
    })
    text = text.replace(/`([^`\n]+)`/g, (match: string) => {
        const id = `%%CODE_INLINE_${placeholderCounter++}%%`
        codePlaceholders.set(id, match)
        return id
    })
    return text
}

function restoreCode(text: string): string {
    codePlaceholders.forEach((replacement, placeholder) => {
        text = text.split(placeholder).join(replacement)
    })
    return text
}

function protectMath(text: string): string {
    mathPlaceholders.clear()
    placeholderCounter = 0
    text = protectCode(text)
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => {
        const id = `%%MATH_BLOCK_${placeholderCounter++}%%`
        mathPlaceholders.set(id, `<div class="katex-block">${renderKaTeX(tex.trim(), true)}</div>`)
        return id
    })
    text = text.replace(/\$([^$\n]+?)\$/g, (_, tex: string) => {
        const id = `%%MATH_INLINE_${placeholderCounter++}%%`
        mathPlaceholders.set(id, renderKaTeX(tex.trim(), false))
        return id
    })
    return restoreCode(text)
}

function restoreMath(html: string): string {
    mathPlaceholders.forEach((replacement, placeholder) => {
        html = html.split(placeholder).join(replacement)
    })
    return html
}

function sanitizeHtml(rawHtml: string): string {
    return DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['span', 'sup', 'section', 'img', 'svg', 'path', 'line', 'rect', 'circle', 'g', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mroot', 'msqrt', 'mtext', 'annotation', 'math', 'foreignObject', 'polygon', 'polyline', 'ellipse', 'text', 'tspan', 'marker', 'defs', 'clipPath', 'use', 'image', 'pattern', 'linearGradient', 'radialGradient', 'stop', 'title', 'desc'],
        ADD_ATTR: ['xmlns', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'transform', 'style', 'aria-hidden', 'focusable', 'role', 'encoding', 'id', 'class', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'marker-end', 'marker-start', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight', 'fill-opacity', 'stroke-opacity', 'stroke-dasharray', 'clip-path', 'xlink:href', 'href', 'src', 'alt', 'title', 'loading', 'referrerpolicy', 'preserveAspectRatio'],
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'hr', 'span', 'sup', 'section', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'svg', 'path', 'line', 'rect', 'circle', 'g', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mroot', 'msqrt', 'mtext', 'annotation', 'math', 'polygon', 'polyline', 'ellipse', 'text', 'tspan', 'marker', 'defs', 'clipPath', 'use', 'foreignObject'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'id', 'xmlns', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'transform', 'aria-hidden', 'focusable', 'role', 'encoding', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'marker-end', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight', 'src', 'alt', 'title', 'loading', 'referrerpolicy']
    })
}

async function renderMermaidInElement(container: HTMLElement, mode: MermaidThemeMode) {
    const mermaidElements = Array.from(container.querySelectorAll<HTMLElement>('.mermaid'))
    if (mermaidElements.length === 0) return

    mermaid.initialize(getMermaidConfig(mode))

    for (const element of mermaidElements) {
        const source = element.textContent?.trim()
        if (!source) continue

        try {
            const renderId = `mermaid-export-${mermaidCounter++}`
            const result = await mermaid.render(renderId, source)
            element.outerHTML = result.svg
        } catch (error) {
            console.error('[MarkdownRender] Mermaid render failed:', error)
            element.outerHTML = `<pre class="mermaid-fallback">${markdownUtils.escapeHtml(source)}</pre>`
        }
    }
}

export interface RenderMarkdownOptions {
    consumeLeadingTitle?: string
    theme?: MermaidThemeMode
}

function consumeLeadingTitleHeading(container: HTMLElement, title?: string) {
    if (!title) return

    const firstHeading = container.querySelector('h1')
    if (!firstHeading) return

    const headingText = firstHeading.textContent?.trim()
    if (!headingText) return

    if (headingText === title.trim()) {
        firstHeading.remove()
    }
}

export async function renderMarkdownToHtml(text: string, options: RenderMarkdownOptions = {}): Promise<string> {
    mermaidCounter = 0
    const processed = protectMath(text)
    const sanitized = sanitizeHtml(restoreMath(getMarkdownParser().render(processed)))
    const container = document.createElement('div')
    container.innerHTML = sanitized
    consumeLeadingTitleHeading(container, options.consumeLeadingTitle)
    await renderMermaidInElement(container, options.theme === 'light' ? 'light' : 'dark')
    return container.innerHTML
}

export function stripMarkdownSyntax(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, 'code block')
        .replace(/`([^`\n]+)`/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        .replace(/^\s*>\s?/gm, '')
        .replace(/\$\$[\s\S]+?\$\$/g, 'formula')
        .replace(/\$([^$\n]+)\$/g, '$1')
        .replace(/\|/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

export function deriveDocumentTitle(text: string, fallback = 'document'): string {
    const lines = text
        .split('\n')
        .map(line => stripMarkdownSyntax(line).trim())
        .filter(Boolean)

    return lines[0] || fallback
}

export function sanitizeFilename(name: string, fallback = 'document'): string {
    const normalized = name
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    return normalized || fallback
}

export function buildPrintableDocumentHtml(
    title: string,
    bodyHtml: string,
    options: {
        theme?: MermaidThemeMode
        includeTitle?: boolean
        orientation?: PdfOrientation
        mermaidOversize?: PdfMermaidOversize
        mermaidScaleMode?: PdfMermaidScaleMode
        mermaidScalePercent?: number
        mermaidDensity?: PdfMermaidDensity
    } = {}
): string {
    const theme = options.theme ?? 'light'
    const includeTitle = options.includeTitle ?? true
    const orientation = options.orientation ?? 'portrait'
    const mermaidOversize = options.mermaidOversize ?? 'scale'
    const mermaidScaleMode = options.mermaidScaleMode ?? 'fit-page'
    const mermaidScaleBaseline = 0.75
    const mermaidScalePercent = Math.min(110, Math.max(70, options.mermaidScalePercent ?? 100))
    const mermaidDensity = options.mermaidDensity ?? 'compact'
    const isLight = theme === 'light'
    const pagePaddingY = orientation === 'landscape' ? 12 : 14
    const pagePaddingX = orientation === 'landscape' ? 18 : 16
    const contentWidth = (orientation === 'landscape' ? 297 : 210) - pagePaddingX * 2
    const contentHeight = (orientation === 'landscape' ? 210 : 297) - pagePaddingY * 2

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${markdownUtils.escapeHtml(title)}</title>
  <style>
    ${katexExportCss}
    ${documentExportCss}
    :root {
      color-scheme: ${isLight ? 'light' : 'dark'};
      --page-width: ${orientation === 'landscape' ? '1120px' : '860px'};
      --text: ${isLight ? '#172033' : '#e5eefc'};
      --muted: ${isLight ? '#5f6b7a' : '#94a3b8'};
      --line: ${isLight ? '#d9e1ec' : 'rgba(148, 163, 184, 0.24)'};
      --surface: ${isLight ? '#ffffff' : '#17181c'};
      --page-surface: ${isLight ? '#eef3f8' : '#111318'};
      --surface-alt: ${isLight ? '#f5f7fb' : '#111827'};
      --code-bg: ${isLight ? '#f3f4f6' : '#0f172a'};
      --code-text: ${isLight ? '#24292f' : '#e5eefc'};
      --accent: ${isLight ? '#2f6fed' : '#93c5fd'};
      --quote: ${isLight ? '#eaf0f8' : 'rgba(255, 255, 255, 0.04)'};
      --shadow: ${isLight ? '0 20px 50px rgba(15, 23, 42, 0.08)' : '0 24px 60px rgba(0, 0, 0, 0.35)'};
      --mermaid-content-max-height: ${contentHeight}mm;
      --export-image-max-height: ${Math.max(1, contentHeight - 12)}mm;
      --mermaid-wrapper-margin: ${mermaidDensity === 'compact' ? '0.7em' : '1.2em'};
      --mermaid-wrapper-padding-top: ${mermaidDensity === 'compact' ? '12px' : '16px'};
      --mermaid-wrapper-padding-side: ${mermaidDensity === 'compact' ? '12px' : '18px'};
      --mermaid-wrapper-padding-bottom: ${mermaidDensity === 'compact' ? '12px' : '18px'};
      --mermaid-label-margin: ${mermaidDensity === 'compact' ? '8px 8px 0' : '12px 12px 0'};
      --mermaid-label-scale: ${mermaidDensity === 'compact' ? '0.96' : '1'};
      --export-blockquote-border-left: 4px solid ${isLight ? '#9bb2d1' : '#5f7ba6'};
      --export-blockquote-color: ${isLight ? '#2f3b4c' : 'rgba(229, 238, 252, 0.84)'};
      --export-code-block-shell-border: ${isLight ? 'none' : '1px solid rgba(255, 255, 255, 0.06)'};
      --export-code-block-shell-box-shadow: ${isLight ? 'none' : 'inset 0 1px 0 rgba(255, 255, 255, 0.03)'};
      --export-code-block-lang-background: ${isLight ? 'rgba(255, 255, 255, 0.72)' : 'rgba(191, 219, 254, 0.12)'};
      --export-code-block-lang-color: ${isLight ? 'rgba(15, 23, 42, 0.52)' : '#bfdbfe'};
      --export-mermaid-block-lang-background: ${isLight ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.08)'};
      --export-mermaid-block-lang-color: ${isLight ? 'rgba(15, 23, 42, 0.52)' : 'rgba(229, 238, 252, 0.68)'};
      --export-hljs-keyword-color: ${isLight ? '#8250df' : '#c792ea'};
      --export-hljs-string-color: ${isLight ? '#116329' : '#ecc48d'};
      --export-hljs-number-color: ${isLight ? '#bc4c00' : '#f78c6c'};
      --export-hljs-title-color: ${isLight ? '#0550ae' : '#82aaff'};
      --export-hljs-comment-color: ${isLight ? '#6e7781' : '#7f8c98'};
      --export-hljs-literal-color: ${isLight ? '#953800' : '#4fd1c5'};
      --export-hljs-meta-color: ${isLight ? '#0a7ea4' : '#89ddff'};
      --export-mermaid-wrapper-page-break-inside: ${mermaidScaleMode === 'fit-page' || mermaidOversize === 'page-break' ? 'avoid' : 'auto'};
      --export-mermaid-wrapper-break-inside: ${mermaidScaleMode === 'fit-page' || mermaidOversize === 'page-break' ? 'avoid' : 'auto'};
      --export-mermaid-text-fill: ${isLight ? '#172033' : '#e5eefc'};
      --export-mermaid-text-color: ${isLight ? '#172033' : '#e5eefc'};
      --export-mermaid-edgeLabel-rect-fill: ${isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(23, 24, 28, 0.92)'};
      --export-mermaid-edgePath-path-stroke: ${isLight ? '#7a93b8' : '#8aa4d0'};
      --export-mermaid-arrowheadPath-fill: ${isLight ? '#7a93b8' : '#8aa4d0'};
      --export-mermaid-arrowheadPath-stroke: ${isLight ? '#7a93b8' : '#8aa4d0'};
      --export-mermaid-node-rect-stroke: ${isLight ? 'rgba(122, 147, 184, 0.46)' : 'rgba(191, 219, 254, 0.34)'};
      --export-mermaid-cluster-rect-fill: ${isLight ? 'rgba(245, 247, 251, 0.96)' : 'rgba(17, 26, 40, 0.78)'};
      --export-mermaid-mindmap-node-nth-of-type-4n-1-rect-fill: ${isLight ? '#d8e7ff' : '#26476b'};
      --export-mermaid-mindmap-node-nth-of-type-4n-2-rect-fill: ${isLight ? '#dff4ea' : '#1f5a4c'};
      --export-mermaid-mindmap-node-nth-of-type-4n-3-rect-fill: ${isLight ? '#fff1d6' : '#6a4f1f'};
      --export-mermaid-mindmap-node-nth-of-type-4n-4-rect-fill: ${isLight ? '#f4e3ff' : '#4b2e67'};
    }
    @page { size: A4 ${orientation}; margin: ${pagePaddingY}mm ${pagePaddingX}mm; }
  </style>
</head>
<body>
  <main class="document-shell">
    ${includeTitle ? `<h1 class="document-title">${markdownUtils.escapeHtml(title)}</h1>` : ''}
    <section class="document-body">${bodyHtml}</section>
  </main>
  ${buildMermaidPrintScript({
      contentWidthMm: contentWidth,
      contentHeightMm: contentHeight,
      scaleMode: mermaidScaleMode,
      scale: mermaidScaleBaseline * (mermaidScalePercent / 100)
  })}
</body>
</html>`
}

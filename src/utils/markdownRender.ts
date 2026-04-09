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
        ADD_TAGS: ['span', 'img', 'svg', 'path', 'line', 'rect', 'circle', 'g', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mroot', 'msqrt', 'mtext', 'annotation', 'math', 'foreignObject', 'polygon', 'polyline', 'ellipse', 'text', 'tspan', 'marker', 'defs', 'clipPath', 'use', 'image', 'pattern', 'linearGradient', 'radialGradient', 'stop', 'title', 'desc'],
        ADD_ATTR: ['xmlns', 'width', 'height', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'transform', 'style', 'aria-hidden', 'focusable', 'role', 'encoding', 'id', 'class', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'marker-end', 'marker-start', 'text-anchor', 'dominant-baseline', 'font-size', 'font-family', 'font-weight', 'fill-opacity', 'stroke-opacity', 'stroke-dasharray', 'clip-path', 'xlink:href', 'href', 'src', 'alt', 'title', 'loading', 'referrerpolicy', 'preserveAspectRatio'],
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'hr', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'svg', 'path', 'line', 'rect', 'circle', 'g', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mroot', 'msqrt', 'mtext', 'annotation', 'math', 'polygon', 'polyline', 'ellipse', 'text', 'tspan', 'marker', 'defs', 'clipPath', 'use', 'foreignObject'],
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

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${markdownUtils.escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
  <style>
    :root {
      color-scheme: ${isLight ? 'light' : 'dark'};
      --page-width: ${orientation === 'landscape' ? '1120px' : '860px'};
      --page-pad-y: ${orientation === 'landscape' ? '12mm' : '14mm'};
      --page-pad-x: ${orientation === 'landscape' ? '18mm' : '16mm'};
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
      --mermaid-content-max-height: ${orientation === 'landscape' ? '165mm' : '235mm'};
      --mermaid-wrapper-margin: ${mermaidDensity === 'compact' ? '0.7em' : '1.2em'};
      --mermaid-wrapper-padding-top: ${mermaidDensity === 'compact' ? '12px' : '16px'};
      --mermaid-wrapper-padding-side: ${mermaidDensity === 'compact' ? '12px' : '18px'};
      --mermaid-wrapper-padding-bottom: ${mermaidDensity === 'compact' ? '12px' : '18px'};
      --mermaid-label-margin: ${mermaidDensity === 'compact' ? '8px 8px 0' : '12px 12px 0'};
      --mermaid-label-scale: ${mermaidDensity === 'compact' ? '0.96' : '1'};
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--page-surface); color: var(--text); font-family: Georgia, "Times New Roman", serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { padding: 32px; }
    .document-shell { width: min(100%, var(--page-width)); margin: 0 auto; padding: 56px 64px; background: var(--surface); border-radius: 20px; box-shadow: var(--shadow); }
    .document-title { margin: 0 0 24px; font-size: 34px; line-height: 1.15; }
    .document-body { font-size: 16px; line-height: 1.78; }
    .document-body > :first-child { margin-top: 0; }
    .document-body h1, .document-body h2, .document-body h3, .document-body h4, .document-body h5, .document-body h6 { margin: 1.35em 0 0.55em; line-height: 1.25; font-family: "Segoe UI", system-ui, sans-serif; }
    .document-body h1 { font-size: 2em; }
    .document-body h2 { font-size: 1.55em; padding-bottom: 0.2em; border-bottom: 1px solid var(--line); }
    .document-body h3 { font-size: 1.25em; }
    .document-body p, .document-body ul, .document-body ol, .document-body blockquote, .document-body table, .document-body pre { margin: 1em 0; }
    .document-body img { display: block; max-width: min(100%, 760px); max-height: 540px; width: auto; height: auto; margin: 1.15em auto; border-radius: 16px; background: var(--surface-alt); box-shadow: var(--shadow); object-fit: contain; page-break-inside: avoid; break-inside: avoid; }
    .document-body a { color: var(--accent); text-decoration: none; }
    .document-body a:hover { text-decoration: underline; }
    .document-body ul, .document-body ol { padding-left: 1.4em; }
    .document-body li + li { margin-top: 0.35em; }
    .document-body blockquote { padding: 0.9em 1.1em; border-left: 4px solid ${isLight ? '#9bb2d1' : '#5f7ba6'}; background: var(--quote); color: ${isLight ? '#2f3b4c' : 'rgba(229, 238, 252, 0.84)'}; }
    .document-body hr { border: 0; border-top: 1px solid var(--line); margin: 2em 0; }
    .document-body code { padding: 0.14em 0.38em; border-radius: 0.35em; background: var(--surface-alt); font-family: "JetBrains Mono", "Fira Code", monospace; font-size: 0.92em; }
    .code-block-shell { margin: 1.2em 0; border-radius: 16px; overflow: hidden; background: var(--code-bg); color: var(--code-text); border: ${isLight ? 'none' : '1px solid rgba(255, 255, 255, 0.06)'}; box-shadow: ${isLight ? 'none' : 'inset 0 1px 0 rgba(255, 255, 255, 0.03)'}; page-break-inside: avoid; break-inside: avoid; }
    .code-block-lang, .mermaid-block-lang { display: inline-flex; align-items: center; margin: 12px 12px 0; padding: 4px 10px; border-radius: 999px; font: 700 10px/1.2 "Segoe UI", system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
    .code-block-lang { background: ${isLight ? 'rgba(255, 255, 255, 0.72)' : 'rgba(191, 219, 254, 0.12)'}; color: ${isLight ? 'rgba(15, 23, 42, 0.52)' : '#bfdbfe'}; }
    .mermaid-block-lang { background: ${isLight ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.08)'}; color: ${isLight ? 'rgba(15, 23, 42, 0.52)' : 'rgba(229, 238, 252, 0.68)'}; }
    .document-body pre { overflow-x: auto; }
    .document-body .plain-text-document { white-space: pre-wrap; word-break: break-word; padding: 18px 20px; border-radius: 16px; background: var(--surface-alt); font-family: "JetBrains Mono", "Fira Code", monospace; }
    .document-body pre code { display: block; padding: 16px 18px 20px; background: transparent; color: inherit; }
    .document-body .hljs { background: transparent; color: var(--code-text); }
    .document-body .hljs-keyword, .document-body .hljs-doctag { color: ${isLight ? '#8250df' : '#c792ea'}; }
    .document-body .hljs-string, .document-body .hljs-attribute, .document-body .hljs-template-string { color: ${isLight ? '#116329' : '#ecc48d'}; }
    .document-body .hljs-number, .document-body .hljs-attr, .document-body .hljs-symbol, .document-body .hljs-bullet { color: ${isLight ? '#bc4c00' : '#f78c6c'}; }
    .document-body .hljs-title, .document-body .hljs-function, .document-body .hljs-variable, .document-body .hljs-property { color: ${isLight ? '#0550ae' : '#82aaff'}; }
    .document-body .hljs-comment, .document-body .hljs-quote { color: ${isLight ? '#6e7781' : '#7f8c98'}; font-style: italic; }
    .document-body .hljs-literal, .document-body .hljs-type, .document-body .hljs-built_in, .document-body .hljs-class .hljs-title { color: ${isLight ? '#953800' : '#4fd1c5'}; }
    .document-body .hljs-meta, .document-body .hljs-meta .hljs-keyword { color: ${isLight ? '#0a7ea4' : '#89ddff'}; }
    .document-body table { width: 100%; border-collapse: collapse; }
    .document-body th, .document-body td { padding: 10px 12px; border: 1px solid var(--line); vertical-align: top; }
    .document-body th { background: var(--surface-alt); font-family: "Segoe UI", system-ui, sans-serif; text-align: left; }
    .katex-block { display: flex; justify-content: center; padding: 14px 16px; border-radius: 12px; background: var(--surface-alt); overflow-x: auto; page-break-inside: avoid; break-inside: avoid; }
    .katex-error { color: #c2410c; }
    .mermaid-wrapper { margin: var(--mermaid-wrapper-margin) 0; padding: var(--mermaid-wrapper-padding-top) var(--mermaid-wrapper-padding-side) var(--mermaid-wrapper-padding-bottom); border-radius: 16px; background: var(--surface-alt); overflow: visible; page-break-inside: ${mermaidOversize === 'page-break' ? 'avoid' : 'auto'}; break-inside: ${mermaidOversize === 'page-break' ? 'avoid' : 'auto'}; }
    .mermaid-wrapper .mermaid { display: flex; justify-content: center; min-width: 0; width: 100%; }
    .mermaid-wrapper .mermaid-block-lang { margin: var(--mermaid-label-margin); transform: scale(var(--mermaid-label-scale)); transform-origin: left center; }
    .mermaid-wrapper svg { max-width: 100%; width: auto; height: auto; display: block; margin: 12px auto 0; overflow: visible; }
    .mermaid-wrapper.mermaid-fit-width svg { max-height: none; }
    .mermaid-wrapper.mermaid-fit-page svg { max-height: var(--mermaid-content-max-height); }
    .mermaid-wrapper::-webkit-scrollbar, .mermaid-wrapper *::-webkit-scrollbar { display: none; width: 0; height: 0; }
    .mermaid-fallback { white-space: pre-wrap; }
    .mermaid text, .mermaid .label, .mermaid .nodeLabel, .mermaid .edgeLabel, .mermaid .edgeLabel p, .mermaid .edgeLabel span, .mermaid .cluster-label text, .mermaid .cluster-label span, .mermaid .mindmap-node .label, .mermaid .mindmap-node text, .mermaid .mindmap-node foreignObject, .mermaid .mindmap-node foreignObject div { fill: ${isLight ? '#172033' : '#e5eefc'} !important; color: ${isLight ? '#172033' : '#e5eefc'} !important; }
    .mermaid .edgeLabel rect, .mermaid .labelBkg { fill: ${isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(23, 24, 28, 0.92)'} !important; }
    .mermaid .edgePath path, .mermaid .flowchart-link, .mermaid .relationshipLine, .mermaid .messageLine0, .mermaid .messageLine1, .mermaid .mindmap-link, .mermaid .section-edge { stroke: ${isLight ? '#7a93b8' : '#8aa4d0'} !important; }
    .mermaid .arrowheadPath, .mermaid marker path { fill: ${isLight ? '#7a93b8' : '#8aa4d0'} !important; stroke: ${isLight ? '#7a93b8' : '#8aa4d0'} !important; }
    .mermaid .node rect, .mermaid .node circle, .mermaid .node ellipse, .mermaid .node polygon, .mermaid .node path, .mermaid .cluster rect, .mermaid .cluster polygon, .mermaid .mindmap-node rect, .mermaid .mindmap-node circle, .mermaid .mindmap-node path { stroke: ${isLight ? 'rgba(122, 147, 184, 0.46)' : 'rgba(191, 219, 254, 0.34)'} !important; }
    .mermaid .cluster rect, .mermaid .cluster polygon { fill: ${isLight ? 'rgba(245, 247, 251, 0.96)' : 'rgba(17, 26, 40, 0.78)'} !important; }
    .mermaid .mindmap-node:nth-of-type(4n + 1) rect, .mermaid .mindmap-node:nth-of-type(4n + 1) circle, .mermaid .mindmap-node:nth-of-type(4n + 1) path { fill: ${isLight ? '#d8e7ff' : '#26476b'} !important; }
    .mermaid .mindmap-node:nth-of-type(4n + 2) rect, .mermaid .mindmap-node:nth-of-type(4n + 2) circle, .mermaid .mindmap-node:nth-of-type(4n + 2) path { fill: ${isLight ? '#dff4ea' : '#1f5a4c'} !important; }
    .mermaid .mindmap-node:nth-of-type(4n + 3) rect, .mermaid .mindmap-node:nth-of-type(4n + 3) circle, .mermaid .mindmap-node:nth-of-type(4n + 3) path { fill: ${isLight ? '#fff1d6' : '#6a4f1f'} !important; }
    .mermaid .mindmap-node:nth-of-type(4n + 4) rect, .mermaid .mindmap-node:nth-of-type(4n + 4) circle, .mermaid .mindmap-node:nth-of-type(4n + 4) path { fill: ${isLight ? '#f4e3ff' : '#4b2e67'} !important; }
    @page { size: A4 ${orientation}; margin: 0; }
    @media print {
      html, body { background: var(--surface); }
      body { padding: var(--page-pad-y) var(--page-pad-x); }
      .document-shell { width: 100%; max-width: none; padding: 0; box-shadow: none; border-radius: 0; background: transparent; }
      a { color: inherit; text-decoration: none; }
      .mermaid-wrapper, .mermaid-wrapper * { scrollbar-width: none !important; }
    }
  </style>
</head>
<body>
  <main class="document-shell">
    ${includeTitle ? `<h1 class="document-title">${markdownUtils.escapeHtml(title)}</h1>` : ''}
    <section class="document-body">${bodyHtml}</section>
  </main>
  <script>
    (() => {
      const oversize = ${JSON.stringify(mermaidOversize)};
      const scaleMode = ${JSON.stringify(mermaidScaleMode)};
      const globalScale = ${JSON.stringify(mermaidScaleBaseline * (mermaidScalePercent / 100))};
      const minScale = 0.35;
      const wrappers = Array.from(document.querySelectorAll('.mermaid-wrapper'));

      function getSvgSize(svg) {
        const viewBox = svg.viewBox && svg.viewBox.baseVal;
        if (viewBox && viewBox.width && viewBox.height) {
          return { width: viewBox.width, height: viewBox.height };
        }
        const width = Number(svg.getAttribute('width')) || svg.getBoundingClientRect().width || svg.clientWidth || 0;
        const height = Number(svg.getAttribute('height')) || svg.getBoundingClientRect().height || svg.clientHeight || 0;
        return { width, height };
      }

      wrappers.forEach((wrapper) => {
        const svg = wrapper.querySelector('svg');
        if (!svg) return;

        wrapper.classList.add(scaleMode === 'fit-width' ? 'mermaid-fit-width' : 'mermaid-fit-page');
        wrapper.style.overflow = 'visible';
        svg.style.overflow = 'visible';
        svg.removeAttribute('width');
        svg.removeAttribute('height');

        const wrapperWidth = Math.max(1, wrapper.clientWidth - 4);
        const maxHeightText = getComputedStyle(document.documentElement).getPropertyValue('--mermaid-content-max-height').trim();
        const probe = document.createElement('div');
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        probe.style.height = maxHeightText || '235mm';
        document.body.appendChild(probe);
        const maxHeight = probe.getBoundingClientRect().height || Infinity;
        probe.remove();

        const { width, height } = getSvgSize(svg);
        if (!width || !height) return;

        const widthScale = wrapperWidth / width;
        const heightScale = scaleMode === 'fit-page' ? maxHeight / height : Infinity;
        const fitScale = oversize === 'scale'
          ? Math.min(1, widthScale, heightScale)
          : 1;
        const safeScale = Math.min(widthScale, heightScale);
        const nextScale = Math.min(fitScale * globalScale, Math.max(fitScale, safeScale));

        if (nextScale !== 1 && nextScale >= minScale) {
          svg.style.setProperty('width', \`\${width * nextScale}px\`, 'important');
          svg.style.setProperty('height', \`\${height * nextScale}px\`, 'important');
          wrapper.dataset.mermaidScaled = 'true';
        }
      });
    })();
  </script>
</body>
</html>`
}

import markdownExportCss from '@/styles/export/markdown.css?inline'
import headingNumberingCss from '@/styles/export/heading-numbering.css?inline'
import { katexExportCss } from './exportResources'
import { buildMermaidPrintScript } from './exportMermaid'
import githubDarkCss from 'highlight.js/styles/github-dark.css?inline'
import githubLightCss from 'highlight.js/styles/github.css?inline'
import { apiService } from '@/services/api'
import { deriveDocumentTitle, renderMarkdownToHtml, sanitizeFilename } from './markdownRender'

export type MarkdownExportFormat = 'pdf' | 'md'
export type MarkdownExportThemeMode = 'current' | 'light' | 'dark'
export type MarkdownExportPageSize = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'Tabloid'
export type MarkdownExportOrientation = 'portrait' | 'landscape'
export type MarkdownExportStyle = 'clean' | 'academic' | 'compact'
export type MarkdownExportMermaidOversize = 'scale' | 'page-break'
export type MarkdownExportMermaidScaleMode = 'fit-page' | 'fit-width'
export type MarkdownExportMermaidDensity = 'standard' | 'compact'

export interface MarkdownExportMargins {
    top: number
    right: number
    bottom: number
    left: number
}

export interface MarkdownExportSettings {
    format: MarkdownExportFormat
    fileName: string
    title: string
    includeTitle: boolean
    includeToc: boolean
    numberHeadings: boolean
    themeMode: MarkdownExportThemeMode
    pageSize: MarkdownExportPageSize
    orientation: MarkdownExportOrientation
    margins: MarkdownExportMargins
    style: MarkdownExportStyle
    fontFamily: string
    fontSize: number
    lineHeight: number
    mermaidOversize: MarkdownExportMermaidOversize
    mermaidScaleMode: MarkdownExportMermaidScaleMode
    mermaidScalePercent: number
    mermaidDensity: MarkdownExportMermaidDensity
}

export interface MarkdownExportResult {
    canceled?: boolean
    fileName?: string
    filePath?: string
}

interface HeadingEntry {
    level: number
    text: string
    id: string
}

const PAGE_WIDTH_MM: Record<MarkdownExportPageSize, number> = {
    A3: 297,
    A4: 210,
    A5: 148,
    Letter: 216,
    Legal: 216,
    Tabloid: 279
}

const PAGE_HEIGHT_MM: Record<MarkdownExportPageSize, number> = {
    A3: 420,
    A4: 297,
    A5: 210,
    Letter: 279,
    Legal: 356,
    Tabloid: 432
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function downloadMarkdown(content: string, fileName: string) {
    const normalized = content.replace(/\r?\n/g, '\r\n')
    const blob = new Blob([normalized], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

function normalizeTheme(mode: MarkdownExportThemeMode) {
    if (mode === 'light' || mode === 'dark') return mode
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function normalizeImageSources(container: HTMLElement) {
    const baseUrl = apiService.getBaseUrl()
    container.querySelectorAll<HTMLImageElement>('img[src]').forEach(image => {
        const raw = image.getAttribute('src') || ''
        if (!raw || /^(https?:|data:|blob:|file:)/i.test(raw)) return
        if (raw.startsWith('constella://')) {
            image.src = `${baseUrl}/${raw.replace(/^constella:\/\//, '')}`
            return
        }
        if (raw.startsWith('/')) {
            image.src = `${baseUrl}${raw}`
            return
        }
        image.src = `${baseUrl}/${raw}`
    })
}

function slugifyHeading(text: string, used: Set<string>) {
    const base = text
        .trim()
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .replace(/[^\p{L}\p{N}\s_-]+/gu, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'heading'

    let id = base
    let index = 1
    while (used.has(id)) {
        id = `${base}-${index++}`
    }
    used.add(id)
    return id
}

function prepareArticleHtml(rawHtml: string, settings: MarkdownExportSettings) {
    const container = document.createElement('article')
    container.className = 'markdown-export-body'
    container.innerHTML = rawHtml

    normalizeImageSources(container)

    const used = new Set<string>()
    const headings: HeadingEntry[] = []
    container.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6').forEach(heading => {
        const text = heading.textContent?.trim() || 'Untitled'
        const id = slugifyHeading(text, used)
        heading.id = id
        headings.push({
            level: Number(heading.tagName.slice(1)),
            text,
            id
        })
    })

    if (settings.includeToc) {
        const tocHtml = buildTocHtml(headings)
        const marker = Array.from(container.querySelectorAll('p')).find(paragraph => paragraph.textContent?.trim().toUpperCase() === '[TOC]')
        if (marker) {
            marker.outerHTML = tocHtml
        } else if (tocHtml) {
            container.insertAdjacentHTML('afterbegin', tocHtml)
        }
    } else {
        Array.from(container.querySelectorAll('p')).forEach(paragraph => {
            if (paragraph.textContent?.trim().toUpperCase() === '[TOC]') paragraph.remove()
        })
    }

    return {
        html: container.innerHTML,
        headings
    }
}

function buildTocHtml(headings: HeadingEntry[]) {
    const visible = headings.filter(heading => heading.level >= 1 && heading.level <= 3)
    if (!visible.length) return ''

    const className = visible.length >= 14 ? 'markdown-export-toc long-toc' : 'markdown-export-toc'
    const items = visible.map(heading => {
        const indent = Math.max(0, heading.level - 1)
        return `<li style="--toc-indent:${indent}"><a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a></li>`
    }).join('')

    return `<nav class="${className}"><div class="toc-title">Table of Contents</div><ol>${items}</ol></nav>`
}

function buildFilename(fileName: string, format: MarkdownExportFormat) {
    return `${sanitizeFilename(fileName || 'markdown')}.${format}`
}

function getPageWidth(settings: MarkdownExportSettings) {
    return settings.orientation === 'landscape'
        ? PAGE_HEIGHT_MM[settings.pageSize]
        : PAGE_WIDTH_MM[settings.pageSize]
}

function buildDocumentHtml(bodyHtml: string, settings: MarkdownExportSettings, theme: 'light' | 'dark') {
    const isLight = theme === 'light'
    const title = settings.title || 'Markdown'
    const margins = {
        top: clamp(settings.margins.top, 0, 50),
        right: clamp(settings.margins.right, 0, 50),
        bottom: clamp(settings.margins.bottom, 0, 50),
        left: clamp(settings.margins.left, 0, 50)
    }
    const fontSize = clamp(settings.fontSize, 10, 24)
    const lineHeight = clamp(settings.lineHeight, 1.1, 2.4)
    const scalePercent = clamp(settings.mermaidScalePercent, 60, 130)
    const pageWidth = getPageWidth(settings)
    const contentWidth = Math.max(1, pageWidth - margins.left - margins.right)
    const pageHeight = settings.orientation === 'landscape'
        ? PAGE_WIDTH_MM[settings.pageSize]
        : PAGE_HEIGHT_MM[settings.pageSize]
    const contentHeight = Math.max(1, pageHeight - margins.top - margins.bottom)
    const maxPageHeight = `${contentHeight}mm`
    const pageSurface = isLight ? '#eef2f7' : '#10141b'
    const surface = isLight ? '#ffffff' : '#121212'
    const surfaceAlt = isLight ? '#f6f8fb' : '#111827'
    const text = isLight ? '#1f2937' : '#e5e7eb'
    const muted = isLight ? '#64748b' : '#94a3b8'
    const line = isLight ? '#d8dee8' : 'rgba(148, 163, 184, 0.25)'
    const accent = isLight ? '#2563eb' : '#93c5fd'
    const serif = settings.style === 'academic'
    const compact = settings.style === 'compact'
    const fontFamily = settings.fontFamily || (serif ? 'Georgia, "Times New Roman", serif' : '"Segoe UI", system-ui, sans-serif')
    const codeTheme = isLight ? githubLightCss : githubDarkCss
    const numberingCss = settings.numberHeadings ? headingNumberingCss : ''

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${katexExportCss}
    ${codeTheme}
    ${numberingCss}
    ${markdownExportCss}
    :root {
      color-scheme: ${theme};
      --page-surface: ${pageSurface};
      --surface: ${surface};
      --surface-alt: ${surfaceAlt};
      --text: ${text};
      --muted: ${muted};
      --line: ${line};
      --accent: ${accent};
      --content-width: ${contentWidth}mm;
      --mermaid-max-height: ${maxPageHeight};
      --export-font-family: ${fontFamily};
      --export-page-padding: ${compact ? '34px 42px' : '52px 62px'};
      --export-page-box-shadow: 0 18px 55px rgba(15, 23, 42, ${isLight ? '0.12' : '0.35'});
      --export-title-margin: 0 0 ${compact ? '18px' : '28px'};
      --export-title-font-size: ${serif ? '31px' : '34px'};
      --export-body-font-size: ${fontSize}px;
      --export-body-line-height: ${lineHeight};
      --export-heading-margin: ${compact ? '1.05em' : '1.35em'} 0 0.55em;
      --export-heading-font-family: ${serif ? fontFamily : '"Segoe UI", system-ui, sans-serif'};
      --export-block-margin: ${compact ? '0.72em' : '1em'} 0;
      --export-body-blockquote-border-left: 4px solid ${isLight ? '#9aa9bd' : '#64748b'};
      --export-body-blockquote-color: ${isLight ? '#334155' : '#cbd5e1'};
      --export-body-img-max-height: ${Math.max(1, contentHeight - 12)}mm;
      --export-code-block-shell-background: ${isLight ? '#f6f8fa' : '#0d1117'};
      --export-code-block-lang-background: ${isLight ? '#e9eef5' : 'rgba(148, 163, 184, 0.16)'};
      --export-mermaid-wrapper-margin: ${settings.mermaidDensity === 'compact' ? '0.75em' : '1.2em'} 0;
      --export-mermaid-wrapper-padding: ${settings.mermaidDensity === 'compact' ? '10px' : '16px'};
      --export-mermaid-wrapper-page-break-inside: ${settings.mermaidScaleMode === 'fit-page' || settings.mermaidOversize === 'page-break' ? 'avoid' : 'auto'};
      --export-mermaid-wrapper-break-inside: ${settings.mermaidScaleMode === 'fit-page' || settings.mermaidOversize === 'page-break' ? 'avoid' : 'auto'};
      --export-mermaid-wrapper-svg-max-height: ${settings.mermaidScaleMode === 'fit-page' ? 'var(--mermaid-max-height)' : 'none'};
    }
    @page {
      size: ${settings.pageSize} ${settings.orientation};
      margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
    }
  </style>
</head>
<body>
  <main class="markdown-export-page">
    ${settings.includeTitle ? `<h1 class="markdown-export-title">${escapeHtml(title)}</h1>` : ''}
    <article class="markdown-export-body">${bodyHtml}</article>
  </main>
  ${buildMermaidPrintScript({
      contentWidthMm: contentWidth,
      contentHeightMm: contentHeight,
      scaleMode: settings.mermaidScaleMode,
      scale: scalePercent / 100
  })}
</body>
</html>`
}

function openPrintWindow(html: string) {
    const printWindow = window.open('', '_blank', 'width=1100,height=900')
    if (!printWindow) throw new Error('Unable to open print window')
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    window.setTimeout(() => {
        printWindow.focus()
        printWindow.print()
    }, 350)
}

export function createDefaultMarkdownExportSettings(markdown: string): MarkdownExportSettings {
    const title = deriveDocumentTitle(markdown, 'markdown')
    return {
        format: 'pdf',
        fileName: sanitizeFilename(title, 'markdown'),
        title,
        includeTitle: true,
        includeToc: false,
        numberHeadings: false,
        themeMode: 'light',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: {
            top: 16,
            right: 16,
            bottom: 16,
            left: 16
        },
        style: 'clean',
        fontFamily: '',
        fontSize: 16,
        lineHeight: 1.7,
        mermaidOversize: 'scale',
        mermaidScaleMode: 'fit-page',
        mermaidScalePercent: 100,
        mermaidDensity: 'compact'
    }
}

export async function exportMarkdownDocument(markdown: string, settings: MarkdownExportSettings): Promise<MarkdownExportResult> {
    const fileName = sanitizeFilename(settings.fileName, 'markdown')
    if (settings.format === 'md') {
        const finalName = buildFilename(fileName, 'md')
        downloadMarkdown(markdown, finalName)
        return {
            canceled: false,
            fileName: finalName
        }
    }

    const theme = normalizeTheme(settings.themeMode)
    const title = settings.title || deriveDocumentTitle(markdown, 'markdown')
    const rendered = await renderMarkdownToHtml(markdown, {
        consumeLeadingTitle: settings.includeTitle ? title : undefined,
        theme
    })
    const prepared = prepareArticleHtml(rendered, {
        ...settings,
        title
    })
    const html = buildDocumentHtml(prepared.html, {
        ...settings,
        title
    }, theme)

    const finalName = buildFilename(fileName, 'pdf')
    if (window.electron?.exportDocumentPdf) {
        return window.electron.exportDocumentPdf({
            html,
            fileName: finalName,
            orientation: settings.orientation
        })
    }

    openPrintWindow(html)
    return {
        canceled: false,
        fileName: finalName
    }
}

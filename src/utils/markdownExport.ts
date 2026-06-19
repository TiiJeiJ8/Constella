import katexCss from 'katex/dist/katex.min.css?inline'
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
    const contentWidth = Math.max(90, pageWidth - margins.left - margins.right)
    const maxPageHeight = settings.orientation === 'landscape' ? '165mm' : '235mm'
    const pageSurface = isLight ? '#eef2f7' : '#10141b'
    const surface = isLight ? '#ffffff' : '#181c24'
    const surfaceAlt = isLight ? '#f6f8fb' : '#111827'
    const text = isLight ? '#1f2937' : '#e5e7eb'
    const muted = isLight ? '#64748b' : '#94a3b8'
    const line = isLight ? '#d8dee8' : 'rgba(148, 163, 184, 0.25)'
    const accent = isLight ? '#2563eb' : '#93c5fd'
    const serif = settings.style === 'academic'
    const compact = settings.style === 'compact'
    const fontFamily = settings.fontFamily || (serif ? 'Georgia, "Times New Roman", serif' : '"Segoe UI", system-ui, sans-serif')
    const codeTheme = isLight ? githubLightCss : githubDarkCss
    const numberingCss = settings.numberHeadings
        ? `
    .markdown-export-body { counter-reset: h2; }
    .markdown-export-body h2 { counter-reset: h3; }
    .markdown-export-body h3 { counter-reset: h4; }
    .markdown-export-body h4 { counter-reset: h5; }
    .markdown-export-body h2::before { counter-increment: h2; content: counter(h2) ". "; }
    .markdown-export-body h3::before { counter-increment: h3; content: counter(h2) "." counter(h3) ". "; }
    .markdown-export-body h4::before { counter-increment: h4; content: counter(h2) "." counter(h3) "." counter(h4) ". "; }`
        : ''

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    ${katexCss}
    ${codeTheme}
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
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100%;
      background: var(--page-surface);
      color: var(--text);
      font-family: ${fontFamily};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { padding: 32px; }
    .markdown-export-page {
      width: min(100%, var(--content-width));
      margin: 0 auto;
      padding: ${compact ? '34px 42px' : '52px 62px'};
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 18px 55px rgba(15, 23, 42, ${isLight ? '0.12' : '0.35'});
    }
    .markdown-export-title {
      margin: 0 0 ${compact ? '18px' : '28px'};
      padding-bottom: 18px;
      border-bottom: 1px solid var(--line);
      font-size: ${serif ? '31px' : '34px'};
      line-height: 1.18;
      letter-spacing: 0;
    }
    .markdown-export-body {
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
      overflow-wrap: break-word;
    }
    .markdown-export-body > :first-child { margin-top: 0; }
    .markdown-export-body h1,
    .markdown-export-body h2,
    .markdown-export-body h3,
    .markdown-export-body h4,
    .markdown-export-body h5,
    .markdown-export-body h6 {
      margin: ${compact ? '1.05em' : '1.35em'} 0 0.55em;
      line-height: 1.25;
      letter-spacing: 0;
      font-family: ${serif ? fontFamily : '"Segoe UI", system-ui, sans-serif'};
    }
    .markdown-export-body h1 { font-size: 2em; }
    .markdown-export-body h2 { font-size: 1.5em; padding-bottom: 0.25em; border-bottom: 1px solid var(--line); }
    .markdown-export-body h3 { font-size: 1.25em; }
    .markdown-export-body p,
    .markdown-export-body ul,
    .markdown-export-body ol,
    .markdown-export-body blockquote,
    .markdown-export-body table,
    .markdown-export-body pre { margin: ${compact ? '0.72em' : '1em'} 0; }
    .markdown-export-body a { color: var(--accent); text-decoration: none; }
    .markdown-export-body a:hover { text-decoration: underline; }
    .markdown-export-body ul,
    .markdown-export-body ol { padding-left: 1.45em; }
    .markdown-export-body li + li { margin-top: 0.28em; }
    .markdown-export-body blockquote {
      padding: 0.75em 1em;
      border-left: 4px solid ${isLight ? '#9aa9bd' : '#64748b'};
      background: var(--surface-alt);
      color: ${isLight ? '#334155' : '#cbd5e1'};
    }
    .markdown-export-body hr { border: 0; border-top: 1px solid var(--line); margin: 2em 0; }
    .markdown-export-body img {
      display: block;
      max-width: 100%;
      max-height: ${settings.orientation === 'landscape' ? '140mm' : '210mm'};
      width: auto;
      height: auto;
      margin: 1.1em auto;
      object-fit: contain;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .markdown-export-body code {
      padding: 0.12em 0.34em;
      border-radius: 4px;
      background: var(--surface-alt);
      font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
      font-size: 0.9em;
    }
    .code-block-shell {
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: ${isLight ? '#f6f8fa' : '#0d1117'};
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .code-block-lang,
    .mermaid-block-lang {
      display: inline-flex;
      margin: 10px 12px 0;
      padding: 3px 8px;
      border-radius: 4px;
      background: ${isLight ? '#e9eef5' : 'rgba(148, 163, 184, 0.16)'};
      color: var(--muted);
      font: 700 10px/1.2 "Segoe UI", system-ui, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    .markdown-export-body pre { overflow: visible; }
    .markdown-export-body pre code {
      display: block;
      padding: 14px 16px 18px;
      background: transparent;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .markdown-export-body table { width: 100%; border-collapse: collapse; page-break-inside: avoid; break-inside: avoid; }
    .markdown-export-body th,
    .markdown-export-body td { padding: 8px 10px; border: 1px solid var(--line); vertical-align: top; }
    .markdown-export-body th { background: var(--surface-alt); text-align: left; }
    .katex-block {
      display: flex;
      justify-content: center;
      padding: 12px;
      overflow-x: auto;
      background: var(--surface-alt);
      border-radius: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .markdown-export-toc {
      margin: 0 0 28px;
      padding: 18px 20px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface-alt);
      page-break-inside: auto;
      break-inside: auto;
    }
    .toc-title { margin-bottom: 10px; color: var(--muted); font-weight: 760; }
    .markdown-export-toc ol { margin: 0; padding: 0; list-style: none; }
    .markdown-export-toc.long-toc ol {
      column-count: 2;
      column-gap: 24px;
    }
    .markdown-export-toc li {
      margin: 5px 0;
      padding-left: calc(var(--toc-indent) * 16px);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .markdown-export-toc a { color: var(--text); }
    .mermaid-wrapper {
      margin: ${settings.mermaidDensity === 'compact' ? '0.75em' : '1.2em'} 0;
      padding: ${settings.mermaidDensity === 'compact' ? '10px' : '16px'};
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface-alt);
      overflow: visible;
      page-break-inside: ${settings.mermaidOversize === 'page-break' ? 'avoid' : 'auto'};
      break-inside: ${settings.mermaidOversize === 'page-break' ? 'avoid' : 'auto'};
    }
    .mermaid-wrapper svg {
      display: block;
      width: auto;
      max-width: 100%;
      height: auto;
      max-height: ${settings.mermaidScaleMode === 'fit-page' ? 'var(--mermaid-max-height)' : 'none'};
      margin: 10px auto 0;
      overflow: visible;
    }
    .mermaid text,
    .mermaid .label,
    .mermaid .nodeLabel,
    .mermaid .edgeLabel,
    .mermaid foreignObject { color: var(--text) !important; fill: var(--text) !important; }
    ${numberingCss}
    @page {
      size: ${settings.pageSize} ${settings.orientation};
      margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
    }
    @media print {
      html, body { background: var(--surface); }
      body { padding: 0; }
      .markdown-export-page {
        width: 100%;
        max-width: none;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
      a { color: inherit; text-decoration: none; }
      .markdown-export-toc {
        margin-bottom: 18px;
        padding: 12px 14px;
      }
      .markdown-export-toc.long-toc ol {
        column-count: 2;
        column-gap: 18px;
      }
      .markdown-export-toc li {
        margin: 3px 0;
      }
    }
  </style>
</head>
<body>
  <main class="markdown-export-page">
    ${settings.includeTitle ? `<h1 class="markdown-export-title">${escapeHtml(title)}</h1>` : ''}
    <article class="markdown-export-body">${bodyHtml}</article>
  </main>
  <script>
    (() => {
      const oversize = ${JSON.stringify(settings.mermaidOversize)};
      const mode = ${JSON.stringify(settings.mermaidScaleMode)};
      const globalScale = ${JSON.stringify(scalePercent / 100)};
      const wrappers = Array.from(document.querySelectorAll('.mermaid-wrapper'));
      const minScale = 0.35;

      function sizeOf(svg) {
        const box = svg.viewBox && svg.viewBox.baseVal;
        if (box && box.width && box.height) return { width: box.width, height: box.height };
        return {
          width: Number(svg.getAttribute('width')) || svg.getBoundingClientRect().width,
          height: Number(svg.getAttribute('height')) || svg.getBoundingClientRect().height
        };
      }

      wrappers.forEach((wrapper) => {
        const svg = wrapper.querySelector('svg');
        if (!svg) return;
        svg.removeAttribute('width');
        svg.removeAttribute('height');

        const availableWidth = Math.max(1, wrapper.clientWidth - 4);
        const probe = document.createElement('div');
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        probe.style.height = getComputedStyle(document.documentElement).getPropertyValue('--mermaid-max-height').trim() || '235mm';
        document.body.appendChild(probe);
        const availableHeight = mode === 'fit-page' ? probe.getBoundingClientRect().height : Infinity;
        probe.remove();

        const size = sizeOf(svg);
        if (!size.width || !size.height) return;

        const widthScale = availableWidth / size.width;
        const heightScale = availableHeight / size.height;
        const fitScale = oversize === 'scale' ? Math.min(1, widthScale, heightScale) : 1;
        const scale = Math.max(minScale, Math.min(fitScale, fitScale * globalScale));
        if (scale < 1) {
          svg.style.setProperty('width', \`\${size.width * scale}px\`, 'important');
          svg.style.setProperty('height', \`\${size.height * scale}px\`, 'important');
        }
      });
    })();
  </script>
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

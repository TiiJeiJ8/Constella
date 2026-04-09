import { buildPrintableDocumentHtml, deriveDocumentTitle, renderMarkdownToHtml, sanitizeFilename, stripMarkdownSyntax } from './markdownRender'

export type ExportableDocumentKind = 'markdown' | 'text'
export type DocumentExportFormat = 'md' | 'txt' | 'pdf'
export type ExportTheme = 'light' | 'dark'
export type ExportPanelThemeMode = 'current' | ExportTheme
export type ExportPdfOrientation = 'portrait' | 'landscape'
export type ExportTextMode = 'plain' | 'source'
export type ExportPdfMermaidOversize = 'scale' | 'page-break'
export type ExportPdfMermaidScaleMode = 'fit-page' | 'fit-width'
export type ExportPdfMermaidDensity = 'standard' | 'compact'

export const EXPORT_PDF_MERMAID_SCALE_MIN = 70
export const EXPORT_PDF_MERMAID_SCALE_MAX = 110
export const EXPORT_PDF_MERMAID_SCALE_STEP = 5

export interface ExportPanelSettings {
    format: DocumentExportFormat
    fileName: string
    pdfTheme: ExportPanelThemeMode
    pdfOrientation: ExportPdfOrientation
    pdfIncludeTitle: boolean
    pdfMermaidOversize: ExportPdfMermaidOversize
    pdfMermaidScaleMode: ExportPdfMermaidScaleMode
    pdfMermaidScalePercent: number
    pdfMermaidDensity: ExportPdfMermaidDensity
    txtMode: ExportTextMode
}

export interface ExportDocumentOptions {
    kind: ExportableDocumentKind
    content: string
    title?: string
    fileName?: string
    theme?: ExportTheme
    includeTitle?: boolean
    orientation?: ExportPdfOrientation
    mermaidOversize?: ExportPdfMermaidOversize
    mermaidScaleMode?: ExportPdfMermaidScaleMode
    mermaidScalePercent?: number
    mermaidDensity?: ExportPdfMermaidDensity
    textMode?: ExportTextMode
}

export interface ExportDocumentResult {
    canceled?: boolean
    fileName?: string
    filePath?: string
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

function normalizeLineEndings(value: string) {
    return value.replace(/\r?\n/g, '\r\n')
}

function buildFilename(title: string, format: DocumentExportFormat) {
    return `${sanitizeFilename(title)}.${format}`
}

function openPrintWindow() {
    return window.open('', '_blank', 'width=1100,height=900')
}

async function exportAsPdf({
    kind,
    content,
    title,
    fileName,
    theme,
    includeTitle,
    orientation,
    mermaidOversize,
    mermaidScaleMode,
    mermaidScalePercent,
    mermaidDensity
}: {
    kind: ExportableDocumentKind
    content: string
    title: string
    fileName: string
    theme: ExportTheme
    includeTitle: boolean
    orientation: ExportPdfOrientation
    mermaidOversize: ExportPdfMermaidOversize
    mermaidScaleMode: ExportPdfMermaidScaleMode
    mermaidScalePercent: number
    mermaidDensity: ExportPdfMermaidDensity
}): Promise<ExportDocumentResult> {
    const bodyHtml = kind === 'markdown'
        ? await renderMarkdownToHtml(content, { consumeLeadingTitle: includeTitle ? title : undefined, theme })
        : `<pre class="plain-text-document">${content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')}</pre>`

    const html = buildPrintableDocumentHtml(title, bodyHtml, {
        theme,
        includeTitle,
        orientation,
        mermaidOversize,
        mermaidScaleMode,
        mermaidScalePercent,
        mermaidDensity
    })

    if (window.electron?.exportDocumentPdf) {
        return window.electron.exportDocumentPdf({
            html,
            fileName: buildFilename(fileName, 'pdf'),
            orientation
        })
    }

    const printWindow = openPrintWindow()
    if (!printWindow) {
        throw new Error('Unable to open print window')
    }

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()

    window.setTimeout(() => {
        printWindow.focus()
        printWindow.print()
    }, 350)

    return {
        canceled: false,
        fileName: buildFilename(fileName, 'pdf')
    }
}

export async function exportDocument(format: DocumentExportFormat, options: ExportDocumentOptions): Promise<ExportDocumentResult> {
    const content = options.content || ''
    const title = options.title || deriveDocumentTitle(content, options.kind)
    const fileName = sanitizeFilename(options.fileName || title)
    const theme = options.theme === 'light' ? 'light' : 'dark'
    const includeTitle = options.includeTitle ?? true
    const orientation = options.orientation ?? 'portrait'
    const mermaidOversize = options.mermaidOversize ?? 'scale'
    const mermaidScaleMode = options.mermaidScaleMode ?? 'fit-page'
    const mermaidScalePercent = Math.min(
        EXPORT_PDF_MERMAID_SCALE_MAX,
        Math.max(EXPORT_PDF_MERMAID_SCALE_MIN, options.mermaidScalePercent ?? 100)
    )
    const mermaidDensity = options.mermaidDensity ?? 'compact'
    const textMode = options.textMode ?? 'plain'

    if (format === 'md') {
        if (options.kind !== 'markdown') {
            throw new Error('MD export is only available for markdown content')
        }

        downloadBlob(
            new Blob([normalizeLineEndings(content)], { type: 'text/markdown;charset=utf-8' }),
            buildFilename(fileName, 'md')
        )
        return {
            canceled: false,
            fileName: buildFilename(fileName, 'md')
        }
    }

    if (format === 'txt') {
        const plainText = options.kind === 'markdown'
            ? (textMode === 'source' ? content : stripMarkdownSyntax(content))
            : content
        downloadBlob(
            new Blob([normalizeLineEndings(plainText)], { type: 'text/plain;charset=utf-8' }),
            buildFilename(fileName, 'txt')
        )
        return {
            canceled: false,
            fileName: buildFilename(fileName, 'txt')
        }
    }

    return exportAsPdf({
        kind: options.kind,
        content,
        title,
        fileName,
        theme,
        includeTitle,
        orientation,
        mermaidOversize,
        mermaidScaleMode,
        mermaidScalePercent,
        mermaidDensity
    })
}

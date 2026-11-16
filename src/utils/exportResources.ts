import katexCss from 'katex/dist/katex.min.css?raw'

// Data URLs keep formula fonts available in Electron's data: document and offline print windows.
const fonts = import.meta.glob<string>('/node_modules/katex/dist/fonts/*.woff2', {
    eager: true,
    query: '?inline',
    import: 'default'
})

export const katexExportCss = katexCss.replace(/src:([^}]+)}/g, (declaration, sources: string) => {
    const font = /url\(fonts\/([^()]+\.woff2)\)/.exec(sources)?.[1]
    if (!font) return declaration
    const dataUrl = fonts[`/node_modules/katex/dist/fonts/${font}`]
    if (!dataUrl) throw new Error(`Missing KaTeX export font: ${font}`)
    return `src:url("${dataUrl}") format("woff2")}`
})

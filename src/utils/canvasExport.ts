/**
 * 画布导出工具
 * 支持导出为 PNG 和 SVG 格式
 */

import Konva from 'konva'

export interface ExportOptions {
    /** 导出格式 */
    format: 'png' | 'svg'
    /** 缩放比例 (1 = 100%) */
    scale?: number
    /** 背景颜色 (null = 透明) */
    backgroundColor?: string | null
    /** 是否包含网格 */
    includeGrid?: boolean
    /** 自定义文件名 */
    filename?: string
    /** 导出区域 (null = 自动计算) */
    region?: {
        x: number
        y: number
        width: number
        height: number
    } | null
    /** 边距 */
    padding?: number
}

const defaultOptions: Required<ExportOptions> = {
    format: 'png',
    scale: 2,
    backgroundColor: '#ffffff',
    includeGrid: false,
    filename: 'canvas-export',
    region: null,
    padding: 20
}

/**
 * 计算所有节点的边界框
 */
function calculateBounds(nodes: Array<{ x: number; y: number; width: number; height: number }>) {
    if (nodes.length === 0) {
        return { x: 0, y: 0, width: 800, height: 600 }
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    nodes.forEach(node => {
        minX = Math.min(minX, node.x)
        minY = Math.min(minY, node.y)
        maxX = Math.max(maxX, node.x + node.width)
        maxY = Math.max(maxY, node.y + node.height)
    })

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    }
}

/**
 * 导出 Stage 为 PNG
 */
export async function exportToPNG(
    stage: Konva.Stage,
    nodes: Array<{ x: number; y: number; width: number; height: number }>,
    options: Partial<ExportOptions> = {}
): Promise<void> {
    const opts = { ...defaultOptions, ...options }

    // 计算导出区域
    const bounds = opts.region || calculateBounds(nodes)
    const exportX = bounds.x - opts.padding
    const exportY = bounds.y - opts.padding
    const exportWidth = bounds.width + opts.padding * 2
    const exportHeight = bounds.height + opts.padding * 2

    // 保存当前状态
    const originalX = stage.x()
    const originalY = stage.y()
    const originalScaleX = stage.scaleX()
    const originalScaleY = stage.scaleY()

    try {
        // 调整 Stage 位置和缩放
        stage.position({ x: -exportX * opts.scale, y: -exportY * opts.scale })
        stage.scale({ x: opts.scale, y: opts.scale })
        stage.batchDraw()

        // 导出为 DataURL
        const dataURL = stage.toDataURL({
            x: 0,
            y: 0,
            width: exportWidth * opts.scale,
            height: exportHeight * opts.scale,
            pixelRatio: 1,
            mimeType: 'image/png'
        })

        // 下载文件
        downloadFile(dataURL, `${opts.filename}.png`)

        console.log('[Export] PNG exported successfully')
    } finally {
        // 恢复状态
        stage.position({ x: originalX, y: originalY })
        stage.scale({ x: originalScaleX, y: originalScaleY })
        stage.batchDraw()
    }
}

/**
 * 导出 Stage 为 SVG
 * 注意: Konva 不直接支持 SVG 导出，这里生成简化的 SVG
 */
export async function exportToSVG(
    nodes: Array<{
        id: string
        x: number
        y: number
        width: number
        height: number
        fill?: string
        stroke?: string
        content?: { kind: string; data?: string }
    }>,
    edges: Array<{
        id: string
        sourceId: string
        targetId: string
        color?: string
        strokeWidth?: number
        type?: string
    }>,
    options: Partial<ExportOptions> = {}
): Promise<void> {
    const opts = { ...defaultOptions, ...options }

    // 计算边界
    const bounds = opts.region || calculateBounds(nodes)
    const padding = opts.padding
    const width = bounds.width + padding * 2
    const height = bounds.height + padding * 2
    const offsetX = bounds.x - padding
    const offsetY = bounds.y - padding

    // 构建 SVG
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${width}" 
     height="${height}" 
     viewBox="${offsetX} ${offsetY} ${width} ${height}">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#666666" />
    </marker>
  </defs>
  
  <!-- Background -->
  ${opts.backgroundColor ? `<rect x="${offsetX}" y="${offsetY}" width="${width}" height="${height}" fill="${opts.backgroundColor}" />` : ''}
  
  <!-- Edges -->
  <g class="edges">
`

    // 添加边
    edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.sourceId)
        const targetNode = nodes.find(n => n.id === edge.targetId)

        if (sourceNode && targetNode) {
            const x1 = sourceNode.x + sourceNode.width / 2
            const y1 = sourceNode.y + sourceNode.height / 2
            const x2 = targetNode.x + targetNode.width / 2
            const y2 = targetNode.y + targetNode.height / 2

            const color = edge.color || '#666666'
            const strokeWidth = edge.strokeWidth || 2

            if (edge.type === 'bezier') {
                // 贝塞尔曲线 - 使用中点作为控制点的 x 坐标
                const ctrlX = (x1 + x2) / 2
                const ctrlY1 = y1
                const ctrlY2 = y2
                svg += `    <path d="M ${x1} ${y1} C ${ctrlX} ${ctrlY1}, ${ctrlX} ${ctrlY2}, ${x2} ${y2}" 
          stroke="${color}" stroke-width="${strokeWidth}" fill="none" marker-end="url(#arrowhead)" />
`
            } else {
                // 直线
                svg += `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
          stroke="${color}" stroke-width="${strokeWidth}" marker-end="url(#arrowhead)" />
`
            }
        }
    })

    svg += `  </g>
  
  <!-- Nodes -->
  <g class="nodes">
`

    // 添加节点
    nodes.forEach(node => {
        const fill = node.fill || '#667eea'
        const stroke = node.stroke || '#5568d3'

        svg += `    <g class="node" id="${node.id}">
      <rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" 
            rx="8" ry="8" fill="${fill}" stroke="${stroke}" stroke-width="2" />
`

        // 添加文本内容（如果有）
        const contentData = node.content?.data
        if (contentData && typeof contentData === 'string') {
            const lines = contentData.split('\n')
            const text = lines[0]?.slice(0, 30) || ''
            const textX = node.x + node.width / 2
            const textY = node.y + node.height / 2
            svg += `      <text x="${textX}" y="${textY}" 
            text-anchor="middle" dominant-baseline="middle" 
            fill="white" font-size="14" font-family="Arial, sans-serif">${escapeXml(text)}</text>
`
        }

        svg += `    </g>
`
    })

    svg += `  </g>
</svg>`

    // 下载文件
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    downloadFile(url, `${opts.filename}.svg`)
    URL.revokeObjectURL(url)

    console.log('[Export] SVG exported successfully')
}

/**
 * 下载文件
 */
function downloadFile(url: string, filename: string) {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

/**
 * 导出画布
 */
export async function exportCanvas(
    stage: Konva.Stage | null,
    nodes: Array<any>,
    edges: Array<any>,
    options: Partial<ExportOptions> = {}
): Promise<void> {
    const opts = { ...defaultOptions, ...options }

    if (opts.format === 'svg') {
        await exportToSVG(nodes, edges, opts)
    } else if (stage) {
        await exportToPNG(stage, nodes, opts)
    } else {
        console.error('[Export] No stage available for PNG export')
    }
}

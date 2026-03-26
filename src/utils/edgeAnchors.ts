export interface EdgeAnchorNodeRect {
    x: number
    y: number
    width: number
    height: number
    rotation?: number
}

interface AnchorOptions {
    inset?: number
}

interface Point {
    x: number
    y: number
}

function getNodeCenter(node: EdgeAnchorNodeRect, inset = 0): Point {
    return {
        x: node.x + inset + (node.width - inset * 2) / 2,
        y: node.y + inset + (node.height - inset * 2) / 2
    }
}

function rotatePoint(point: Point, center: Point, angleDeg: number): Point {
    if (!angleDeg) return point

    const rad = angleDeg * Math.PI / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const dx = point.x - center.x
    const dy = point.y - center.y

    return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos
    }
}

function toLocal(point: Point, center: Point, rotation: number): Point {
    return rotatePoint(point, center, -rotation)
}

function toWorld(point: Point, center: Point, rotation: number): Point {
    return rotatePoint(point, center, rotation)
}

export function getAnchorPoint(
    node: EdgeAnchorNodeRect,
    anchor: string,
    otherNode: EdgeAnchorNodeRect | null,
    options: AnchorOptions = {}
): Point {
    const inset = Math.max(0, options.inset || 0)
    const topLeft = {
        x: node.x + inset,
        y: node.y + inset
    }
    const width = Math.max(0, node.width - inset * 2)
    const height = Math.max(0, node.height - inset * 2)
    const center = getNodeCenter(node, inset)
    const rotation = node.rotation || 0
    const halfWidth = width / 2
    const halfHeight = height / 2

    switch (anchor) {
        case 'top':
            return toWorld({ x: topLeft.x + halfWidth, y: topLeft.y }, topLeft, rotation)
        case 'right':
            return toWorld({ x: topLeft.x + width, y: topLeft.y + halfHeight }, topLeft, rotation)
        case 'bottom':
            return toWorld({ x: topLeft.x + halfWidth, y: topLeft.y + height }, topLeft, rotation)
        case 'left':
            return toWorld({ x: topLeft.x, y: topLeft.y + halfHeight }, topLeft, rotation)
    }

    if (!otherNode) {
        return center
    }

    const otherCenter = getNodeCenter(otherNode)
    const otherLocal = toLocal(otherCenter, topLeft, rotation)
    const dx = otherLocal.x - center.x
    const dy = otherLocal.y - center.y

    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
        return center
    }

    let tX = Infinity
    let tY = Infinity

    if (dx !== 0) {
        tX = halfWidth / Math.abs(dx)
    }

    if (dy !== 0) {
        tY = halfHeight / Math.abs(dy)
    }

    const t = Math.min(tX, tY)
    const localHit = {
        x: center.x + dx * t,
        y: center.y + dy * t
    }

    return toWorld(localHit, topLeft, rotation)
}

/**
 * 光标插帧管理器
 * 用于平滑远程光标移动，采用线性插值 + RAF 优化性能
 */

export interface CursorPosition {
    x: number
    y: number
}

export interface InterpolatedCursor {
    clientId: number
    current: CursorPosition
    target: CursorPosition
    lastUpdateTime: number
}

/**
 * 光标插帧管理类
 */
export class CursorInterpolationManager {
    private cursors: Map<number, InterpolatedCursor> = new Map()
    private rafId: number | null = null
    private isAnimating: boolean = false
    private readonly INTERPOLATION_SPEED = 0.2 // 插值速度 (0-1)，越大越快
    private readonly DEAD_ZONE = 1 // 小于此距离则直接跳转
    private readonly MAX_DISTANCE = 500 // 超过此距离直接跳转（防止延迟过大）
    private readonly IDLE_THRESHOLD = 16 // 16ms 无变化则停止动画（约1帧）
    private onUpdateCallback: ((cursors: Map<number, CursorPosition>) => void) | null = null

    /**
     * 更新光标目标位置
     */
    updateCursor(clientId: number, target: CursorPosition) {
        const now = Date.now()
        const existing = this.cursors.get(clientId)

        if (!existing) {
            // 新光标，直接设置当前位置为目标位置
            this.cursors.set(clientId, {
                clientId,
                current: { ...target },
                target: { ...target },
                lastUpdateTime: now
            })
            this.triggerUpdate()
            return
        }

        // 计算距离
        const dx = target.x - existing.current.x
        const dy = target.y - existing.current.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        // 如果距离太小或太大，直接跳转
        if (distance < this.DEAD_ZONE || distance > this.MAX_DISTANCE) {
            existing.current = { ...target }
            existing.target = { ...target }
            existing.lastUpdateTime = now
            this.triggerUpdate()
            return
        }

        // 更新目标位置和时间戳
        existing.target = { ...target }
        existing.lastUpdateTime = now

        // 启动动画循环
        this.startAnimation()
    }

    /**
     * 移除光标
     */
    removeCursor(clientId: number) {
        this.cursors.delete(clientId)
        
        // 如果没有光标了，停止动画
        if (this.cursors.size === 0) {
            this.stopAnimation()
        }
    }

    /**
     * 清空所有光标
     */
    clear() {
        this.cursors.clear()
        this.stopAnimation()
    }

    /**
     * 设置更新回调
     */
    onUpdate(callback: (cursors: Map<number, CursorPosition>) => void) {
        this.onUpdateCallback = callback
    }

    /**
     * 启动动画循环
     */
    private startAnimation() {
        if (this.isAnimating) return

        this.isAnimating = true
        this.animate()
    }

    /**
     * 停止动画循环
     */
    private stopAnimation() {
        this.isAnimating = false
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId)
            this.rafId = null
        }
    }

    /**
     * 动画循环
     */
    private animate = () => {
        if (!this.isAnimating) return

        const now = Date.now()
        let hasMovement = false

        // 更新每个光标的当前位置
        this.cursors.forEach(cursor => {
            const dx = cursor.target.x - cursor.current.x
            const dy = cursor.target.y - cursor.current.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            // 如果距离小于死区，直接设置为目标位置
            if (distance < this.DEAD_ZONE) {
                cursor.current.x = cursor.target.x
                cursor.current.y = cursor.target.y
            } else {
                // 线性插值
                cursor.current.x += dx * this.INTERPOLATION_SPEED
                cursor.current.y += dy * this.INTERPOLATION_SPEED
                hasMovement = true
            }
        })

        // 触发更新回调
        this.triggerUpdate()

        // 如果还有移动，继续动画；否则检查是否空闲过久
        if (hasMovement) {
            this.rafId = requestAnimationFrame(this.animate)
        } else {
            // 检查是否所有光标都已空闲
            const allIdle = Array.from(this.cursors.values()).every(
                cursor => now - cursor.lastUpdateTime > this.IDLE_THRESHOLD
            )

            if (allIdle) {
                this.stopAnimation()
            } else {
                this.rafId = requestAnimationFrame(this.animate)
            }
        }
    }

    /**
     * 触发更新回调
     */
    private triggerUpdate() {
        if (!this.onUpdateCallback) return

        const positions = new Map<number, CursorPosition>()
        this.cursors.forEach((cursor, clientId) => {
            positions.set(clientId, { ...cursor.current })
        })

        this.onUpdateCallback(positions)
    }

    /**
     * 获取当前光标位置（用于调试）
     */
    getCurrentPositions(): Map<number, CursorPosition> {
        const positions = new Map<number, CursorPosition>()
        this.cursors.forEach((cursor, clientId) => {
            positions.set(clientId, { ...cursor.current })
        })
        return positions
    }

    /**
     * 销毁管理器
     */
    destroy() {
        this.stopAnimation()
        this.cursors.clear()
        this.onUpdateCallback = null
    }
}

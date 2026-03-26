type ScheduledTask = {
    fn: () => void
    minInterval: number
    trailing: boolean
}

type ScheduledState = {
    lastRunAt: number
    task: ScheduledTask | null
}

export function useUnifiedRafScheduler() {
    const states = new Map<string, ScheduledState>()
    let rafId: number | null = null

    const ensureLoop = () => {
        if (rafId !== null) return
        rafId = window.requestAnimationFrame(flush)
    }

    const flush = (now: number) => {
        rafId = null
        let hasPendingTask = false

        states.forEach((state, key) => {
            if (!state.task) return

            const elapsed = now - state.lastRunAt
            if (elapsed >= state.task.minInterval) {
                const fn = state.task.fn
                const trailing = state.task.trailing
                state.task = null
                state.lastRunAt = now
                fn()

                if (trailing && state.task) {
                    hasPendingTask = true
                }
            } else {
                hasPendingTask = true
            }

            if (!state.task && state.lastRunAt > 0 && now - state.lastRunAt > 3000) {
                states.delete(key)
            }
        })

        if (hasPendingTask) {
            ensureLoop()
        }
    }

    const schedule = (
        key: string,
        fn: () => void,
        options: { minInterval?: number; trailing?: boolean } = {}
    ) => {
        const minInterval = Math.max(0, Number(options.minInterval ?? 0))
        const trailing = options.trailing !== false
        const existing = states.get(key)

        if (existing) {
            existing.task = { fn, minInterval, trailing }
        } else {
            states.set(key, {
                lastRunAt: 0,
                task: { fn, minInterval, trailing }
            })
        }

        ensureLoop()
    }

    const cancel = (key: string) => {
        states.delete(key)
    }

    const cancelAll = () => {
        states.clear()
        if (rafId !== null) {
            window.cancelAnimationFrame(rafId)
            rafId = null
        }
    }

    return {
        schedule,
        cancel,
        cancelAll
    }
}

export function createNodePositionHash(node: {
    x?: number
    y?: number
    width?: number
    height?: number
    rotation?: number
}) {
    const x = Number(node?.x) || 0
    const y = Number(node?.y) || 0
    const width = Number(node?.width) || 0
    const height = Number(node?.height) || 0
    const rotation = Number(node?.rotation) || 0
    return `${x.toFixed(2)}|${y.toFixed(2)}|${width.toFixed(2)}|${height.toFixed(2)}|${rotation.toFixed(2)}`
}

type EdgeBounds = {
    minX: number
    minY: number
    maxX: number
    maxY: number
}

type EdgeCacheEntry = {
    hash: string
    bounds: EdgeBounds | null
}

export function createEdgeBoundsCache() {
    const cache = new Map<string, EdgeCacheEntry>()

    const getOrCompute = (
        edgeId: string,
        hash: string,
        compute: () => EdgeBounds | null
    ): EdgeBounds | null => {
        const entry = cache.get(edgeId)
        if (entry && entry.hash === hash) {
            return entry.bounds
        }

        const bounds = compute()
        cache.set(edgeId, { hash, bounds })
        return bounds
    }

    const prune = (validEdgeIds: Set<string>) => {
        Array.from(cache.keys()).forEach((edgeId) => {
            if (!validEdgeIds.has(edgeId)) {
                cache.delete(edgeId)
            }
        })
    }

    const clear = () => {
        cache.clear()
    }

    return {
        getOrCompute,
        prune,
        clear
    }
}

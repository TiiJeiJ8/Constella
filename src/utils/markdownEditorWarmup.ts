const loadMarkdownEditorComponent = () => import('@/components/canvas/MarkdownNodeEditorModalNext.vue')

let warmupPromise: Promise<void> | null = null

export function loadMarkdownEditorNext() {
    return loadMarkdownEditorComponent()
}

export function warmupMarkdownEditor() {
    if (warmupPromise) return warmupPromise

    warmupPromise = Promise.all([
        loadMarkdownEditorComponent(),
        import('@muyajs/core')
    ])
        .then(() => undefined)
        .catch(error => {
            warmupPromise = null
            throw error
        })

    return warmupPromise
}

export function scheduleMarkdownEditorWarmup(options: { delayMs?: number; timeoutMs?: number } = {}) {
    if (typeof window === 'undefined') return

    const { delayMs = 0, timeoutMs = 1800 } = options
    const run = () => {
        const requestIdle = window.requestIdleCallback as typeof window.requestIdleCallback | undefined
        const warm = () => {
            void warmupMarkdownEditor().catch(error => {
                console.warn('[MarkdownEditorWarmup] preload failed:', error)
            })
        }

        if (requestIdle) {
            requestIdle(warm, { timeout: timeoutMs })
        } else {
            window.setTimeout(warm, Math.min(timeoutMs, 700))
        }
    }

    if (delayMs > 0) {
        window.setTimeout(run, delayMs)
    } else {
        run()
    }
}

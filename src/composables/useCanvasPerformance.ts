import { computed, onUnmounted, ref, watch } from 'vue'

const DEFAULT_MARKDOWN_LOD_SCALE_THRESHOLD = 0.6
const MIN_MARKDOWN_LOD_SCALE_THRESHOLD = 0.1
const MAX_MARKDOWN_LOD_SCALE_THRESHOLD = 3
const LONG_FRAME_THRESHOLD_MS = 32

type PerformanceSettingsInput = {
    showCanvasPerformancePanel?: boolean
    markdownLodScaleThreshold?: number
}

interface UseCanvasPerformanceOptions {
    getVisibleNodeCount: () => number
    getCurrentSyncTick: () => number
}

function normalizeMarkdownLodScaleThreshold(value: unknown) {
    const n = Number(value)
    if (!Number.isFinite(n)) return DEFAULT_MARKDOWN_LOD_SCALE_THRESHOLD
    return Math.max(MIN_MARKDOWN_LOD_SCALE_THRESHOLD, Math.min(MAX_MARKDOWN_LOD_SCALE_THRESHOLD, n))
}

function getPerformanceSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}')
        const performance = settings.performance || {}

        return {
            showCanvasPerformancePanel: performance.showCanvasPerformancePanel !== false,
            markdownLodScaleThreshold: normalizeMarkdownLodScaleThreshold(performance.markdownLodScaleThreshold)
        }
    } catch {
        return {
            showCanvasPerformancePanel: true,
            markdownLodScaleThreshold: DEFAULT_MARKDOWN_LOD_SCALE_THRESHOLD
        }
    }
}

export function useCanvasPerformance(options: UseCanvasPerformanceOptions) {
    const { getVisibleNodeCount, getCurrentSyncTick } = options
    const performanceSettings = getPerformanceSettings()

    const showCanvasPerformancePanel = ref(performanceSettings.showCanvasPerformancePanel)
    const markdownLodScaleThreshold = ref(performanceSettings.markdownLodScaleThreshold)
    const isDevPerformancePanelVisible = computed(() => import.meta.env.DEV && showCanvasPerformancePanel.value)

    const visibleNodeCount = ref(0)
    const visibleEdgeCount = ref(0)
    const syncsPerSecond = ref(0)
    const frameCostMs = ref(0)
    const fps = ref(0)
    const longFrameCount = ref(0)

    let performanceSyncTimer: ReturnType<typeof setInterval> | null = null
    let performanceRafId: number | null = null
    let renderStatsRafId: number | null = null
    let lastSyncTick = 0
    let lastFrameTimestamp = 0
    let frameDurationSum = 0
    let frameSampleCount = 0
    let frameWindowStart = 0
    let pendingRenderStats: { visibleNodes: number; visibleEdges: number } | null = null

    function scheduleFrame(callback: FrameRequestCallback) {
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            return window.requestAnimationFrame(callback)
        }

        return window.setTimeout(() => callback(Date.now()), 16)
    }

    function cancelFrame(frameId: number | null) {
        if (frameId === null) return

        if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
            window.cancelAnimationFrame(frameId)
            return
        }

        window.clearTimeout(frameId)
    }

    function flushRenderStats() {
        renderStatsRafId = null
        if (!pendingRenderStats) return

        visibleNodeCount.value = pendingRenderStats.visibleNodes
        visibleEdgeCount.value = pendingRenderStats.visibleEdges
        pendingRenderStats = null
    }

    function scheduleRenderStatsUpdate(stats: { visibleNodes?: number; visibleEdges?: number }) {
        pendingRenderStats = {
            visibleNodes: Number(stats?.visibleNodes) || 0,
            visibleEdges: Number(stats?.visibleEdges) || 0
        }

        if (renderStatsRafId !== null) return
        renderStatsRafId = scheduleFrame(() => flushRenderStats())
    }

    function handleRenderStats(stats: { visibleNodes?: number; visibleEdges?: number } | null | undefined) {
        scheduleRenderStatsUpdate(stats ?? {})
    }

    function startPerformanceMonitor() {
        if (!isDevPerformancePanelVisible.value) return

        stopPerformanceMonitor()

        visibleNodeCount.value = getVisibleNodeCount()
        visibleEdgeCount.value = 0
        longFrameCount.value = 0

        lastSyncTick = getCurrentSyncTick()
        performanceSyncTimer = window.setInterval(() => {
            const current = getCurrentSyncTick()
            const delta = current - lastSyncTick
            syncsPerSecond.value = delta >= 0 ? delta : current
            lastSyncTick = current
        }, 1000)

        const updateFrameStats = (timestamp: number) => {
            if (!lastFrameTimestamp) {
                lastFrameTimestamp = timestamp
                frameWindowStart = timestamp
            }

            const frameCost = timestamp - lastFrameTimestamp
            lastFrameTimestamp = timestamp

            if (frameCost > 0 && frameCost < 1000) {
                frameDurationSum += frameCost
                frameSampleCount += 1

                if (frameCost > LONG_FRAME_THRESHOLD_MS) {
                    longFrameCount.value += 1
                }
            }

            if (timestamp - frameWindowStart >= 1000) {
                const avgCost = frameSampleCount > 0 ? frameDurationSum / frameSampleCount : 0
                frameCostMs.value = Number(avgCost.toFixed(1))
                fps.value = avgCost > 0 ? Math.round(1000 / avgCost) : 0

                frameDurationSum = 0
                frameSampleCount = 0
                frameWindowStart = timestamp
            }

            performanceRafId = scheduleFrame(updateFrameStats)
        }

        performanceRafId = scheduleFrame(updateFrameStats)
    }

    function stopPerformanceMonitor() {
        if (performanceSyncTimer) {
            clearInterval(performanceSyncTimer)
            performanceSyncTimer = null
        }

        cancelFrame(performanceRafId)
        performanceRafId = null

        cancelFrame(renderStatsRafId)
        renderStatsRafId = null

        pendingRenderStats = null
        lastFrameTimestamp = 0
        frameDurationSum = 0
        frameSampleCount = 0
        frameWindowStart = 0
    }

    function applyPerformanceSettings(performance: PerformanceSettingsInput = {}) {
        showCanvasPerformancePanel.value = performance.showCanvasPerformancePanel !== false
        markdownLodScaleThreshold.value = normalizeMarkdownLodScaleThreshold(performance.markdownLodScaleThreshold)
    }

    let stopWatchingPerformancePanel: (() => void) | null = null
    let isDisposed = false

    queueMicrotask(() => {
        if (isDisposed) return
        stopWatchingPerformancePanel = watch(
            isDevPerformancePanelVisible,
            (visible) => {
                if (visible) {
                    startPerformanceMonitor()
                } else {
                    stopPerformanceMonitor()
                }
            },
            { immediate: true }
        )
    })

    onUnmounted(() => {
        isDisposed = true
        if (stopWatchingPerformancePanel) {
            stopWatchingPerformancePanel()
            stopWatchingPerformancePanel = null
        }
        stopPerformanceMonitor()
    })

    return {
        showCanvasPerformancePanel,
        markdownLodScaleThreshold,
        isDevPerformancePanelVisible,
        visibleNodeCount,
        visibleEdgeCount,
        syncsPerSecond,
        frameCostMs,
        fps,
        longFrameCount,
        longFrameThresholdMs: LONG_FRAME_THRESHOLD_MS,
        handleRenderStats,
        applyPerformanceSettings,
        startPerformanceMonitor,
        stopPerformanceMonitor
    }
}

<template>
    <div class="performance-panel">
        <div class="panel-title">{{ t('canvas.performance.title') }}</div>
        <div class="metric-row">
            <span class="metric-label">{{ t('canvas.performance.nodes') }}</span>
            <span class="metric-value">{{ totalNodes }}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">{{ t('canvas.performance.visibleNodes') }}</span>
            <span class="metric-value">{{ visibleNodes }}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">{{ t('canvas.performance.visibleEdges') }}</span>
            <span class="metric-value">{{ visibleEdges }}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">{{ t('canvas.performance.syncPerSecond') }}</span>
            <span class="metric-value">{{ syncsPerSecond }}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">{{ t('canvas.performance.frameCost') }}</span>
            <span class="metric-value">{{ frameCostMs.toFixed(1) }} ms</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">{{ t('canvas.performance.fps') }}</span>
            <span class="metric-value">{{ fps }}</span>
        </div>
        <div class="metric-row">
            <span class="metric-label">{{ t('canvas.performance.longFrames', { threshold: longFrameThresholdMs }) }}</span>
            <span class="metric-value">{{ longFrameCount }}</span>
        </div>
    </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
    totalNodes: {
        type: Number,
        default: 0
    },
    visibleNodes: {
        type: Number,
        default: 0
    },
    visibleEdges: {
        type: Number,
        default: 0
    },
    syncsPerSecond: {
        type: Number,
        default: 0
    },
    frameCostMs: {
        type: Number,
        default: 0
    },
    fps: {
        type: Number,
        default: 0
    },
    longFrameCount: {
        type: Number,
        default: 0
    },
    longFrameThresholdMs: {
        type: Number,
        default: 32
    }
})
</script>

<style scoped>
.performance-panel {
    position: absolute;
    left: 18px;
    bottom: 92px;
    width: 220px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--canvas-toolbar-bg);
    color: var(--text-primary);
    backdrop-filter: blur(6px);
    box-shadow: var(--shadow-md);
    z-index: 1200;
    pointer-events: none;
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
}

.panel-title {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: var(--accent-primary);
    margin-bottom: 8px;
}

.metric-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    line-height: 1.7;
}

.metric-label {
    color: var(--text-secondary);
}

.metric-value {
    color: var(--text-primary);
    font-weight: 600;
}
</style>

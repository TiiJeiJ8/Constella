<template>
    <div class="toolbox">
        <div class="tool-group">
            <button
                v-for="tool in tools"
                :key="tool.id"
                class="tool-btn"
                :class="{ active: activeTool === tool.id }"
                :title="tool.label"
                @click="$emit('tool-change', tool.id)"
            >
                <span class="tool-icon">{{ tool.icon }}</span>
            </button>
        </div>

        <div class="tool-divider"></div>

        <div class="tool-group">
            <button class="tool-btn" :title="t('canvas.toolbar.undo')">
                <span class="tool-icon">↶</span>
            </button>
            <button class="tool-btn" :title="t('canvas.toolbar.redo')">
                <span class="tool-icon">↷</span>
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
    activeTool: {
        type: String,
        default: 'select'
    }
})

defineEmits(['tool-change'])

const tools = computed(() => [
    { id: 'select', icon: '⬚', label: t('canvas.toolbar.select') },
    { id: 'pan', icon: '✋', label: t('canvas.toolbar.pan') },
    { id: 'node', icon: '📝', label: t('canvas.toolbar.node') },
    { id: 'edge', icon: '🔗', label: t('canvas.toolbar.edge') }
])
</script>

<style scoped>
.toolbox {
    position: absolute;
    left: 16px;
    top: 96px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 8px;
    background: var(--canvas-toolbar-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    box-shadow: var(--shadow-md);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 90;
}

.toolbox:hover {
    box-shadow: var(--shadow-lg);
}

.tool-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.tool-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--text-primary);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

.tool-btn:hover {
    background: var(--bg-tertiary);
    transform: scale(1.1);
}

.tool-btn.active {
    background: var(--color-primary);
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.tool-icon {
    font-size: 22px;
}

.tool-divider {
    width: 32px;
    height: 1px;
    background: var(--border-color);
    margin: 4px 0;
}

@media (max-width: 768px) {
    .toolbox {
        left: 12px;
        top: 84px;
        padding: 10px 6px;
        border-radius: 20px;
    }

    .tool-btn {
        width: 44px;
        height: 44px;
    }

    .tool-icon {
        font-size: 20px;
    }
}
</style>

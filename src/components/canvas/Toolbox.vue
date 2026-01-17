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
                <small v-if="tool.hotkey" class="hotkey">{{ tool.hotkey }}</small>
            </button>
        </div>

        <div class="tool-divider"></div>

        <div class="tool-group">
            <button 
                class="tool-btn" 
                :class="{ disabled: !canUndo }"
                :title="t('canvas.toolbar.undo')"
                :disabled="!canUndo"
                @click="$emit('undo')"
            >
                <span class="tool-icon">↶</span>
            </button>
            <button 
                class="tool-btn" 
                :class="{ disabled: !canRedo }"
                :title="t('canvas.toolbar.redo')"
                :disabled="!canRedo"
                @click="$emit('redo')"
            >
                <span class="tool-icon">↷</span>
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { activeTool, canUndo, canRedo, shortcuts } = defineProps({
    activeTool: {
        type: String,
        default: 'select'
    },
    canUndo: {
        type: Boolean,
        default: false
    },
    canRedo: {
        type: Boolean,
        default: false
    },
    shortcuts: {
        type: Object,
        default: () => ({ select: 'v', pan: 'p', node: 'n', edge: 'e' })
    }
})

defineEmits(['tool-change', 'undo', 'redo'])



const tools = computed(() => {
    // 使用父组件传入的响应式 shortcuts，回退到 localStorage 默认
    const map = (shortcuts && Object.keys(shortcuts).length > 0) ? shortcuts : (function(){
        try { return JSON.parse(localStorage.getItem('settings') || '{}').shortcuts || { select: 'v', pan: 'p', node: 'n', edge: 'e' }
        } catch (e) { return { select: 'v', pan: 'p', node: 'n', edge: 'e' } }
    })()

    return [
        { id: 'select', icon: '⬚', label: t('canvas.toolbar.select'), hotkey: (map.select || '').toUpperCase() },
        { id: 'pan', icon: '✋', label: t('canvas.toolbar.pan'), hotkey: (map.pan || '').toUpperCase() },
        { id: 'node', icon: '📝', label: t('canvas.toolbar.node'), hotkey: (map.node || '').toUpperCase() },
        { id: 'edge', icon: '🔗', label: t('canvas.toolbar.edge'), hotkey: (map.edge || '').toUpperCase() }
    ]
})
</script>

<style scoped>
.hotkey {
    position: absolute;
    right: 6px;
    bottom: 6px;
    background: rgba(0,0,0,0.08);
    color: var(--text-primary);
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 6px;
    line-height: 1;
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    user-select: none;
}
</style>

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

.tool-btn.disabled,
.tool-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
}

.tool-btn.disabled:hover,
.tool-btn:disabled:hover {
    background: transparent;
    transform: none;
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

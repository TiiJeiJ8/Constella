<template>
    <div class="toolbox">
        <div class="tool-group">
            <button
                v-for="tool in tools"
                :key="tool.id"
                class="tool-btn"
                :class="{ active: activeTool === tool.id, disabled: tool.disabled }"
                :title="tool.label"
                :disabled="tool.disabled"
                @click="$emit('tool-change', tool.id)"
            >
                <svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        v-for="(path, index) in tool.paths"
                        :key="index"
                        :d="path.d"
                        :fill="path.fill || 'none'"
                        :stroke="path.stroke || 'currentColor'"
                        :stroke-width="path.strokeWidth || 1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <circle
                        v-for="(circle, index) in tool.circles"
                        :key="`circle-${index}`"
                        :cx="circle.cx"
                        :cy="circle.cy"
                        :r="circle.r"
                        :fill="circle.fill || 'currentColor'"
                    />
                </svg>
                <small v-if="tool.hotkey" class="hotkey">{{ tool.hotkey }}</small>
            </button>
        </div>

        <div class="tool-divider"></div>

        <div class="tool-group">
            <button class="tool-btn" :class="{ disabled: !canUndo }" :title="t('canvas.toolbar.undo')" :disabled="!canUndo" @click="$emit('undo')">
                <svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 7 4.5 11.5 9 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                    <path d="M19 11.5H5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.9" />
                </svg>
            </button>
            <button class="tool-btn" :class="{ disabled: !canRedo }" :title="t('canvas.toolbar.redo')" :disabled="!canRedo" @click="$emit('redo')">
                <svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m15 7 4.5 4.5-4.5 4.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                    <path d="M5 11.5h14.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.9" />
                </svg>
            </button>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { activeTool, canEdit, canUndo, canRedo, shortcuts } = defineProps({
    activeTool: { type: String, default: 'select' },
    canEdit: { type: Boolean, default: true },
    canUndo: { type: Boolean, default: false },
    canRedo: { type: Boolean, default: false },
    shortcuts: { type: Object, default: () => ({ select: 'v', pan: 'p', node: 'n', edge: 'e' }) }
})

defineEmits(['tool-change', 'undo', 'redo'])

const TOOL_ICONS = {
    select: {
        paths: [{ d: 'M6 4.5 17.5 10.8 12.5 12.4 15.6 18.8 13.7 19.6 10.6 13.3 7.2 16.5Z' }],
        circles: []
    },
    pan: {
        paths: [
            { d: 'M12 4.5v15M4.5 12h15', strokeWidth: 1.6 },
            { d: 'm12 4.5 2 2M12 4.5l-2 2M19.5 12l-2-2M19.5 12l-2 2M12 19.5l2-2M12 19.5l-2-2M4.5 12l2-2M4.5 12l2 2', strokeWidth: 1.6 }
        ],
        circles: [{ cx: 12, cy: 12, r: 1.2 }]
    },
    node: {
        paths: [{ d: 'M6.5 7.5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z' }],
        circles: []
    },
    edge: {
        paths: [
            { d: 'M7 16.5c3-6 7-6 10-9', strokeWidth: 1.9 },
            { d: 'm15.7 7.5 2.8-.3-.8 2.7', strokeWidth: 1.9 }
        ],
        circles: [{ cx: 7, cy: 16.5, r: 1.7 }, { cx: 17.8, cy: 7.2, r: 1.7 }]
    }
}

const tools = computed(() => {
    const map = (shortcuts && Object.keys(shortcuts).length > 0)
        ? shortcuts
        : (() => {
            try {
                return JSON.parse(localStorage.getItem('settings') || '{}').shortcuts || { select: 'v', pan: 'p', node: 'n', edge: 'e' }
            } catch {
                return { select: 'v', pan: 'p', node: 'n', edge: 'e' }
            }
        })()

    return [
        { id: 'select', ...TOOL_ICONS.select, label: t('canvas.toolbar.select'), hotkey: (map.select || '').toUpperCase(), disabled: false },
        { id: 'pan', ...TOOL_ICONS.pan, label: t('canvas.toolbar.pan'), hotkey: (map.pan || '').toUpperCase(), disabled: false },
        { id: 'node', ...TOOL_ICONS.node, label: t('canvas.toolbar.node'), hotkey: (map.node || '').toUpperCase(), disabled: !canEdit },
        { id: 'edge', ...TOOL_ICONS.edge, label: t('canvas.toolbar.edge'), hotkey: (map.edge || '').toUpperCase(), disabled: !canEdit }
    ]
})
</script>

<style scoped>
.toolbox{position:absolute;left:16px;top:96px;z-index:90;display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 8px;background:var(--canvas-toolbar-bg);backdrop-filter:blur(20px);border:1px solid var(--border-color);border-radius:24px;box-shadow:var(--shadow-md);transition:all .3s cubic-bezier(.4,0,.2,1)}
.toolbox:hover{box-shadow:var(--shadow-lg)}
.tool-group{display:flex;flex-direction:column;gap:6px}
.tool-btn{position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:transparent;color:var(--text-primary);transition:all .3s cubic-bezier(.4,0,.2,1)}
.tool-btn:hover{background:var(--bg-tertiary);transform:scale(1.1)}
.tool-btn.active{background:var(--color-primary);color:#fff;box-shadow:0 4px 12px rgba(102,126,234,.4)}
.tool-btn.disabled,.tool-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.tool-btn.disabled:hover,.tool-btn:disabled:hover{background:transparent;transform:none}
.tool-icon{width:22px;height:22px;display:block}
.hotkey{position:absolute;right:6px;bottom:6px;padding:2px 6px;border-radius:6px;background:rgba(0,0,0,.08);color:var(--text-primary);font-size:10px;line-height:1;box-shadow:0 1px 2px rgba(0,0,0,.06);user-select:none}
.tool-divider{width:32px;height:1px;margin:4px 0;background:var(--border-color)}
@media (max-width:768px){.toolbox{left:12px;top:84px;padding:10px 6px;border-radius:20px}.tool-btn{width:44px;height:44px}.tool-icon{width:20px;height:20px}}
</style>

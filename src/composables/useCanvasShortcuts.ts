import { onMounted, onUnmounted, ref, type Ref } from 'vue'

interface ShortcutMap {
    select: string
    pan: string
    node: string
    edge: string
    [key: string]: string
}

interface UseCanvasShortcutsOptions {
    editingNodeId: Ref<string | null>
    applyPerformanceSettings: (settings?: Record<string, unknown>) => void
}

function getShortcutMap(): ShortcutMap {
    try {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}')
        return settings.shortcuts || { select: 'v', pan: 'p', node: 'n', edge: 'e' }
    } catch {
        return { select: 'v', pan: 'p', node: 'n', edge: 'e' }
    }
}

export function useCanvasShortcuts(options: UseCanvasShortcutsOptions) {
    const { editingNodeId, applyPerformanceSettings } = options

    const activeTool = ref('select')
    const userShortcuts = ref<ShortcutMap>(getShortcutMap())

    function handleToolChange(tool: string) {
        activeTool.value = tool
        console.log('[Canvas] Tool changed:', tool)
    }

    function handleSettingsUpdated(event: Event) {
        try {
            const settings = (event as CustomEvent).detail || {}
            userShortcuts.value = settings.shortcuts || getShortcutMap()

            const performance = settings.performance || {}
            applyPerformanceSettings({
                showCanvasPerformancePanel: performance.showCanvasPerformancePanel,
                markdownLodScaleThreshold: performance.markdownLodScaleThreshold,
                developerMode: settings.developerMode
            })
        } catch {
            userShortcuts.value = getShortcutMap()
            applyPerformanceSettings()
        }
    }

    function handleHotkey(event: KeyboardEvent) {
        const activeEl = document.activeElement as HTMLElement | null
        const isTyping = activeEl && (
            ['INPUT', 'TEXTAREA'].includes(activeEl.tagName) ||
            activeEl.isContentEditable ||
            !!editingNodeId.value
        )
        if (isTyping) return

        const key = event.key.toLowerCase()
        const shortcuts = userShortcuts.value || getShortcutMap()

        for (const tool of ['select', 'pan', 'node', 'edge']) {
            const mapped = (shortcuts[tool] || '').toLowerCase()
            if (mapped && mapped === key) {
                activeTool.value = tool
                event.preventDefault()
                return
            }
        }
    }

    onMounted(() => {
        window.addEventListener('keydown', handleHotkey)
        window.addEventListener('settings-updated', handleSettingsUpdated)
    })

    onUnmounted(() => {
        window.removeEventListener('keydown', handleHotkey)
        window.removeEventListener('settings-updated', handleSettingsUpdated)
    })

    return {
        activeTool,
        userShortcuts,
        handleToolChange
    }
}

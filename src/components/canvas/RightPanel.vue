<template>
    <div class="right-panel" :class="{ collapsed: isCollapsed }">
        <!-- 折叠按钮 -->
        <button 
            class="collapse-btn" 
            @click="$emit('toggle-collapse')" 
            :title="isCollapsed ? '展开面板' : '折叠面板'"
        >
            <span class="icon">{{ isCollapsed ? '◀' : '▶' }}</span>
        </button>

        <!-- 面板内容（折叠时不渲染） -->
        <div v-if="!isCollapsed" class="panel-container">
            <div class="panel-tabs">
                <button
                    v-for="panel in panels"
                    :key="panel.id"
                    class="tab-btn"
                    :class="{ active: activePanel === panel.id }"
                    :title="panel.label"
                    @click="$emit('panel-change', panel.id)"
                >
                    <span class="tab-icon">{{ panel.icon }}</span>
                    <span class="tab-label">{{ panel.label }}</span>
                </button>
            </div>

            <div class="panel-content">
                <div v-if="activePanel === 'properties'" class="panel-section">
                    <h3 class="section-title">{{ t('canvas.panels.properties') }}</h3>
                    <div class="empty-state">
                        <span class="empty-icon">📋</span>
                        <span class="empty-text">未选择节点</span>
                    </div>
                </div>

                <div v-else-if="activePanel === 'layers'" class="panel-section">
                    <h3 class="section-title">{{ t('canvas.panels.layers') }}</h3>
                    <div class="empty-state">
                        <span class="empty-icon">🗂️</span>
                        <span class="empty-text">暂无图层</span>
                    </div>
                </div>

                <div v-else-if="activePanel === 'assets'" class="panel-section">
                    <h3 class="section-title">{{ t('canvas.panels.assets') }}</h3>
                    <div class="empty-state">
                        <span class="empty-icon">🖼️</span>
                        <span class="empty-text">暂无资源</span>
                    </div>
                </div>

                <div v-else-if="activePanel === 'history'" class="panel-section">
                    <h3 class="section-title">{{ t('canvas.panels.history') }}</h3>
                    <div class="empty-state">
                        <span class="empty-icon">🕐</span>
                        <span class="empty-text">暂无历史</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
    activePanel: {
        type: String,
        default: 'properties'
    },
    isCollapsed: {
        type: Boolean,
        default: false
    }
})

defineEmits(['panel-change', 'toggle-collapse'])

const panels = computed(() => [
    { id: 'properties', icon: '⚙️', label: t('canvas.panels.properties') },
    { id: 'layers', icon: '🗂️', label: t('canvas.panels.layers') },
    { id: 'assets', icon: '🖼️', label: t('canvas.panels.assets') },
    { id: 'history', icon: '🕐', label: t('canvas.panels.history') }
])
</script>

<style scoped>
.right-panel {
    position: absolute;
    right: 16px;
    top: 96px;
    bottom: 80px;
    width: 360px;
    display: flex;
    flex-direction: column;
    background: var(--canvas-panel-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    box-shadow: var(--shadow-lg);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 80;
    overflow: hidden;
}

.right-panel.collapsed {
    width: 48px;
    background: transparent;
    border: none;
    box-shadow: none;
    backdrop-filter: none;
}

/* 折叠按钮 */
.collapse-btn {
    position: absolute;
    width: 40px;
    height: 64px;
    background: var(--canvas-toolbar-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
    z-index: 1;
    cursor: pointer;
}

/* 展开状态：按钮在左边框外侧 */
.right-panel:not(.collapsed) .collapse-btn {
    left: -20px;
    top: 50%;
    transform: translateY(-50%);
    border-radius: 12px 0 0 12px;
}

.right-panel:not(.collapsed) .collapse-btn:hover {
    left: -23px;
    box-shadow: var(--shadow-md);
}

/* 折叠状态：按钮在面板中心 */
.right-panel.collapsed .collapse-btn {
    position: static;
    width: 24px;
    height: 64px;
    margin: auto;
    border-radius: 12px;
}

.right-panel.collapsed .collapse-btn:hover {
    transform: scale(1.05);
    box-shadow: var(--shadow-md);
}

.collapse-btn .icon {
    font-size: 18px;
    transition: transform 0.3s ease;
}

/* 面板容器 */
.panel-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    transition: opacity 0.3s ease;
}

.panel-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color);
    overflow-x: auto;
    background: rgba(0, 0, 0, 0.02);
}

html[data-theme='dark'] .panel-tabs {
    background: rgba(255, 255, 255, 0.02);
}

.tab-btn {
    flex: 1;
    min-width: 80px;
    height: 52px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: transparent;
    color: var(--text-secondary);
    transition: all 0.3s ease;
    border-bottom: 3px solid transparent;
}

.tab-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.tab-btn.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
    background: rgba(102, 126, 234, 0.05);
}

.tab-icon {
    font-size: 18px;
}

.tab-label {
    font-size: 11px;
    font-weight: 600;
}

.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.panel-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
    text-align: center;
    opacity: 0.5;
}

.empty-icon {
    font-size: 48px;
}

.empty-text {
    font-size: 14px;
    color: var(--text-secondary);
}

/* 滚动条 */
.panel-content::-webkit-scrollbar {
    width: 6px;
}

.panel-content::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
    background: var(--text-tertiary);
}

@media (max-width: 1200px) {
    .right-panel {
        width: 280px;
    }
}

@media (max-width: 768px) {
    .right-panel {
        right: 12px;
        top: 84px;
        bottom: 68px;
        width: 280px;
    }

    .right-panel.collapsed {
        width: 48px;
    }
}
</style>

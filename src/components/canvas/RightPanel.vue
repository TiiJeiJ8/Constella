<template>
    <div class="right-panel" :class="{ collapsed: isCollapsed }">
        <!-- 折叠状态：只显示折叠按钮 -->
        <template v-if="isCollapsed">
            <button 
                class="collapse-btn-standalone" 
                @click="$emit('toggle-collapse')" 
                title="展开面板"
            >
                <span class="icon">◀</span>
            </button>
        </template>

        <!-- 展开状态：面板内容 -->
        <div v-else class="panel-container">
            <!-- 标签栏（包含折叠按钮） -->
            <div class="panel-tabs">
                <button
                    class="collapse-btn-inline"
                    @click="$emit('toggle-collapse')"
                    title="折叠面板"
                >
                    <span class="icon">▶</span>
                </button>
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
                <!-- 属性面板 -->
                <div v-if="activePanel === 'properties'" class="panel-section">
                    <h3 class="section-title">{{ t('canvas.panels.properties') }}</h3>
                    <div class="section-content">
                        <!-- 无选中节点 -->
                        <div v-if="!selectedNodes || selectedNodes.length === 0" class="empty-state">
                            <span class="empty-icon">📋</span>
                            <span class="empty-text">{{ t('canvas.properties.noSelection') }}</span>
                        </div>
                        
                        <!-- 单选节点属性 -->
                        <template v-else-if="selectedNodes.length === 1">
                            <div class="property-group">
                                <label class="property-label">{{ t('canvas.properties.nodeType') }}</label>
                                <div class="type-selector">
                                    <button
                                        v-for="kind in availableKinds"
                                        :key="kind.kind"
                                        class="type-btn"
                                        :class="{ active: selectedNodes[0].content?.kind === kind.kind }"
                                        :title="kind.description"
                                        @click="$emit('node-kind-change', selectedNodes[0].id, kind.kind)"
                                    >
                                        <span class="type-icon">{{ kind.icon }}</span>
                                        <span class="type-name">{{ kind.label }}</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="property-group">
                                <label class="property-label">{{ t('canvas.properties.color') }}</label>
                                <div class="color-row">
                                    <div class="color-input-group">
                                        <label>{{ t('canvas.properties.fill') }}</label>
                                        <input 
                                            type="color" 
                                            :value="selectedNodes[0].rectConfig?.fill || '#667eea'"
                                            @input="$emit('node-property-change', selectedNodes[0].id, 'fill', $event.target.value)"
                                        />
                                    </div>
                                    <div class="color-input-group">
                                        <label>{{ t('canvas.properties.stroke') }}</label>
                                    <input 
                                        type="color" 
                                        :value="selectedNodes[0].rectConfig?.stroke || '#5568d3'"
                                        @input="$emit('node-property-change', selectedNodes[0].id, 'stroke', $event.target.value)"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div class="property-group">
                            <label class="property-label">{{ t('canvas.properties.size') }}</label>
                            <div class="size-row">
                                <div class="size-input-group">
                                    <label>{{ t('canvas.properties.width') }}</label>
                                    <input 
                                        type="number" 
                                        :value="selectedNodes[0].width"
                                        @input="$emit('node-property-change', selectedNodes[0].id, 'width', Number($event.target.value))"
                                        min="50"
                                        max="800"
                                    />
                                </div>
                                <div class="size-input-group">
                                    <label>{{ t('canvas.properties.height') }}</label>
                                    <input 
                                        type="number" 
                                        :value="selectedNodes[0].height"
                                        @input="$emit('node-property-change', selectedNodes[0].id, 'height', Number($event.target.value))"
                                        min="50"
                                        max="600"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div class="property-group">
                            <label class="property-label">{{ t('canvas.properties.position') }}</label>
                            <div class="position-inputs">
                                <div class="position-input-row">
                                    <label>X</label>
                                    <input 
                                        type="number" 
                                        :value="Math.round(selectedNodes[0].x)"
                                        @input="$emit('node-property-change', selectedNodes[0].id, 'x', Number($event.target.value))"
                                    />
                                </div>
                                <div class="position-input-row">
                                    <label>Y</label>
                                    <input 
                                        type="number" 
                                        :value="Math.round(selectedNodes[0].y)"
                                        @input="$emit('node-property-change', selectedNodes[0].id, 'y', Number($event.target.value))"
                                    />
                                </div>
                            </div>
                        </div>
                    </template>
                    
                    <!-- 多选节点 -->
                    <div v-else class="multi-select-info">
                        <span class="info-icon">🔢</span>
                        <span class="info-text">{{ t('canvas.properties.multiSelect', { count: selectedNodes.length }) }}</span>
                    </div>
                    
                    <!-- 边属性编辑 -->
                    <template v-if="selectedEdges && selectedEdges.length === 1">
                        <div class="property-divider"></div>
                        <h4 class="subsection-title">{{ t('canvas.edge.properties') }}</h4>
                        
                        <div class="property-group">
                            <label class="property-label">{{ t('canvas.edge.lineType') }}</label>
                            <div class="type-selector edge-types">
                                <button
                                    v-for="edgeType in edgeTypes"
                                    :key="edgeType.id"
                                    class="type-btn"
                                    :class="{ active: selectedEdges[0].type === edgeType.id }"
                                    :title="edgeType.label"
                                    @click="$emit('edge-property-change', selectedEdges[0].id, 'type', edgeType.id)"
                                >
                                    <span class="type-icon">{{ edgeType.icon }}</span>
                                    <span class="type-name">{{ edgeType.label }}</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="property-group">
                            <label class="property-label">{{ t('canvas.properties.color') }}</label>
                            <div class="color-row">
                                <div class="color-input-group">
                                    <label>{{ t('canvas.edge.lineColor') }}</label>
                                    <input 
                                        type="color" 
                                        :value="selectedEdges[0].color || '#666666'"
                                        @input="$emit('edge-property-change', selectedEdges[0].id, 'color', $event.target.value)"
                                    />
                                </div>
                                <div class="size-input-group">
                                    <label>{{ t('canvas.edge.lineWidth') }}</label>
                                    <input 
                                        type="number" 
                                        :value="selectedEdges[0].strokeWidth || 2"
                                        @input="$emit('edge-property-change', selectedEdges[0].id, 'strokeWidth', Number($event.target.value))"
                                        min="1"
                                        max="10"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div class="property-group">
                            <label class="property-label">{{ t('canvas.edge.arrow') }}</label>
                            <div class="arrows-row">
                                <div class="arrow-select-group">
                                    <label>{{ t('canvas.edge.startPoint') }}</label>
                                    <select 
                                        :value="selectedEdges[0].startArrow || 'none'"
                                        @change="$emit('edge-property-change', selectedEdges[0].id, 'startArrow', $event.target.value)"
                                    >
                                        <option value="none">{{ t('canvas.edge.arrowNone') }}</option>
                                        <option value="arrow">{{ t('canvas.edge.arrowArrow') }}</option>
                                        <option value="diamond">{{ t('canvas.edge.arrowDiamond') }}</option>
                                        <option value="circle">{{ t('canvas.edge.arrowCircle') }}</option>
                                    </select>
                                </div>
                                <div class="arrow-select-group">
                                    <label>{{ t('canvas.edge.endPoint') }}</label>
                                    <select 
                                        :value="selectedEdges[0].endArrow || 'arrow'"
                                        @change="$emit('edge-property-change', selectedEdges[0].id, 'endArrow', $event.target.value)"
                                    >
                                        <option value="none">{{ t('canvas.edge.arrowNone') }}</option>
                                        <option value="arrow">{{ t('canvas.edge.arrowArrow') }}</option>
                                        <option value="diamond">{{ t('canvas.edge.arrowDiamond') }}</option>
                                        <option value="circle">{{ t('canvas.edge.arrowCircle') }}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="property-group">
                            <label class="property-label">{{ t('canvas.edge.label') }}</label>
                            <input 
                                type="text" 
                                class="text-input"
                                :value="selectedEdges[0].label || ''"
                                :placeholder="t('canvas.edge.labelPlaceholder')"
                                @change="$emit('edge-property-change', selectedEdges[0].id, 'label', $event.target.value)"
                            />
                        </div>
                        
                        <div class="property-group">
                            <label class="property-label">{{ t('canvas.edge.dashed') }}</label>
                            <div class="checkbox-group">
                                <input 
                                    type="checkbox" 
                                    id="dash-toggle"
                                    :checked="selectedEdges[0].dashArray && selectedEdges[0].dashArray.length > 0"
                                    @change="$emit('edge-property-change', selectedEdges[0].id, 'dashArray', $event.target.checked ? [8, 4] : null)"
                                />
                                <label for="dash-toggle">{{ t('canvas.edge.enableDash') }}</label>
                            </div>
                        </div>
                        
                        <div class="property-group">
                            <button 
                                class="danger-btn"
                                @click="$emit('edge-delete', [selectedEdges[0].id])"
                            >
                                🗑️ {{ t('canvas.edge.delete') }}
                            </button>
                        </div>
                    </template>
                    
                    <!-- 多选边 -->
                    <div v-else-if="selectedEdges && selectedEdges.length > 1" class="multi-select-info">
                        <span class="info-icon">🔗</span>
                        <span class="info-text">{{ t('canvas.edge.multiSelect', { count: selectedEdges.length }) }}</span>
                    </div>
                    </div>
                </div>

                <div v-else-if="activePanel === 'layers'" class="panel-section">
                    <h3 class="section-title">{{ t('canvas.panels.layers') }}</h3>
                    <div class="section-content">
                        <!-- 图层操作按钮 -->
                    <div v-if="selectedNodes.length > 0" class="layer-actions">
                        <button 
                            class="layer-btn" 
                            @click="$emit('node-zindex-change', selectedNodes[0].id, 'top')"
                            :title="t('canvas.layers.toTop')"
                        >
                            <span>⬆️</span> {{ t('canvas.layers.toTop') }}
                        </button>
                        <button 
                            class="layer-btn" 
                            @click="$emit('node-zindex-change', selectedNodes[0].id, 'up')"
                            :title="t('canvas.layers.moveUp')"
                        >
                            <span>🔼</span> {{ t('canvas.layers.moveUp') }}
                        </button>
                        <button 
                            class="layer-btn" 
                            @click="$emit('node-zindex-change', selectedNodes[0].id, 'down')"
                            :title="t('canvas.layers.moveDown')"
                        >
                            <span>🔽</span> {{ t('canvas.layers.moveDown') }}
                        </button>
                        <button 
                            class="layer-btn" 
                            @click="$emit('node-zindex-change', selectedNodes[0].id, 'bottom')"
                            :title="t('canvas.layers.toBottom')"
                        >
                            <span>⬇️</span> {{ t('canvas.layers.toBottom') }}
                        </button>
                    </div>
                    
                    <!-- 图层列表 -->
                    <div v-if="sortedNodes.length > 0" class="layers-list">
                        <div 
                            v-for="node in sortedNodes" 
                            :key="node.id"
                            class="layer-item"
                            :class="{ selected: isNodeSelected(node.id) }"
                            @click="$emit('node-select', node.id)"
                        >
                            <span class="layer-icon">{{ getNodeIcon(node) }}</span>
                            <span class="layer-name">{{ getNodeName(node) }}</span>
                            <span class="layer-zindex">{{ node.zIndex || 0 }}</span>
                        </div>
                    </div>
                    <div v-else class="empty-state">
                        <span class="empty-icon">🗂️</span>
                        <span class="empty-text">{{ t('canvas.layers.noLayers') }}</span>
                    </div>
                    </div>
                </div>

                <div v-else-if="activePanel === 'assets'" class="panel-section">
                    <h3 class="section-title">{{ t('canvas.panels.assets') }}</h3>
                    <div class="section-content">
                        <AssetsPanel
                            :assets="assets"
                            :room-id="roomId"
                            @upload="$emit('asset-upload', $event)"
                            @delete="$emit('asset-delete', $event)"
                            @insert="$emit('asset-insert', $event)"
                            @select="$emit('asset-select', $event)"
                        />
                    </div>
                </div>

                <div v-else-if="activePanel === 'history'" class="panel-section">
                    <h3 class="section-title">{{ t('canvas.panels.history') }}</h3>
                    <div class="section-content">
                        <HistoryPanel
                            :snapshots="snapshots"
                            @create-snapshot="$emit('snapshot-create', $event)"
                            @restore-snapshot="$emit('snapshot-restore', $event)"
                            @delete-snapshot="$emit('snapshot-delete', $event)"
                            @preview-snapshot="$emit('snapshot-preview', $event)"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { pluginsMeta } from '@/plugins'
import AssetsPanel from './AssetsPanel.vue'
import HistoryPanel from './HistoryPanel.vue'

const { t } = useI18n()

const props = defineProps({
    activePanel: {
        type: String,
        default: 'properties'
    },
    isCollapsed: {
        type: Boolean,
        default: false
    },
    roomId: {
        type: String,
        default: ''
    },
    selectedNodes: {
        type: Array,
        default: () => []
    },
    selectedEdges: {
        type: Array,
        default: () => []
    },
    allNodes: {
        type: Array,
        default: () => []
    },
    allEdges: {
        type: Array,
        default: () => []
    },
    assets: {
        type: Array,
        default: () => []
    },
    snapshots: {
        type: Array,
        default: () => []
    }
})

defineEmits([
    'panel-change',
    'toggle-collapse',
    'node-kind-change',
    'node-property-change',
    'node-display-mode-change',
    'node-select',
    'node-zindex-change',
    'edge-property-change',
    'edge-select',
    'edge-delete',
    'asset-upload',
    'asset-delete',
    'asset-insert',
    'asset-select',
    'snapshot-create',
    'snapshot-restore',
    'snapshot-delete',
    'snapshot-preview'
])

const panels = computed(() => [
    { id: 'properties', icon: '⚙️', label: t('canvas.panels.properties') },
    { id: 'layers', icon: '🗂️', label: t('canvas.panels.layers') },
    { id: 'assets', icon: '🖼️', label: t('canvas.panels.assets') },
    { id: 'history', icon: '🕐', label: t('canvas.panels.history') }
])

// 连线类型选项
const edgeTypes = [
    { id: 'straight', icon: '➖', label: '直线' },
    { id: 'bezier', icon: '〰️', label: '曲线' },
    { id: 'step', icon: '📐', label: '折线' }
]

// 可用的节点类型（包含图片类型）
const availableKinds = computed(() => {
    return pluginsMeta.filter(k => ['blank', 'text', 'markdown', 'image'].includes(k.kind))
})

// 按 zIndex 排序的节点列表（从高到低）
const sortedNodes = computed(() => {
    return [...props.allNodes].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
})

// 检查节点是否选中
function isNodeSelected(nodeId) {
    return props.selectedNodes.some(n => n.id === nodeId)
}

// 获取节点图标
function getNodeIcon(node) {
    const kind = node.content?.kind || 'blank'
    const meta = pluginsMeta.find(m => m.kind === kind)
    return meta?.icon || '📦'
}

// 获取节点名称
function getNodeName(node) {
    const content = node.content
    if (!content?.data) return t('canvas.layers.emptyNode')
    
    const text = content.data
    const firstLine = text.split('\n')[0].trim()
    
    // 去除 Markdown 标记
    const cleanText = firstLine
        .replace(/^#+\s*/, '')
        .replace(/[*_`]/g, '')
        .trim()
    
    if (cleanText.length > 20) {
        return cleanText.substring(0, 20) + '...'
    }
    return cleanText || t('canvas.layers.emptyNode')
}
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
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 折叠状态的独立按钮 */
.collapse-btn-standalone {
    width: 40px;
    height: 64px;
    background: var(--canvas-toolbar-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
    cursor: pointer;
}

.collapse-btn-standalone:hover {
    transform: scale(1.05);
    box-shadow: var(--shadow-md);
}

.collapse-btn-standalone .icon {
    font-size: 14px;
}

/* 展开状态内联在标签栏的折叠按钮 */
.collapse-btn-inline {
    width: 44px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-right: 1px solid var(--border-color);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.collapse-btn-inline:hover {
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-primary);
}

html[data-theme='dark'] .collapse-btn-inline:hover {
    background: rgba(255, 255, 255, 0.05);
}

.collapse-btn-inline .icon {
    font-size: 12px;
}

/* 面板容器 */
.panel-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    transition: opacity 0.3s ease;
}

.panel-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color);
    overflow-x: auto;
    background: rgba(0, 0, 0, 0.02);
    flex-shrink: 0;
}

html[data-theme='dark'] .panel-tabs {
    background: rgba(255, 255, 255, 0.02);
}

.tab-btn {
    flex: 1;
    min-width: 70px;
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
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    padding: 16px;
    max-width: 100%;
}

.panel-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 100%;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.section-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
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

/* 属性编辑组件 */
.property-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.property-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* 类型选择器 */
.type-selector {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
}

.type-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    background: var(--bg-secondary);
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.type-btn:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-color);
}

.type-btn.active {
    background: rgba(102, 126, 234, 0.1);
    border-color: var(--color-primary);
}

.type-icon {
    font-size: 20px;
}

.type-name {
    font-size: 11px;
    color: var(--text-primary);
    font-weight: 500;
}

/* 颜色输入 */
.color-row {
    display: flex;
    gap: 16px;
}

.color-input-group {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
}

.color-input-group label {
    font-size: 12px;
    color: var(--text-secondary);
}

.color-input-group input[type="color"] {
    width: 36px;
    height: 36px;
    border: 2px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    padding: 2px;
    background: var(--bg-secondary);
}

.color-input-group input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
}

.color-input-group input[type="color"]::-webkit-color-swatch {
    border-radius: 4px;
    border: none;
}

/* 尺寸输入 */
.size-row {
    display: flex;
    gap: 16px;
}

.size-input-group {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
}

.size-input-group label {
    font-size: 12px;
    color: var(--text-secondary);
    min-width: 20px;
}

.size-input-group input[type="number"] {
    flex: 1;
    height: 32px;
    padding: 0 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 13px;
}

.size-input-group input[type="number"]:focus {
    outline: none;
    border-color: var(--color-primary);
}

/* 位置输入（分行显示） */
.position-inputs {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.position-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.position-input-row label {
    font-size: 12px;
    color: var(--text-secondary);
    min-width: 20px;
}

.position-input-row input[type="number"] {
    flex: 1;
    height: 32px;
    padding: 0 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 13px;
}

.position-input-row input[type="number"]:focus {
    outline: none;
    border-color: var(--color-primary);
}

/* 多选提示 */
.multi-select-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 24px;
    background: var(--bg-secondary);
    border-radius: 8px;
    text-align: center;
}

.info-icon {
    font-size: 32px;
}

.info-text {
    font-size: 14px;
    color: var(--text-secondary);
}

/* 显示模式选择器 */
.display-mode-selector {
    display: flex;
    gap: 8px;
}

.mode-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--text-secondary);
    font-size: 12px;
}

.mode-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.mode-btn.active {
    background: var(--color-primary-alpha);
    border-color: var(--color-primary);
    color: var(--color-primary);
}

.mode-icon {
    font-size: 18px;
}

/* 图层面板样式 */
.layer-actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 16px;
}

.layer-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    color: var(--text-secondary);
    transition: all 0.2s ease;
}

.layer-btn:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-color: var(--color-primary);
}

.layers-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
}

.layer-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.layer-item:hover {
    background: var(--bg-tertiary);
}

.layer-item.selected {
    background: var(--color-primary-alpha);
    border-color: var(--color-primary);
}

.layer-icon {
    font-size: 16px;
}

.layer-name {
    flex: 1;
    font-size: 13px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.layer-zindex {
    font-size: 11px;
    color: var(--text-tertiary);
    padding: 2px 6px;
    background: var(--bg-primary);
    border-radius: 4px;
}

/* 滚动条 */
.panel-content::-webkit-scrollbar,
.section-content::-webkit-scrollbar,
.layers-list::-webkit-scrollbar {
    width: 6px;
}

.panel-content::-webkit-scrollbar-thumb,
.section-content::-webkit-scrollbar-thumb,
.layers-list::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover,
.section-content::-webkit-scrollbar-thumb:hover,
.layers-list::-webkit-scrollbar-thumb:hover {
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

/* 边属性样式 */
.property-divider {
    height: 1px;
    background: var(--border-color);
    margin: 16px 0;
}

.subsection-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0 0 12px 0;
}

.edge-types .type-btn {
    flex: 1;
}

.arrows-row {
    display: flex;
    gap: 12px;
}

.arrow-select-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.arrow-select-group label {
    font-size: 11px;
    color: var(--text-tertiary);
}

.arrow-select-group select {
    width: 100%;
    padding: 8px 10px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.2s;
}

.arrow-select-group select:focus {
    outline: none;
    border-color: var(--color-primary);
}

.text-input {
    width: 100%;
    padding: 10px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-primary);
    font-size: 13px;
    transition: border-color 0.2s;
}

.text-input:focus {
    outline: none;
    border-color: var(--color-primary);
}

.checkbox-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.checkbox-group input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
}

.checkbox-group label {
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
}

.danger-btn {
    width: 100%;
    padding: 10px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    color: #ef4444;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
}

.danger-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
}
</style>

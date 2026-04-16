<template>
    <div class="right-panel" :class="{ collapsed: isCollapsed }">
        <template v-if="isCollapsed">
            <button class="collapse-btn-standalone" @click="$emit('toggle-collapse')" :title="collapseTitle">
                <svg class="panel-icon small" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m14.5 6.5-5 5.5 5 5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                </svg>
            </button>
        </template>

        <div v-else class="panel-container">
            <div class="panel-tabs">
                <button class="collapse-btn-inline" @click="$emit('toggle-collapse')" :title="collapseTitle">
                    <svg class="panel-icon small" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m9.5 6.5 5 5.5-5 5.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
                    </svg>
                </button>

                <button
                    v-for="panel in panels"
                    :key="panel.id"
                    class="tab-btn"
                    :class="{ active: activePanel === panel.id }"
                    :title="panel.label"
                    @click="$emit('panel-change', panel.id)"
                >
                    <svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            v-for="(path, index) in panel.paths"
                            :key="index"
                            :d="path.d"
                            :fill="path.fill || 'none'"
                            :stroke="path.stroke || 'currentColor'"
                            :stroke-width="path.strokeWidth || 1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                        <circle
                            v-for="(circle, index) in panel.circles || []"
                            :key="`panel-circle-${index}`"
                            :cx="circle.cx"
                            :cy="circle.cy"
                            :r="circle.r"
                            :fill="circle.fill || 'currentColor'"
                        />
                    </svg>
                    <span class="tab-label">{{ panel.label }}</span>
                </button>
            </div>

            <div class="panel-content">
                <div v-if="activePanel === 'properties'" class="panel-section">
                    <h3 class="section-title">{{ t('canvas.panels.properties') }}</h3>
                    <div class="section-content">
                        <div v-if="!canEditCanvas" class="readonly-banner">{{ propertiesReadOnlyHint }}</div>

                        <div v-if="!selectedNodes || selectedNodes.length === 0" class="empty-state">
                            <svg class="empty-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="5" y="5" width="14" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7" />
                                <path d="M8 8h8M8 12h5M8 16h6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
                            </svg>
                            <span class="empty-text">{{ t('canvas.properties.noSelection') }}</span>
                        </div>

                        <template v-else-if="selectedNodes.length === 1">
                            <div class="property-group">
                                <label class="property-label">{{ t('canvas.properties.nodeType') }}</label>
                                <div class="type-selector">
                                    <button
                                        v-for="kind in availableKinds"
                                        :key="kind.kind"
                                        class="type-btn"
                                        :class="{ active: selectedNodes[0].content?.kind === kind.kind }"
                                        :disabled="!canEditCanvas"
                                        :title="te('canvas.nodeTypeDesc.' + kind.kind) ? t('canvas.nodeTypeDesc.' + kind.kind) : kind.description"
                                        @click="$emit('node-kind-change', selectedNodes[0].id, kind.kind)"
                                    >
                                        <span class="type-icon">{{ kind.icon }}</span>
                                        <span class="type-name">{{ te('canvas.nodeTypes.' + kind.kind) ? t('canvas.nodeTypes.' + kind.kind) : kind.label }}</span>
                                    </button>
                                </div>
                            </div>

                            <div class="property-group">
                                <label class="property-label">{{ t('canvas.properties.color') }}</label>
                                <div class="color-row">
                                    <div class="color-input-group">
                                        <label>{{ t('canvas.properties.fill') }}</label>
                                        <input type="color" :value="selectedNodes[0].rectConfig?.fill || '#667eea'" :disabled="!canEditCanvas" @input="$emit('node-property-change', selectedNodes[0].id, 'fill', $event.target.value)" />
                                    </div>
                                    <div class="color-input-group">
                                        <label>{{ t('canvas.properties.stroke') }}</label>
                                        <input type="color" :value="selectedNodes[0].rectConfig?.stroke || '#5568d3'" :disabled="!canEditCanvas" @input="$emit('node-property-change', selectedNodes[0].id, 'stroke', $event.target.value)" />
                                    </div>
                                </div>
                            </div>

                            <div class="property-group">
                                <label class="property-label">{{ t('canvas.properties.size') }}</label>
                                <div class="size-row">
                                    <div class="size-input-group">
                                        <label>{{ t('canvas.properties.width') }}</label>
                                        <input type="number" :value="selectedNodes[0].width" :disabled="!canEditCanvas" min="50" max="800" @input="$emit('node-property-change', selectedNodes[0].id, 'width', Number($event.target.value))" />
                                    </div>
                                    <div class="size-input-group">
                                        <label>{{ t('canvas.properties.height') }}</label>
                                        <input type="number" :value="selectedNodes[0].height" :disabled="!canEditCanvas" min="50" max="600" @input="$emit('node-property-change', selectedNodes[0].id, 'height', Number($event.target.value))" />
                                    </div>
                                </div>
                            </div>

                            <div class="property-group">
                                <label class="property-label">{{ t('canvas.properties.position') }}</label>
                                <div class="position-inputs">
                                    <div class="position-input-row">
                                        <label>X</label>
                                        <input type="number" :value="Math.round(selectedNodes[0].x)" :disabled="!canEditCanvas" @input="$emit('node-property-change', selectedNodes[0].id, 'x', Number($event.target.value))" />
                                    </div>
                                    <div class="position-input-row">
                                        <label>Y</label>
                                        <input type="number" :value="Math.round(selectedNodes[0].y)" :disabled="!canEditCanvas" @input="$emit('node-property-change', selectedNodes[0].id, 'y', Number($event.target.value))" />
                                    </div>
                                </div>
                            </div>

                            <div v-if="currentNodeMeta?.supportsCardMode" class="property-group">
                                <label class="property-label">{{ t('canvas.properties.displayMode') }}</label>
                                <div class="display-mode-selector">
                                    <button class="mode-btn" :class="{ active: selectedNodes[0].content?.displayMode !== 'card' }" :disabled="!canEditCanvas" @click="$emit('node-display-mode-change', selectedNodes[0].id, 'full')">
                                        <svg class="mode-icon" viewBox="0 0 24 24" aria-hidden="true">
                                            <rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.7" />
                                            <path d="M8 9h8M8 12h8M8 15h5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
                                        </svg>
                                        <span>{{ t('canvas.properties.full') }}</span>
                                    </button>
                                    <button class="mode-btn" :class="{ active: selectedNodes[0].content?.displayMode === 'card' }" :disabled="!canEditCanvas" @click="$emit('node-display-mode-change', selectedNodes[0].id, 'card')">
                                        <svg class="mode-icon" viewBox="0 0 24 24" aria-hidden="true">
                                            <rect x="6" y="7" width="12" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.7" />
                                            <path d="M9 11h6M9 14h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
                                        </svg>
                                        <span>{{ t('canvas.properties.card') }}</span>
                                    </button>
                                </div>
                            </div>

                            <div v-if="currentNodeMeta?.supportsFontSizeControl" class="property-group">
                                <label class="property-label">{{ t('canvas.properties.displayFontSize') }}</label>
                                <div class="size-input-group">
                                    <label>{{ t('canvas.properties.fontSizeUnit') }}</label>
                                    <input type="number" :value="selectedNodes[0].content?.metadata?.fontSize || 14" :disabled="!canEditCanvas" min="10" max="48" @input="$emit('node-content-metadata-change', selectedNodes[0].id, 'fontSize', Number($event.target.value))" />
                                </div>
                            </div>
                        </template>

                        <div v-else class="multi-select-info">
                            <svg class="info-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="4.5" y="6" width="9" height="9" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.7" />
                                <rect x="10.5" y="9" width="9" height="9" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.7" />
                            </svg>
                            <span class="info-text">{{ t('canvas.properties.multiSelect', { count: selectedNodes.length }) }}</span>
                        </div>

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
                                        :disabled="!canEditCanvas"
                                        :title="edgeType.label"
                                        @click="$emit('edge-property-change', selectedEdges[0].id, 'type', edgeType.id)"
                                    >
                                        <svg class="type-svg" viewBox="0 0 24 24" aria-hidden="true">
                                            <path
                                                v-for="(path, index) in edgeType.paths"
                                                :key="index"
                                                :d="path.d"
                                                :fill="path.fill || 'none'"
                                                :stroke="path.stroke || 'currentColor'"
                                                :stroke-width="path.strokeWidth || 1.8"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            />
                                        </svg>
                                        <span class="type-name">{{ edgeType.label }}</span>
                                    </button>
                                </div>
                            </div>

                            <div class="property-group">
                                <label class="property-label">{{ t('canvas.properties.color') }}</label>
                                <div class="color-row">
                                    <div class="color-input-group">
                                        <label>{{ t('canvas.edge.lineColor') }}</label>
                                        <input type="color" :value="selectedEdges[0].color || '#666666'" :disabled="!canEditCanvas" @input="$emit('edge-property-change', selectedEdges[0].id, 'color', $event.target.value)" />
                                    </div>
                                    <div class="size-input-group">
                                        <label>{{ t('canvas.edge.lineWidth') }}</label>
                                        <input type="number" :value="selectedEdges[0].strokeWidth || 2" :disabled="!canEditCanvas" min="1" max="10" @input="$emit('edge-property-change', selectedEdges[0].id, 'strokeWidth', Number($event.target.value))" />
                                    </div>
                                </div>
                            </div>

                            <div class="property-group">
                                <label class="property-label">{{ t('canvas.edge.arrow') }}</label>
                                <div class="arrows-row">
                                    <div class="arrow-select-group">
                                        <label>{{ t('canvas.edge.startPoint') }}</label>
                                        <select :value="selectedEdges[0].startArrow || 'none'" :disabled="!canEditCanvas" @change="$emit('edge-property-change', selectedEdges[0].id, 'startArrow', $event.target.value)">
                                            <option value="none">{{ t('canvas.edge.arrowNone') }}</option>
                                            <option value="arrow">{{ t('canvas.edge.arrowArrow') }}</option>
                                            <option value="diamond">{{ t('canvas.edge.arrowDiamond') }}</option>
                                            <option value="circle">{{ t('canvas.edge.arrowCircle') }}</option>
                                        </select>
                                    </div>
                                    <div class="arrow-select-group">
                                        <label>{{ t('canvas.edge.endPoint') }}</label>
                                        <select :value="selectedEdges[0].endArrow || 'arrow'" :disabled="!canEditCanvas" @change="$emit('edge-property-change', selectedEdges[0].id, 'endArrow', $event.target.value)">
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
                                <input class="text-input" type="text" :value="selectedEdges[0].label || ''" :readonly="!canEditCanvas" :placeholder="t('canvas.edge.labelPlaceholder')" @change="$emit('edge-property-change', selectedEdges[0].id, 'label', $event.target.value)" />
                            </div>

                            <div class="property-group">
                                <label class="property-label">{{ t('canvas.edge.dashed') }}</label>
                                <div class="checkbox-group">
                                    <input id="dash-toggle" type="checkbox" :disabled="!canEditCanvas" :checked="selectedEdges[0].dashArray && selectedEdges[0].dashArray.length > 0" @change="$emit('edge-property-change', selectedEdges[0].id, 'dashArray', $event.target.checked ? [8, 4] : null)" />
                                    <label for="dash-toggle">{{ t('canvas.edge.enableDash') }}</label>
                                </div>
                            </div>

                            <div class="property-group">
                                <button class="danger-btn" :disabled="!canEditCanvas" @click="$emit('edge-delete', [selectedEdges[0].id])">
                                    <svg class="danger-icon" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M8 8.5v8M12 8.5v8M16 8.5v8M5.5 6.5h13M9 4.75h6M7.25 6.5l.55 11.05A2 2 0 0 0 9.8 19.5h4.4a2 2 0 0 0 1.99-1.95l.56-11.05" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
                                    </svg>
                                    <span>{{ t('canvas.edge.delete') }}</span>
                                </button>
                            </div>
                        </template>

                        <div v-else-if="selectedEdges && selectedEdges.length > 1" class="multi-select-info">
                            <svg class="info-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M6 16.5c2.8-5.6 7.2-5.6 10-10" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
                                <circle cx="6" cy="16.5" r="1.6" fill="currentColor" />
                                <circle cx="16" cy="6.5" r="1.6" fill="currentColor" />
                                <circle cx="19" cy="4.5" r="1.2" fill="currentColor" />
                            </svg>
                            <span class="info-text">{{ t('canvas.edge.multiSelect', { count: selectedEdges.length }) }}</span>
                        </div>
                    </div>
                </div>

                <div v-else-if="activePanel === 'layers'" class="panel-section">
                    <h3 class="section-title">{{ t('canvas.panels.layers') }}</h3>
                    <div class="section-content">
                        <div v-if="selectedNodes.length > 0" class="layer-actions">
                            <button class="layer-btn" :disabled="!canEditCanvas" :title="t('canvas.layers.toTop')" @click="$emit('node-zindex-change', selectedNodes[0].id, 'top')">
                                <svg class="layer-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6 7.5 10.5M12 6l4.5 4.5M12 6v12M6.5 18h11" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" /></svg>
                                <span>{{ t('canvas.layers.toTop') }}</span>
                            </button>
                            <button class="layer-btn" :disabled="!canEditCanvas" :title="t('canvas.layers.moveUp')" @click="$emit('node-zindex-change', selectedNodes[0].id, 'up')">
                                <svg class="layer-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.5 7.5 12M12 7.5 16.5 12M12 7.5v9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" /></svg>
                                <span>{{ t('canvas.layers.moveUp') }}</span>
                            </button>
                            <button class="layer-btn" :disabled="!canEditCanvas" :title="t('canvas.layers.moveDown')" @click="$emit('node-zindex-change', selectedNodes[0].id, 'down')">
                                <svg class="layer-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 16.5-4.5-4.5M12 16.5l4.5-4.5M12 16.5v-9" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" /></svg>
                                <span>{{ t('canvas.layers.moveDown') }}</span>
                            </button>
                            <button class="layer-btn" :disabled="!canEditCanvas" :title="t('canvas.layers.toBottom')" @click="$emit('node-zindex-change', selectedNodes[0].id, 'bottom')">
                                <svg class="layer-action-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 18-4.5-4.5M12 18l4.5-4.5M12 6v12M6.5 6h11" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" /></svg>
                                <span>{{ t('canvas.layers.toBottom') }}</span>
                            </button>
                        </div>

                        <div v-if="sortedNodes.length > 0" class="layers-list">
                            <div v-for="node in sortedNodes" :key="node.id" class="layer-item" :class="{ selected: isNodeSelected(node.id) }" @click="$emit('node-select', node.id)">
                                <span class="layer-icon">{{ getNodeIcon(node) }}</span>
                                <span class="layer-name">{{ getNodeName(node) }}</span>
                                <span class="layer-zindex">{{ node.zIndex || 0 }}</span>
                            </div>
                        </div>

                        <div v-else class="empty-state">
                            <svg class="empty-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="5" y="6" width="14" height="4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7" />
                                <rect x="5" y="10.5" width="14" height="4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7" />
                                <rect x="5" y="15" width="14" height="4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.7" />
                            </svg>
                            <span class="empty-text">{{ t('canvas.layers.noLayers') }}</span>
                        </div>
                    </div>
                </div>

                <div v-else-if="activePanel === 'assets'" class="panel-section">
                    <h3 class="section-title">{{ t('canvas.panels.assets') }}</h3>
                    <div class="section-content">
                        <AssetsPanel :assets="assets" :room-id="roomId" :can-upload="canUploadAssets" :can-insert="canEditCanvas" @upload="$emit('asset-upload', $event)" @delete="$emit('asset-delete', $event)" @insert="$emit('asset-insert', $event)" @select="$emit('asset-select', $event)" />
                    </div>
                </div>

                <div v-else-if="activePanel === 'history'" class="panel-section">
                    <h3 class="section-title">{{ t('canvas.panels.history') }}</h3>
                    <div class="section-content">
                        <HistoryPanel :snapshots="snapshots" :can-create-snapshots="canManageSnapshots" :can-manage-snapshots="canManageSnapshots" @create-snapshot="$emit('snapshot-create', $event)" @restore-snapshot="$emit('snapshot-restore', $event)" @delete-snapshot="$emit('snapshot-delete', $event)" @preview-snapshot="$emit('snapshot-preview', $event)" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getPluginsMeta, pluginCatalogVersion } from '@/plugins'
import AssetsPanel from './AssetsPanel.vue'
import HistoryPanel from './HistoryPanel.vue'

const { t, te, locale } = useI18n()

const props = defineProps({
    activePanel: { type: String, default: 'properties' },
    isCollapsed: { type: Boolean, default: false },
    roomId: { type: String, default: '' },
    canEditCanvas: { type: Boolean, default: true },
    canUploadAssets: { type: Boolean, default: true },
    canManageSnapshots: { type: Boolean, default: true },
    selectedNodes: { type: Array, default: () => [] },
    selectedEdges: { type: Array, default: () => [] },
    allNodes: { type: Array, default: () => [] },
    allEdges: { type: Array, default: () => [] },
    assets: { type: Array, default: () => [] },
    snapshots: { type: Array, default: () => [] }
})

defineEmits(['panel-change', 'toggle-collapse', 'node-kind-change', 'node-property-change', 'node-display-mode-change', 'node-content-metadata-change', 'node-select', 'node-zindex-change', 'edge-property-change', 'edge-select', 'edge-delete', 'asset-upload', 'asset-delete', 'asset-insert', 'asset-select', 'snapshot-create', 'snapshot-restore', 'snapshot-delete', 'snapshot-preview'])

const collapseTitle = computed(() => (locale.value === 'zh-CN' ? '切换右侧面板' : 'Toggle right panel'))
const propertiesReadOnlyHint = computed(() => (locale.value === 'zh-CN' ? '当前为只读模式，可以查看属性，但不能修改画布内容。' : 'Read-only mode: you can inspect properties, but cannot edit the canvas.'))

const panels = computed(() => [
    { id: 'properties', label: t('canvas.panels.properties'), paths: [{ d: 'M10.1 3.7h3.8l.55 2.08c.3.09.59.21.87.36l1.97-.92 2.68 2.68-.92 1.97c.15.28.27.57.36.87l2.08.55v3.8l-2.08.55c-.09.3-.21.59-.36.87l.92 1.97-2.68 2.68-1.97-.92c-.28.15-.57.27-.87.36l-.55 2.08h-3.8l-.55-2.08a6.3 6.3 0 0 1-.87-.36l-1.97.92-2.68-2.68.92-1.97a6.3 6.3 0 0 1-.36-.87l-2.08-.55v-3.8l2.08-.55c.09-.3.21-.59.36-.87l-.92-1.97 2.68-2.68 1.97.92c.28-.15.57-.27.87-.36L10.1 3.7Z', strokeWidth: 1.45 }, { d: 'M12 9.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z' }] },
    { id: 'layers', label: t('canvas.panels.layers'), paths: [{ d: 'M5 7.5h14M5 12h14M5 16.5h14', strokeWidth: 1.9 }, { d: 'M7 5.5h10v4H7z', strokeWidth: 1.4 }, { d: 'M7 10h10v4H7z', strokeWidth: 1.4 }, { d: 'M7 14.5h10v4H7z', strokeWidth: 1.4 }] },
    { id: 'assets', label: t('canvas.panels.assets'), paths: [{ d: 'M4.75 5.5h14.5a2.25 2.25 0 0 1 2.25 2.25v8.5a2.25 2.25 0 0 1-2.25 2.25H4.75A2.25 2.25 0 0 1 2.5 16.25v-8.5A2.25 2.25 0 0 1 4.75 5.5Z' }, { d: 'm6.5 15 3.4-3.4 2.4 2.4 2.5-2.5L18 14.7', strokeWidth: 1.7 }], circles: [{ cx: 9, cy: 9, r: 1.2 }] },
    { id: 'history', label: t('canvas.panels.history'), paths: [{ d: 'M12 5.25a6.75 6.75 0 1 1-4.77 1.98', strokeWidth: 1.8 }, { d: 'M7.25 6v3.2h3.2M12 8.5V12l2.3 1.4', strokeWidth: 1.8 }] }
])

const edgeTypes = computed(() => [
    { id: 'straight', label: t('canvas.edgeTypes.straight'), paths: [{ d: 'M5 12h14', strokeWidth: 1.9 }] },
    { id: 'bezier', label: t('canvas.edgeTypes.bezier'), paths: [{ d: 'M5 16c4-8 10-8 14-8', strokeWidth: 1.9 }] },
    { id: 'step', label: t('canvas.edgeTypes.step'), paths: [{ d: 'M5 15h7V9h7', strokeWidth: 1.9 }] }
])

const availableKinds = computed(() => {
    pluginCatalogVersion.value
    return getPluginsMeta()
})

const currentNodeMeta = computed(() => {
    pluginCatalogVersion.value
    if (props.selectedNodes?.length !== 1) return null
    const kind = props.selectedNodes[0].content?.kind
    return kind ? getPluginsMeta().find(item => item.kind === kind) || null : null
})

const sortedNodes = computed(() => [...props.allNodes].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)))

function isNodeSelected(nodeId) {
    return props.selectedNodes.some(node => node.id === nodeId)
}

function getNodeIcon(node) {
    pluginCatalogVersion.value
    const kind = node.content?.kind || 'blank'
    const meta = getPluginsMeta().find(item => item.kind === kind)
    return meta?.icon || 'N'
}

function getNodeName(node) {
    const content = node.content
    if (!content?.data) return t('canvas.layers.emptyNode')
    const firstLine = content.data.split('\n')[0].trim()
    const cleanText = firstLine.replace(/^#+\s*/, '').replace(/[*_`]/g, '').trim()
    return cleanText.length > 20 ? `${cleanText.substring(0, 20)}...` : (cleanText || t('canvas.layers.emptyNode'))
}
</script>

<style scoped>
.right-panel{position:absolute;right:16px;top:96px;bottom:80px;z-index:80;display:flex;flex-direction:column;width:360px;overflow:hidden;background:var(--canvas-panel-bg);backdrop-filter:blur(20px);border:1px solid var(--border-color);border-radius:16px;box-shadow:var(--shadow-lg);transition:all .4s cubic-bezier(.4,0,.2,1)}
.right-panel.collapsed{width:48px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;box-shadow:none;backdrop-filter:none}
.collapse-btn-standalone{width:40px;height:64px;background:var(--canvas-toolbar-bg);backdrop-filter:blur(20px);border:1px solid var(--border-color);border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--text-primary);box-shadow:var(--shadow-sm);transition:all .3s ease;cursor:pointer}
.collapse-btn-standalone:hover{transform:scale(1.05);box-shadow:var(--shadow-md)}
.panel-container{flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;transition:opacity .3s ease}
.panel-tabs{display:flex;flex-shrink:0;overflow-x:auto;border-bottom:1px solid var(--border-color);background:rgba(0,0,0,.02)}
html[data-theme='dark'] .panel-tabs{background:rgba(255,255,255,.02)}
.collapse-btn-inline{width:44px;height:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:transparent;border:none;border-right:1px solid var(--border-color);color:var(--text-secondary);cursor:pointer;transition:all .2s ease}
.collapse-btn-inline:hover{background:rgba(0,0,0,.05);color:var(--text-primary)}
html[data-theme='dark'] .collapse-btn-inline:hover{background:rgba(255,255,255,.05)}
.tab-btn{flex:1;min-width:70px;height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:transparent;color:var(--text-secondary);transition:all .3s ease;border-bottom:3px solid transparent}
.tab-btn:hover{background:var(--bg-tertiary);color:var(--text-primary)}
.tab-btn.active{color:var(--color-primary);border-bottom-color:var(--color-primary);background:rgba(102,126,234,.05)}
.panel-icon.small,.tab-icon{width:18px;height:18px;display:block}.tab-label{font-size:11px;font-weight:600}
.panel-content{flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;padding:16px;max-width:100%}
.panel-section{display:flex;flex-direction:column;gap:12px;max-width:100%;flex:1;min-height:0;overflow:hidden}
.section-content{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
.section-title{margin:0;font-size:14px;font-weight:600;color:var(--text-primary)}
.readonly-banner{padding:10px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-secondary);font-size:12px}
.empty-state,.multi-select-info{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:32px 20px;text-align:center}
.empty-state{opacity:.55}.multi-select-info{padding:24px;background:var(--bg-secondary);border-radius:8px}
.empty-icon{width:48px;height:48px;color:var(--text-tertiary)}.info-icon{width:32px;height:32px;color:var(--text-tertiary)}
.empty-text,.info-text{font-size:14px;color:var(--text-secondary)}
.property-group{display:flex;flex-direction:column;gap:8px}.property-label{font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px}
.type-selector{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.type-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;background:var(--bg-secondary);border:2px solid transparent;border-radius:8px;cursor:pointer;transition:all .2s ease}
.type-btn:hover{background:var(--bg-tertiary);border-color:var(--border-color)}.type-btn.active{background:rgba(102,126,234,.1);border-color:var(--color-primary)}
.type-btn:disabled,.mode-btn:disabled,.layer-btn:disabled,.danger-btn:disabled,.text-input:read-only,.arrow-select-group select:disabled,.color-input-group input[type="color"]:disabled,.size-input-group input[type="number"]:disabled,.position-input-row input[type="number"]:disabled,.checkbox-group input[type="checkbox"]:disabled{opacity:.6;cursor:not-allowed}
.type-icon{font-size:20px}.type-svg{width:20px;height:20px;display:block}.type-name{font-size:11px;color:var(--text-primary);font-weight:500}
.color-row,.size-row,.arrows-row{display:flex;gap:16px}.color-input-group,.size-input-group,.arrow-select-group{flex:1}
.color-input-group,.size-input-group{display:flex;align-items:center;gap:8px}.arrow-select-group{display:flex;flex-direction:column;gap:4px}
.color-input-group label,.size-input-group label,.position-input-row label,.arrow-select-group label{font-size:12px;color:var(--text-secondary)}
.arrow-select-group label{font-size:11px;color:var(--text-tertiary)}
.color-input-group input[type="color"]{width:36px;height:36px;padding:2px;background:var(--bg-secondary);border:2px solid var(--border-color);border-radius:8px;cursor:pointer}
.color-input-group input[type="color"]::-webkit-color-swatch-wrapper{padding:0}.color-input-group input[type="color"]::-webkit-color-swatch{border:none;border-radius:4px}
.size-input-group input[type="number"],.position-input-row input[type="number"],.arrow-select-group select,.text-input{width:100%;height:32px;padding:0 8px;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:6px;color:var(--text-primary);font-size:13px}
.text-input{height:auto;padding:10px 12px}.size-input-group input[type="number"]:focus,.position-input-row input[type="number"]:focus,.arrow-select-group select:focus,.text-input:focus{outline:none;border-color:var(--color-primary)}
.position-inputs{display:flex;flex-direction:column;gap:8px}.position-input-row{display:flex;align-items:center;gap:8px}.position-input-row label,.size-input-group label{min-width:20px}
.display-mode-selector{display:flex;gap:8px}.mode-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 12px;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;cursor:pointer;transition:all .2s ease;color:var(--text-secondary);font-size:12px}
.mode-btn:hover{background:var(--bg-tertiary);color:var(--text-primary)}.mode-btn.active{background:var(--color-primary-alpha);border-color:var(--color-primary);color:var(--color-primary)}.mode-icon{width:18px;height:18px;display:block}
.property-divider{height:1px;margin:16px 0;background:var(--border-color)}.subsection-title{margin:0 0 12px 0;font-size:13px;font-weight:600;color:var(--text-secondary)}
.layer-actions{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px}.layer-btn{display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:6px;cursor:pointer;font-size:12px;color:var(--text-secondary);transition:all .2s ease}
.layer-btn:hover{background:var(--bg-tertiary);color:var(--text-primary);border-color:var(--color-primary)}.layer-action-icon{width:16px;height:16px;display:block}
.layers-list{display:flex;flex-direction:column;gap:4px;flex:1;min-height:0;overflow-y:auto}.layer-item{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-secondary);border:1px solid transparent;border-radius:8px;cursor:pointer;transition:all .2s ease}
.layer-item:hover{background:var(--bg-tertiary)}.layer-item.selected{background:var(--color-primary-alpha);border-color:var(--color-primary)}
.layer-icon{font-size:16px}.layer-name{flex:1;font-size:13px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.layer-zindex{font-size:11px;color:var(--text-tertiary);padding:2px 6px;background:var(--bg-primary);border-radius:4px}
.checkbox-group{display:flex;align-items:center;gap:8px}.checkbox-group input[type="checkbox"]{width:16px;height:16px;cursor:pointer}.checkbox-group label{font-size:13px;color:var(--text-secondary);cursor:pointer}
.danger-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:10px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:6px;color:#ef4444;font-size:13px;cursor:pointer;transition:all .2s}
.danger-btn:hover{background:rgba(239,68,68,.2);border-color:rgba(239,68,68,.5)}.danger-icon{width:16px;height:16px;display:block}
.panel-content::-webkit-scrollbar,.section-content::-webkit-scrollbar,.layers-list::-webkit-scrollbar{width:6px}.panel-content::-webkit-scrollbar-thumb,.section-content::-webkit-scrollbar-thumb,.layers-list::-webkit-scrollbar-thumb{background:var(--border-color);border-radius:3px}.panel-content::-webkit-scrollbar-thumb:hover,.section-content::-webkit-scrollbar-thumb:hover,.layers-list::-webkit-scrollbar-thumb:hover{background:var(--text-tertiary)}
@media (max-width:1200px){.right-panel{width:280px}}@media (max-width:768px){.right-panel{right:12px;top:84px;bottom:68px;width:280px}.right-panel.collapsed{width:48px}}
</style>

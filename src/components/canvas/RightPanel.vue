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
                                <div class="node-kind-toolbar">
                                    <div class="node-kind-heading">
                                        <span class="node-kind-title">{{ t('canvas.properties.nodeType') }}</span>
                                        <span class="node-kind-count">{{ filteredAvailableKinds.length }}/{{ availableKinds.length }}</span>
                                    </div>
                                    <div class="node-kind-search">
                                        <span class="node-kind-search-glyph" aria-hidden="true"></span>
                                        <input
                                            v-model="nodeKindQuery"
                                            type="search"
                                            class="node-kind-search-input"
                                            :placeholder="locale === 'zh-CN' ? '搜索' : 'Search'"
                                        />
                                    </div>
                                </div>
                                <div class="node-kind-library">
                                    <button
                                        v-for="kind in filteredAvailableKinds"
                                        :key="kind.kind"
                                        class="node-kind-option"
                                        :class="{ active: selectedNodes[0].content?.kind === kind.kind }"
                                        :disabled="!canEditCanvas"
                                        :title="getKindDescription(kind)"
                                        @click="$emit('node-kind-change', selectedNodes[0].id, kind.kind)"
                                    >
                                        <span class="node-kind-mark" :class="getKindClass(kind.kind)">{{ getKindInitial(kind) }}</span>
                                        <span class="node-kind-copy">
                                            <span class="node-kind-name">{{ getKindLabel(kind) }}</span>
                                            <span class="node-kind-description">{{ getKindDescription(kind) }}</span>
                                        </span>
                                        <span class="node-kind-tag">{{ kind.editable ? (locale === 'zh-CN' ? '可编辑' : 'Edit') : (locale === 'zh-CN' ? '只读' : 'View') }}</span>
                                    </button>
                                    <div v-if="filteredAvailableKinds.length === 0" class="node-kind-empty">
                                        {{ locale === 'zh-CN' ? '没有匹配的节点类型' : 'No matching node types' }}
                                    </div>
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
                                <input
                                    class="text-input"
                                    type="text"
                                    :value="edgeLabelDraft"
                                    :readonly="!canEditCanvas"
                                    :placeholder="t('canvas.edge.labelPlaceholder')"
                                    @focus="handleEdgeLabelFocus"
                                    @input="handleEdgeLabelInput"
                                    @blur="handleEdgeLabelBlur"
                                    @keydown.enter.prevent="commitEdgeLabelDraft"
                                />
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

                        <div v-if="orderedNodes.length > 0" class="layers-list">
                            <div v-for="node in orderedNodes" :key="node.id" class="layer-item" :class="{ selected: isNodeSelected(node.id) }" @click="$emit('node-select', node.id)">
                                <span class="layer-icon" :class="getKindClass(node.content?.kind || 'blank')">{{ getNodeInitial(node) }}</span>
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
import { computed, ref, watch } from 'vue'
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

const emit = defineEmits(['panel-change', 'toggle-collapse', 'node-kind-change', 'node-property-change', 'node-display-mode-change', 'node-content-metadata-change', 'node-select', 'node-zindex-change', 'edge-property-change', 'edge-select', 'edge-delete', 'asset-upload', 'asset-delete', 'asset-insert', 'asset-select', 'snapshot-create', 'snapshot-restore', 'snapshot-delete', 'snapshot-preview'])

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

const orderedNodes = computed(() => props.allNodes)
const selectedEdge = computed(() => props.selectedEdges?.length === 1 ? props.selectedEdges[0] : null)
const edgeLabelDraft = ref('')
const focusedEdgeLabelId = ref(null)
const nodeKindQuery = ref('')
const activeNodeKindTags = ref([])
const coreKindPriority = ['text', 'markdown', 'image', 'hyperlink', 'quote-card', 'blank']

const filteredAvailableKinds = computed(() => {
    const query = nodeKindQuery.value.trim().toLowerCase()
    if (!query) return availableKinds.value

    return availableKinds.value
        .filter(kind => {
            const haystack = [
                kind.kind,
                getKindLabel(kind),
                getKindDescription(kind),
                ...getKindTags(kind)
            ].join(' ').toLowerCase()
            const matchesQuery = haystack.includes(query)
            const matchesTags = activeNodeKindTags.value.length === 0 ||
                activeNodeKindTags.value.every(tag => getKindTags(kind).includes(tag))
            return matchesQuery && matchesTags
        })
})

watch(
    () => ({
        id: selectedEdge.value?.id || null,
        label: selectedEdge.value?.label || ''
    }),
    (next, previous) => {
        const isEditingSameEdge = focusedEdgeLabelId.value &&
            next.id === focusedEdgeLabelId.value &&
            previous?.id === next.id

        if (!isEditingSameEdge) {
            edgeLabelDraft.value = next.label
        }
    },
    { immediate: true }
)

function handleEdgeLabelFocus() {
    focusedEdgeLabelId.value = selectedEdge.value?.id || null
    edgeLabelDraft.value = selectedEdge.value?.label || ''
}

function handleEdgeLabelInput(event) {
    edgeLabelDraft.value = event.target?.value || ''
}

function commitEdgeLabelDraft() {
    const edge = selectedEdge.value
    if (!edge || !props.canEditCanvas) return

    const nextLabel = edgeLabelDraft.value
    if ((edge.label || '') !== nextLabel) {
        emit('edge-property-change', edge.id, 'label', nextLabel)
    }
}

function handleEdgeLabelBlur() {
    commitEdgeLabelDraft()
    focusedEdgeLabelId.value = null
}

function isNodeSelected(nodeId) {
    return props.selectedNodes.some(node => node.id === nodeId)
}

function getKindLabel(kind) {
    return te('canvas.nodeTypes.' + kind.kind) ? t('canvas.nodeTypes.' + kind.kind) : kind.label
}

function getKindDescription(kind) {
    return te('canvas.nodeTypeDesc.' + kind.kind) ? t('canvas.nodeTypeDesc.' + kind.kind) : kind.description
}

function getKindInitial(kind) {
    const label = getKindLabel(kind).trim()
    return (label[0] || kind.kind[0] || 'N').toUpperCase()
}

function getNodeInitial(node) {
    pluginCatalogVersion.value
    const kind = node.content?.kind || 'blank'
    const meta = getPluginsMeta().find(item => item.kind === kind)
    return meta ? getKindInitial(meta) : 'N'
}

function getKindClass(kind) {
    const normalized = (kind || 'blank').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    return `node-kind-${normalized}`
}

function getKindTags(kind) {
    const tags = []
    if (coreKindPriority.includes(kind.kind)) tags.push('builtin')
    if (kind.editable) tags.push('editable')
    if (kind.supportsCardMode) tags.push('card')
    if (kind.supportsFontSizeControl) tags.push('font-size')
    tags.push(kind.kind)
    return tags
}

function getNodeName(node) {
    const content = node.content
    if (!content?.data) return t('canvas.layers.emptyNode')
    const firstLine = content.data.split('\n')[0].trim()
    const cleanText = firstLine.replace(/^#+\s*/, '').replace(/[*_`]/g, '').trim()
    return cleanText.length > 20 ? `${cleanText.substring(0, 20)}...` : (cleanText || t('canvas.layers.emptyNode'))
}
</script>

<style scoped src="./RightPanel.css"></style>

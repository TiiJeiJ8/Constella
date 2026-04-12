import { computed, ref, type ComputedRef, type Ref } from 'vue'

interface SelectableItem {
    id: string
}

interface AwarenessLike {
    updateSelection?: (nodeIds: string[]) => void
}

interface CanvasStageLike {
    selectNode?: (nodeId: string) => void
}

interface YjsEdgesLike {
    updateEdge: (edgeId: string, updates: Record<string, unknown>) => void
}

interface UseCanvasSelectionOptions<NodeType extends SelectableItem, EdgeType extends SelectableItem> {
    canvasNodes: ComputedRef<NodeType[]>
    canvasEdges: ComputedRef<EdgeType[]>
    awareness?: AwarenessLike
    canvasStageRef: Ref<CanvasStageLike | null>
    yjsEdges: YjsEdgesLike
}

export function useCanvasSelection<NodeType extends SelectableItem, EdgeType extends SelectableItem>(
    options: UseCanvasSelectionOptions<NodeType, EdgeType>
) {
    const { canvasNodes, canvasEdges, awareness, canvasStageRef, yjsEdges } = options

    const selectedCount = ref(0)
    const selectedNodeIdList = ref<string[]>([])
    const selectedEdgeIdList = ref<string[]>([])

    const selectedNodes = computed(() => {
        return selectedNodeIdList.value
            .map(id => canvasNodes.value.find(node => node.id === id))
            .filter(Boolean) as NodeType[]
    })

    const selectedEdges = computed(() => {
        return selectedEdgeIdList.value
            .map(id => canvasEdges.value.find(edge => edge.id === id))
            .filter(Boolean) as EdgeType[]
    })

    function handleNodeSelect(selectedNodeIds: string[]) {
        selectedCount.value = selectedNodeIds.length
        selectedNodeIdList.value = selectedNodeIds
        awareness?.updateSelection?.(selectedNodeIds)
        console.log('[Canvas] Nodes selected:', selectedNodeIds)
    }

    function handleNodeSelectFromPanel(nodeId: string) {
        selectedNodeIdList.value = [nodeId]
        selectedCount.value = 1
        awareness?.updateSelection?.([nodeId])
        canvasStageRef.value?.selectNode?.(nodeId)
        console.log('[Canvas] Node selected from panel:', nodeId)
    }

    function handleEdgeSelect(selectedEdgeIds: string[]) {
        selectedEdgeIdList.value = selectedEdgeIds
        console.log('[Canvas] Edges selected:', selectedEdgeIds)
    }

    function handleEdgeSelectFromPanel(edgeId: string) {
        selectedEdgeIdList.value = [edgeId]
        console.log('[Canvas] Edge selected from panel:', edgeId)
    }

    function handleEdgePropertyChange(edgeId: string, property: string, value: unknown) {
        yjsEdges.updateEdge(edgeId, { [property]: value })
        console.log('[Canvas] Edge property changed:', edgeId, property, '->', value)
    }

    return {
        selectedCount,
        selectedNodeIdList,
        selectedEdgeIdList,
        selectedNodes,
        selectedEdges,
        handleNodeSelect,
        handleNodeSelectFromPanel,
        handleEdgeSelect,
        handleEdgeSelectFromPanel,
        handleEdgePropertyChange
    }
}

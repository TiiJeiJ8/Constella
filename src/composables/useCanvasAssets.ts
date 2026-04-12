import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { apiService } from '@/services/api'

interface AssetLike {
    id: string
    name: string
    type: string
    size?: number
    url: string
    uploadedAt?: string
    [key: string]: unknown
}

interface PointLike {
    x: number
    y: number
}

interface UseCanvasAssetsOptions {
    roomId: string
    t: (key: string) => string
    toast: { success: (message: string) => void; error: (message: string) => void }
    yjsNodes: any
    canvasAreaRef: Ref<HTMLElement | null>
    stagePosition: Ref<PointLike>
    stageScale: Ref<number>
}

export function useCanvasAssets(options: UseCanvasAssetsOptions) {
    const { roomId, t, toast, yjsNodes, canvasAreaRef, stagePosition, stageScale } = options

    const roomAssets = ref<AssetLike[]>([])
    let assetsRefreshInterval: ReturnType<typeof setInterval> | null = null

    function getMimeTypeFromUrl(url: string) {
        const extension = url.split('.').pop()?.toLowerCase()
        switch (extension) {
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'gif':
            case 'bmp':
            case 'webp':
                return 'image'
            case 'mp4':
            case 'webm':
            case 'ogg':
                return 'video'
            case 'mp3':
            case 'wav':
                return 'audio'
            case 'pdf':
                return 'pdf'
            default:
                return 'file'
        }
    }

    async function loadRoomAssets() {
        try {
            console.log('[Canvas] Loading assets for room:', roomId)
            const response = await apiService.getAssets(roomId)

            if (response.success && Array.isArray(response.data)) {
                const baseUrl = apiService.getBaseUrl()
                roomAssets.value = response.data.map((asset: AssetLike) => ({
                    ...asset,
                    url: asset.url.startsWith('http') ? asset.url : `${baseUrl}${asset.url}`,
                    type: asset.type || getMimeTypeFromUrl(asset.url)
                }))
                console.log('[Canvas] Loaded', roomAssets.value.length, 'assets')
            }
        } catch (error) {
            console.error('[Canvas] Failed to load assets:', error)
        }
    }

    async function handleAssetUpload(uploadData: any) {
        console.log('[Canvas] Asset upload:', uploadData)

        if (uploadData && uploadData.success === true && uploadData.asset) {
            const serverAsset = uploadData.asset
            const baseUrl = apiService.getBaseUrl()
            const fullUrl = serverAsset.url && serverAsset.url.startsWith('http')
                ? serverAsset.url
                : `${baseUrl}${String(serverAsset.url).replace(/^constella:\/\//, '/')}`

            roomAssets.value.push({
                id: serverAsset.id,
                name: serverAsset.name,
                type: serverAsset.type,
                size: serverAsset.size,
                url: fullUrl,
                uploadedAt: serverAsset.uploadedAt
            })

            await loadRoomAssets()
            toast.success(t('canvas.toast.uploadSuccess'))
            return
        }

        const file = uploadData.file
        const response = await apiService.uploadAsset(roomId, file)

        if (!response.success) {
            console.error('[Canvas] Asset upload failed:', response.message)
            toast.error(t('canvas.toast.uploadFailed'))
            return
        }

        const serverAsset = response.data as AssetLike
        const baseUrl = apiService.getBaseUrl()
        roomAssets.value.push({
            id: serverAsset.id,
            name: serverAsset.name,
            type: serverAsset.type,
            size: serverAsset.size,
            url: serverAsset.url.startsWith('http') ? serverAsset.url : `${baseUrl}${serverAsset.url}`,
            uploadedAt: serverAsset.uploadedAt
        })

        await loadRoomAssets()
        toast.success(t('canvas.toast.uploadSuccess'))
    }

    async function handleAssetDelete(assetId: string) {
        const index = roomAssets.value.findIndex(asset => asset.id === assetId)
        if (index === -1) return

        const asset = roomAssets.value[index]
        if (!asset) return

        if (!asset.url.startsWith('blob:')) {
            const response = await apiService.deleteAsset(roomId, assetId)
            if (!response.success) {
                console.error('[Canvas] Asset delete failed:', response.message)
                toast.error(t('canvas.toast.deleteFailed'))
                return
            }
        } else {
            URL.revokeObjectURL(asset.url)
        }

        roomAssets.value.splice(index, 1)
        console.log('[Canvas] Asset deleted:', assetId)
        await loadRoomAssets()
    }

    function getCanvasPointFromClient(clientX: number, clientY: number): PointLike {
        const canvasArea = canvasAreaRef.value
        if (!canvasArea) {
            return { x: 0, y: 0 }
        }

        const rect = canvasArea.getBoundingClientRect()
        return {
            x: (clientX - rect.left - stagePosition.value.x) / stageScale.value,
            y: (clientY - rect.top - stagePosition.value.y) / stageScale.value
        }
    }

    function getViewportCenterCanvasPoint(): PointLike {
        const canvasArea = canvasAreaRef.value
        if (!canvasArea) {
            return { x: 0, y: 0 }
        }

        const rect = canvasArea.getBoundingClientRect()
        return getCanvasPointFromClient(rect.left + rect.width / 2, rect.top + rect.height / 2)
    }

    function createAssetNode(asset: AssetLike, position?: PointLike) {
        const baseUrl = apiService.getBaseUrl()
        let nodeUrl = asset.url
        if (nodeUrl.startsWith(baseUrl + '/')) {
            nodeUrl = 'constella:/' + nodeUrl.slice(baseUrl.length)
        }

        const nodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const width = 200
        const height = 150
        const targetPosition = position || getViewportCenterCanvasPoint()

        yjsNodes.createNode({
            id: nodeId,
            x: targetPosition.x - width / 2,
            y: targetPosition.y - height / 2,
            width,
            height,
            fill: '#ffffff',
            stroke: '#e0e0e0',
            content: {
                kind: 'image',
                data: nodeUrl,
                metadata: {
                    assetId: asset.id,
                    name: asset.name,
                    type: asset.type
                }
            }
        })

        console.log('[Canvas] Image node created:', nodeId, targetPosition)
    }

    function handleAssetInsert(asset: AssetLike, position?: PointLike) {
        console.log('[Canvas] Insert asset:', asset)
        createAssetNode(asset, position)
    }

    function handleCanvasDragOver(event: DragEvent) {
        const hasAsset = Array.from(event.dataTransfer?.types || []).includes('application/x-constella-asset')
        if (!hasAsset || !event.dataTransfer) return
        event.dataTransfer.dropEffect = 'copy'
    }

    function handleCanvasDrop(event: DragEvent) {
        const rawAsset = event.dataTransfer?.getData('application/x-constella-asset')
        if (!rawAsset) return

        try {
            const asset = JSON.parse(rawAsset) as AssetLike
            handleAssetInsert(asset, getCanvasPointFromClient(event.clientX, event.clientY))
        } catch (error) {
            console.error('[Canvas] Failed to parse dropped asset:', error)
        }
    }

    onMounted(() => {
        loadRoomAssets()
        assetsRefreshInterval = setInterval(() => {
            loadRoomAssets()
        }, 4000)
    })

    onUnmounted(() => {
        if (assetsRefreshInterval) {
            clearInterval(assetsRefreshInterval)
            assetsRefreshInterval = null
        }
    })

    return {
        roomAssets,
        loadRoomAssets,
        handleAssetUpload,
        handleAssetDelete,
        handleAssetInsert,
        handleCanvasDragOver,
        handleCanvasDrop,
        getCanvasPointFromClient,
        getViewportCenterCanvasPoint
    }
}

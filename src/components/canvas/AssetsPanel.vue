<template>
    <div class="assets-panel">
        <!-- 上传按钮 -->
        <div class="upload-area">
            <input
                ref="fileInputRef"
                type="file"
                multiple
                accept="image/*"
                class="file-input"
                @change="handleFileSelect"
            />
            <button class="upload-btn" @click="triggerFileSelect">
                <span class="icon">📤</span>
                <span class="text">{{ t('canvas.assets.upload') }}</span>
            </button>
            <span class="hint">{{ t('canvas.assets.supportedFormats') }}</span>
        </div>
        
        <!-- 上传进度 -->
        <div v-if="uploading" class="upload-progress">
            <div class="progress-bar">
                <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <span class="progress-text">{{ t('canvas.assets.uploading') }} {{ uploadProgress }}%</span>
        </div>
        
        <!-- 资源列表 -->
        <div v-if="assets.length > 0" class="assets-grid">
            <div
                v-for="asset in assets"
                :key="asset.id"
                class="asset-item"
                :class="{ selected: selectedAssetId === asset.id }"
                draggable="true"
                @click="selectAsset(asset)"
                @dblclick="insertAsset(asset)"
                @dragstart="handleAssetDragStart(asset, $event)"
            >
                <div class="asset-preview">
                    <img
                        v-if="asset.type.startsWith('image')"
                        :src="asset.url"
                        :alt="asset.name"
                    />
                    <span v-else class="file-icon">📄</span>
                </div>
                <div class="asset-info">
                    <span class="asset-name" :title="asset.name">{{ truncateName(asset.name) }}</span>
                    <span class="asset-size">{{ formatSize(asset.size) }}</span>
                </div>
                <button 
                    class="delete-btn" 
                    @click.stop="showDeleteConfirm(asset.id)"
                    :title="t('canvas.assets.delete')"
                >
                    ✕
                </button>
            </div>
        </div>
        
        <!-- 空状态 -->
        <div v-else class="empty-state">
            <span class="empty-icon">🖼️</span>
            <span class="empty-text">{{ t('canvas.assets.empty') }}</span>
            <span class="empty-hint">{{ t('canvas.assets.emptyHint') }}</span>
        </div>
        
        <!-- 选中资源操作 -->
        <div v-if="selectedAssetId" class="asset-actions">
            <button class="action-btn" @click="insertSelectedAsset">
                <span>➕</span> {{ t('canvas.assets.insertToCanvas') }}
            </button>
            <button class="action-btn" @click="copyAssetUrl">
                <span>📋</span> {{ t('canvas.assets.copyLink') }}
            </button>
        </div>
        
        <!-- 删除确认弹窗 -->
        <ConfirmDialog
            v-model="isDeleteDialogOpen"
            :title="t('canvas.assets.deleteConfirmTitle')"
            :message="t('canvas.assets.deleteConfirmMessage')"
            type="danger"
            @confirm="confirmDelete"
        />
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { apiService } from '@/services/api'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'

const { t } = useI18n()
const ASSET_DRAG_MIME = 'application/x-constella-asset'

const props = defineProps({
    assets: {
        type: Array,
        default: () => []
    },
    roomId: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['upload', 'delete', 'insert', 'select'])

const fileInputRef = ref(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const selectedAssetId = ref(null)

// 删除确认弹窗
const isDeleteDialogOpen = ref(false)
const pendingDeleteId = ref(null)

// 选中的资源
const selectedAsset = computed(() => {
    return props.assets.find(a => a.id === selectedAssetId.value)
})

// 触发文件选择
function triggerFileSelect() {
    fileInputRef.value?.click()
}

// 处理文件选择
function handleFileSelect(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    
    uploadFiles(files)
    
    // 清除 input 以便重复选择同一文件
    e.target.value = ''
}

// 上传文件（使用 XHR 支持上传进度）
async function uploadFiles(files) {
    if (!files || files.length === 0) return

    uploading.value = true
    uploadProgress.value = 0

    const totalFiles = files.length

    try {
        for (let i = 0; i < totalFiles; i++) {
            const file = files[i]

            // 使用 XMLHttpRequest 进行文件上传以获取进度
            await new Promise((resolve) => {
                const xhr = new XMLHttpRequest()
                const url = `${apiService.getBaseUrl()}/api/v1/rooms/${props.roomId}/assets`

                xhr.open('POST', url, true)

                // 授权头（如果有）
                const token = localStorage.getItem('access_token')
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
                }

                xhr.upload.onprogress = (e) => {
                    const fileProgress = e.lengthComputable ? e.loaded / e.total : 0
                    // 计算整体进度（简单平均 + 当前文件进度）
                    uploadProgress.value = Math.round(((i + fileProgress) / totalFiles) * 100)
                }

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        let result = {}
                        try {
                            result = JSON.parse(xhr.responseText)
                        } catch (err) {
                            console.error('Invalid JSON response for upload:', err)
                        }

                        // 服务器可能返回 data 为资源相对路径或对象
                        let assetUrl = ''
                        if (result && result.data) {
                            if (typeof result.data === 'string') {
                                // 如果是相对路径（uploads/...）或已经带协议
                                if (result.data.startsWith('uploads/')) {
                                    assetUrl = 'constella://' + result.data
                                } else {
                                    assetUrl = result.data
                                }
                            } else if (typeof result.data === 'object' && result.data.url) {
                                assetUrl = result.data.url
                            }
                        }

                        const asset = {
                            id: (result && result.data && result.data.id) || Date.now().toString(),
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            url: assetUrl || `constella://uploads/assets/${file.name}`
                        }

                        // 通知父组件上传成功，带上服务器返回的资源信息
                        emit('upload', { success: true, asset, raw: result })
                        resolve(undefined)
                    } else {
                        console.error('Upload failed:', xhr.status, xhr.statusText)
                        emit('upload', { success: false, error: xhr.statusText })
                        resolve(undefined)
                    }
                }

                xhr.onerror = () => {
                    console.error('Upload network error')
                    emit('upload', { success: false, error: 'Network error' })
                    resolve(undefined)
                }

                const formData = new FormData()
                formData.append('file', file)
                xhr.send(formData)
            })
        }

        uploadProgress.value = 100
    } catch (error) {
        console.error('Upload failed:', error)
    } finally {
        setTimeout(() => {
            uploading.value = false
            uploadProgress.value = 0
        }, 500)
    }
}

// 选择资源
function selectAsset(asset) {
    selectedAssetId.value = asset.id
    emit('select', asset)
}

// 插入资源到画布
function insertAsset(asset) {
    emit('insert', asset)
}

// 插入选中的资源
function insertSelectedAsset() {
    if (selectedAsset.value) {
        emit('insert', selectedAsset.value)
    }
}

function handleAssetDragStart(asset, event) {
    if (!event.dataTransfer) return

    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(ASSET_DRAG_MIME, JSON.stringify(asset))
    event.dataTransfer.setData('text/plain', asset.name || asset.id || 'asset')
}

// 显示删除确认弹窗
function showDeleteConfirm(assetId) {
    pendingDeleteId.value = assetId
    isDeleteDialogOpen.value = true
}

// 确认删除资源
function confirmDelete() {
    if (pendingDeleteId.value) {
        emit('delete', pendingDeleteId.value)
        if (selectedAssetId.value === pendingDeleteId.value) {
            selectedAssetId.value = null
        }
        pendingDeleteId.value = null
    }
}

// 复制资源链接
async function copyAssetUrl() {
    if (!selectedAsset.value) return
    
    try {
        await navigator.clipboard.writeText(selectedAsset.value.url)
        // TODO: 显示成功提示
        console.log('URL copied:', selectedAsset.value.url)
    } catch (error) {
        console.error('Copy failed:', error)
    }
}

// 截断文件名
function truncateName(name) {
    if (name.length <= 15) return name
    const ext = name.split('.').pop()
    const baseName = name.slice(0, name.length - ext.length - 1)
    if (baseName.length <= 10) return name
    return baseName.slice(0, 8) + '...' + '.' + ext
}

// 格式化文件大小
function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<style scoped>
.assets-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 4px;
}

/* 上传区域 */
.upload-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: var(--bg-secondary);
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    transition: all 0.2s;
}

.upload-area:hover {
    border-color: var(--color-primary);
    background: rgba(102, 126, 234, 0.05);
}

.file-input {
    display: none;
}

.upload-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.upload-btn:hover {
    background: var(--color-primary-dark);
    transform: translateY(-1px);
}

.upload-btn .icon {
    font-size: 16px;
}

.hint {
    font-size: 12px;
    color: var(--text-tertiary);
}

/* 上传进度 */
.upload-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.progress-bar {
    height: 6px;
    background: var(--bg-tertiary);
    border-radius: 3px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: var(--color-primary);
    transition: width 0.3s ease;
}

.progress-text {
    font-size: 12px;
    color: var(--text-secondary);
    text-align: center;
}

/* 资源网格 */
.assets-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

.asset-item {
    position: relative;
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
}

.asset-item:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.asset-item.selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.asset-preview {
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    overflow: hidden;
}

.asset-preview img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.file-icon {
    font-size: 32px;
}

.asset-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
}

.asset-name {
    font-size: 12px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.asset-size {
    font-size: 11px;
    color: var(--text-tertiary);
}

.delete-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s;
}

.asset-item:hover .delete-btn {
    opacity: 1;
}

.delete-btn:hover {
    background: #ef4444;
}

/* 空状态 */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 32px 16px;
    text-align: center;
}

.empty-icon {
    font-size: 48px;
    opacity: 0.5;
}

.empty-text {
    font-size: 14px;
    color: var(--text-secondary);
}

.empty-hint {
    font-size: 12px;
    color: var(--text-tertiary);
}

/* 资源操作 */
.asset-actions {
    display: flex;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border-color);
}

.action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 12px;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s;
}

.action-btn:hover {
    background: var(--bg-tertiary);
    border-color: var(--color-primary);
}
</style>

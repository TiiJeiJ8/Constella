<template>
    <div class="assets-panel">
        <div class="upload-area" :class="{ disabled: !canUpload }">
            <input
                ref="fileInputRef"
                type="file"
                multiple
                accept="image/*"
                class="file-input"
                :disabled="!canUpload"
                @change="handleFileSelect"
            />
            <button class="upload-btn" :disabled="!canUpload || uploading" @click="triggerFileSelect">
                <span class="icon">+</span>
                <span class="text">{{ t('canvas.assets.upload') }}</span>
            </button>
            <span class="hint">{{ t('canvas.assets.supportedFormats') }}</span>
            <span v-if="!canUpload" class="readonly-hint">{{ readOnlyHint }}</span>
        </div>

        <div v-if="uploading" class="upload-progress">
            <div class="progress-bar">
                <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <span class="progress-text">{{ t('canvas.assets.uploading') }} {{ uploadProgress }}%</span>
        </div>

        <div v-if="assets.length > 0" class="assets-grid">
            <div
                v-for="asset in assets"
                :key="asset.id"
                class="asset-item"
                :class="{
                    selected: selectedAssetId === asset.id,
                    readonly: !canInsert
                }"
                :draggable="canInsert"
                @click="selectAsset(asset)"
                @dblclick="insertAsset(asset)"
                @dragstart="handleAssetDragStart(asset, $event)"
            >
                <div class="asset-preview">
                    <img
                        v-if="asset.type?.startsWith('image')"
                        :src="asset.url"
                        :alt="asset.name"
                    />
                    <svg v-else class="file-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 4.75h7l3 3v11.5H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.7" />
                        <path d="M14 4.75V8h3" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.7" />
                    </svg>
                </div>
                <div class="asset-info">
                    <span class="asset-name" :title="asset.name">{{ truncateName(asset.name) }}</span>
                    <span class="asset-size">{{ formatSize(asset.size) }}</span>
                </div>
                <button
                    v-if="asset.canDelete !== false"
                    class="delete-btn"
                    :disabled="!canUpload"
                    :title="t('canvas.assets.delete')"
                    @click.stop="showDeleteConfirm(asset.id)"
                >
                    x
                </button>
            </div>
        </div>

        <div v-else class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4.75" y="5.5" width="14.5" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7" />
                <circle cx="9" cy="10" r="1.2" fill="currentColor" />
                <path d="m8 16 3.2-3.2L14 15l1.8-1.8L17 14.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
            <span class="empty-text">{{ t('canvas.assets.empty') }}</span>
            <span class="empty-hint">{{ t('canvas.assets.emptyHint') }}</span>
        </div>

        <div v-if="selectedAssetId" class="asset-actions">
            <button class="action-btn" :disabled="!canInsert" @click="insertSelectedAsset">
                <span>></span>
                <span>{{ t('canvas.assets.insertToCanvas') }}</span>
            </button>
            <button class="action-btn" @click="copyAssetUrl">
                <span>#</span>
                <span>{{ t('canvas.assets.copyLink') }}</span>
            </button>
        </div>

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
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
import { apiService } from '@/services/api'

const { t, locale } = useI18n()
const ASSET_DRAG_MIME = 'application/x-constella-asset'

const props = defineProps({
    assets: {
        type: Array,
        default: () => []
    },
    roomId: {
        type: String,
        required: true
    },
    canUpload: {
        type: Boolean,
        default: true
    },
    canInsert: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits(['upload', 'delete', 'insert', 'select'])

const fileInputRef = ref(null)
const uploading = ref(false)
const uploadProgress = ref(0)
const selectedAssetId = ref(null)
const isDeleteDialogOpen = ref(false)
const pendingDeleteId = ref(null)

const selectedAsset = computed(() => props.assets.find(asset => asset.id === selectedAssetId.value) || null)
const readOnlyHint = computed(() => (
    locale.value === 'zh-CN'
        ? '当前为只读模式，不能上传或删除素材。'
        : 'Read-only mode: uploading and deleting assets is disabled.'
))

function triggerFileSelect() {
    if (!props.canUpload || uploading.value) return
    fileInputRef.value?.click()
}

function handleFileSelect(event) {
    if (!props.canUpload) {
        event.target.value = ''
        return
    }

    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
        uploadFiles(files)
    }

    event.target.value = ''
}

async function uploadFiles(files) {
    if (!props.canUpload || !files?.length) return

    uploading.value = true
    uploadProgress.value = 0
    const totalFiles = files.length

    try {
        for (let i = 0; i < totalFiles; i += 1) {
            const file = files[i]

            await new Promise(resolve => {
                const xhr = new XMLHttpRequest()
                const url = `${apiService.getBaseUrl()}/api/v1/rooms/${props.roomId}/assets`

                xhr.open('POST', url, true)

                const token = localStorage.getItem('access_token')
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
                }

                xhr.upload.onprogress = progressEvent => {
                    const fileProgress = progressEvent.lengthComputable ? progressEvent.loaded / progressEvent.total : 0
                    uploadProgress.value = Math.round(((i + fileProgress) / totalFiles) * 100)
                }

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        let result = {}
                        try {
                            result = JSON.parse(xhr.responseText)
                        } catch (error) {
                            console.error('Invalid JSON response for upload:', error)
                        }

                        let assetUrl = ''
                        if (result?.data) {
                            if (typeof result.data === 'string') {
                                assetUrl = result.data.startsWith('uploads/')
                                    ? `constella://${result.data}`
                                    : result.data
                            } else if (typeof result.data === 'object' && result.data.url) {
                                assetUrl = result.data.url
                            }
                        }

                        const asset = {
                            id: result?.data?.id || Date.now().toString(),
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            url: assetUrl || `constella://uploads/assets/${file.name}`
                        }

                        emit('upload', { success: true, asset, raw: result })
                    } else {
                        console.error('Upload failed:', xhr.status, xhr.statusText)
                        emit('upload', { success: false, error: xhr.statusText })
                    }

                    resolve(undefined)
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
        window.setTimeout(() => {
            uploading.value = false
            uploadProgress.value = 0
        }, 500)
    }
}

function selectAsset(asset) {
    selectedAssetId.value = asset.id
    emit('select', asset)
}

function insertAsset(asset) {
    if (!props.canInsert) return
    emit('insert', asset)
}

function insertSelectedAsset() {
    if (!props.canInsert || !selectedAsset.value) return
    emit('insert', selectedAsset.value)
}

function handleAssetDragStart(asset, event) {
    if (!props.canInsert || !event.dataTransfer) {
        event.preventDefault?.()
        return
    }

    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(ASSET_DRAG_MIME, JSON.stringify(asset))
    event.dataTransfer.setData('text/plain', asset.name || asset.id || 'asset')
}

function showDeleteConfirm(assetId) {
    if (!props.canUpload) return
    pendingDeleteId.value = assetId
    isDeleteDialogOpen.value = true
}

function confirmDelete() {
    if (!props.canUpload || !pendingDeleteId.value) return

    emit('delete', pendingDeleteId.value)
    if (selectedAssetId.value === pendingDeleteId.value) {
        selectedAssetId.value = null
    }
    pendingDeleteId.value = null
}

async function copyAssetUrl() {
    if (!selectedAsset.value) return

    try {
        await navigator.clipboard.writeText(selectedAsset.value.url)
    } catch (error) {
        console.error('Copy failed:', error)
    }
}

function truncateName(name) {
    if (name.length <= 15) return name
    const ext = name.split('.').pop()
    const baseName = name.slice(0, name.length - ext.length - 1)
    if (baseName.length <= 10) return name
    return `${baseName.slice(0, 8)}....${ext}`
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style scoped>
.assets-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 4px;
}

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

.upload-area.disabled {
    border-style: solid;
    opacity: 0.72;
}

.upload-area.disabled:hover {
    border-color: var(--border-color);
    background: var(--bg-secondary);
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

.upload-btn:hover:not(:disabled) {
    background: var(--color-primary-dark);
    transform: translateY(-1px);
}

.upload-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.upload-btn .icon {
    font-size: 16px;
}

.hint,
.readonly-hint {
    font-size: 12px;
    color: var(--text-tertiary);
}

.readonly-hint {
    text-align: center;
}

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

.asset-item.readonly {
    cursor: default;
}

.asset-item.readonly:hover {
    box-shadow: none;
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
    width: 32px;
    height: 32px;
    color: var(--text-tertiary);
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

.asset-item:hover .delete-btn,
.asset-item.selected .delete-btn {
    opacity: 1;
}

.delete-btn:hover:not(:disabled) {
    background: #ef4444;
}

.delete-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 32px 16px;
    text-align: center;
}

.empty-icon {
    width: 48px;
    height: 48px;
    opacity: 0.5;
    color: var(--text-tertiary);
}

.empty-text {
    font-size: 14px;
    color: var(--text-secondary);
}

.empty-hint {
    font-size: 12px;
    color: var(--text-tertiary);
}

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

.action-btn:hover:not(:disabled) {
    background: var(--bg-tertiary);
    border-color: var(--color-primary);
}

.action-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}
</style>

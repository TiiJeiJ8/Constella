<template>
    <div class="history-panel">
        <!-- 快照操作 -->
        <div class="snapshot-actions">
            <button class="snapshot-btn" @click="createSnapshot" :disabled="isCreating">
                <span class="icon">📸</span>
                <span class="text">{{ isCreating ? t('canvas.history.creating') : t('canvas.history.createSnapshot') }}</span>
            </button>
            <span class="auto-save-hint" v-if="autoSaveEnabled">
                {{ t('canvas.history.autoSaveEnabled') }} ({{ autoSaveInterval }}s)
            </span>
        </div>
        
        <!-- 快照列表 -->
        <div v-if="snapshots.length > 0" class="snapshots-list">
            <h4 class="list-title">{{ t('canvas.history.snapshotList') }}</h4>
            <div
                v-for="snapshot in sortedSnapshots"
                :key="snapshot.id"
                class="snapshot-item"
                :class="{ active: activeSnapshotId === snapshot.id }"
            >
                <div class="snapshot-info" @click="previewSnapshot(snapshot)">
                    <span class="snapshot-icon">📷</span>
                    <div class="snapshot-details">
                        <span class="snapshot-name">{{ snapshot.name || t('canvas.history.snapshot') }}</span>
                        <span class="snapshot-time">{{ formatTime(snapshot.createdAt) }}</span>
                    </div>
                </div>
                <div class="snapshot-actions-inline">
                    <button 
                        class="action-btn small" 
                        @click.stop="showRestoreConfirm(snapshot)"
                        :title="t('canvas.history.restore')"
                    >
                        ↩️
                    </button>
                    <button 
                        class="action-btn small danger" 
                        @click.stop="showDeleteConfirm(snapshot.id)"
                        :title="t('canvas.history.delete')"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>
        
        <!-- 空状态 -->
        <div v-else class="empty-state">
            <span class="empty-icon">📚</span>
            <span class="empty-text">{{ t('canvas.history.empty') }}</span>
            <span class="empty-hint">{{ t('canvas.history.emptyHint') }}</span>
        </div>
        
        <!-- 自动保存设置 -->
        <div class="auto-save-settings">
            <div class="setting-row">
                <label class="setting-label">
                    <input 
                        type="checkbox" 
                        v-model="autoSaveEnabled"
                        @change="toggleAutoSave"
                    />
                    <span>{{ t('canvas.history.autoSaveSnapshot') }}</span>
                </label>
            </div>
            <div v-if="autoSaveEnabled" class="setting-row">
                <label class="setting-label">{{ t('canvas.history.interval') }}</label>
                <select v-model="autoSaveInterval" @change="updateAutoSaveInterval">
                    <option :value="15">15 {{ t('canvas.history.seconds') }}</option>
                    <option :value="30">30 {{ t('canvas.history.seconds') }}</option>
                    <option :value="60">1 {{ t('canvas.history.minute') }}</option>
                    <option :value="300">5 {{ t('canvas.history.minutes') }}</option>
                </select>
            </div>
        </div>
        
        <!-- 恢复确认弹窗 -->
        <ConfirmDialog
            v-model="isRestoreDialogOpen"
            :title="t('canvas.history.restoreConfirmTitle')"
            :message="t('canvas.history.restoreConfirmMessage')"
            @confirm="confirmRestore"
        />
        
        <!-- 删除确认弹窗 -->
        <ConfirmDialog
            v-model="isDeleteDialogOpen"
            :title="t('canvas.history.deleteConfirmTitle')"
            :message="t('canvas.history.deleteConfirmMessage')"
            type="danger"
            @confirm="confirmDelete"
        />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'

const { t } = useI18n()

const props = defineProps({
    snapshots: {
        type: Array,
        default: () => []
    },
    currentState: {
        type: Object,
        default: null
    }
})

const emit = defineEmits(['create-snapshot', 'restore-snapshot', 'delete-snapshot', 'preview-snapshot'])

const isCreating = ref(false)
const activeSnapshotId = ref(null)
const autoSaveEnabled = ref(false)
const autoSaveInterval = ref(15)  // 默认 15 秒
let autoSaveTimer = null

// 恢复/删除确认弹窗状态
const isRestoreDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const pendingRestoreSnapshot = ref(null)
const pendingDeleteId = ref(null)

// 按时间排序的快照列表（最新在前）
const sortedSnapshots = computed(() => {
    return [...props.snapshots].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
})

// 创建快照
async function createSnapshot() {
    isCreating.value = true
    try {
        const snapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        emit('create-snapshot', {
            id: snapshotId,
            name: `${t('canvas.history.snapshot')} ${formatTime(new Date().toISOString())}`,
            createdAt: new Date().toISOString(),
            auto: false
        })
    } finally {
        isCreating.value = false
    }
}

// 自动创建快照
function autoCreateSnapshot() {
    if (!autoSaveEnabled.value) return
    
    const snapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    emit('create-snapshot', {
        id: snapshotId,
        name: `${t('canvas.history.autoSave')} ${formatTime(new Date().toISOString())}`,
        createdAt: new Date().toISOString(),
        auto: true
    })
}

// 预览快照
function previewSnapshot(snapshot) {
    activeSnapshotId.value = snapshot.id
    emit('preview-snapshot', snapshot)
}

// 显示恢复确认弹窗
function showRestoreConfirm(snapshot) {
    pendingRestoreSnapshot.value = snapshot
    isRestoreDialogOpen.value = true
}

// 确认恢复快照
function confirmRestore() {
    if (pendingRestoreSnapshot.value) {
        emit('restore-snapshot', pendingRestoreSnapshot.value)
        pendingRestoreSnapshot.value = null
    }
}

// 显示删除确认弹窗
function showDeleteConfirm(snapshotId) {
    pendingDeleteId.value = snapshotId
    isDeleteDialogOpen.value = true
}

// 确认删除快照
function confirmDelete() {
    if (pendingDeleteId.value) {
        emit('delete-snapshot', pendingDeleteId.value)
        if (activeSnapshotId.value === pendingDeleteId.value) {
            activeSnapshotId.value = null
        }
        pendingDeleteId.value = null
    }
}

// 切换自动保存
function toggleAutoSave() {
    if (autoSaveEnabled.value) {
        startAutoSave()
    } else {
        stopAutoSave()
    }
}

// 更新自动保存间隔
function updateAutoSaveInterval() {
    if (autoSaveEnabled.value) {
        stopAutoSave()
        startAutoSave()
    }
}

// 启动自动保存
function startAutoSave() {
    stopAutoSave()  // 确保没有重复的定时器
    autoSaveTimer = setInterval(() => {
        autoCreateSnapshot()
    }, autoSaveInterval.value * 1000)
    console.log('[HistoryPanel] Auto-save started:', autoSaveInterval.value, 's')
}

// 停止自动保存
function stopAutoSave() {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer)
        autoSaveTimer = null
        console.log('[HistoryPanel] Auto-save stopped')
    }
}

// 格式化时间
function formatTime(isoString) {
    const date = new Date(isoString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    // 1 分钟内
    if (diff < 60 * 1000) {
        return '刚刚'
    }
    
    // 1 小时内
    if (diff < 60 * 60 * 1000) {
        const mins = Math.floor(diff / (60 * 1000))
        return `${mins} 分钟前`
    }
    
    // 今天
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    
    // 更早
    return date.toLocaleString('zh-CN', { 
        month: 'numeric', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
    })
}

onMounted(() => {
    // 从 localStorage 恢复设置
    const savedAutoSave = localStorage.getItem('canvas_auto_save_enabled')
    const savedInterval = localStorage.getItem('canvas_auto_save_interval')
    
    if (savedAutoSave === 'true') {
        autoSaveEnabled.value = true
        if (savedInterval) {
            autoSaveInterval.value = parseInt(savedInterval, 10)
        }
        startAutoSave()
    }
})

onUnmounted(() => {
    stopAutoSave()
})

// 保存设置到 localStorage
watch(autoSaveEnabled, (val) => {
    localStorage.setItem('canvas_auto_save_enabled', val.toString())
})

watch(autoSaveInterval, (val) => {
    localStorage.setItem('canvas_auto_save_interval', val.toString())
})
</script>

<style scoped>
.history-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 4px;
}

/* 快照操作 */
.snapshot-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.snapshot-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.snapshot-btn:hover:not(:disabled) {
    background: var(--color-primary-dark);
    transform: translateY(-1px);
}

.snapshot-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.snapshot-btn .icon {
    font-size: 16px;
}

.auto-save-hint {
    font-size: 12px;
    color: var(--text-tertiary);
    text-align: center;
}

/* 快照列表 */
.snapshots-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.list-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin: 0;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color);
}

.snapshot-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.snapshot-item:hover {
    border-color: var(--color-primary);
    background: rgba(102, 126, 234, 0.05);
}

.snapshot-item.active {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.snapshot-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
}

.snapshot-icon {
    font-size: 20px;
}

.snapshot-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.snapshot-name {
    font-size: 13px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.snapshot-time {
    font-size: 11px;
    color: var(--text-tertiary);
}

.snapshot-actions-inline {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
}

.snapshot-item:hover .snapshot-actions-inline {
    opacity: 1;
}

.action-btn {
    padding: 6px 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.action-btn:hover {
    background: var(--bg-secondary);
    border-color: var(--color-primary);
}

.action-btn.small {
    padding: 4px 6px;
    font-size: 11px;
}

.action-btn.danger:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.5);
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

/* 自动保存设置 */
.auto-save-settings {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.setting-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
}

.setting-label input[type="checkbox"] {
    width: 16px;
    height: 16px;
}

.setting-row select {
    padding: 6px 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
}

.setting-row select:focus {
    outline: none;
    border-color: var(--color-primary);
}
</style>

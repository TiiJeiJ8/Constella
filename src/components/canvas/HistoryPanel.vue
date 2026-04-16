<template>
    <div class="history-panel">
        <div class="snapshot-actions">
            <button class="snapshot-btn" :disabled="isCreateDisabled" @click="createSnapshot">
                <span class="icon">+</span>
                <span class="text">{{ isCreating ? t('canvas.history.creating') : t('canvas.history.createSnapshot') }}</span>
            </button>
            <span v-if="autoSaveEnabled" class="auto-save-hint">
                {{ t('canvas.history.autoSaveEnabled') }} ({{ autoSaveInterval }}s)
            </span>
            <span v-if="!canCreateSnapshots" class="readonly-hint">{{ readOnlyHint }}</span>
        </div>

        <div v-if="snapshots.length > 0" class="snapshots-list">
            <h4 class="list-title">{{ t('canvas.history.snapshotList') }}</h4>
            <div
                v-for="snapshot in sortedSnapshots"
                :key="snapshot.id"
                class="snapshot-item"
                :class="{ active: activeSnapshotId === snapshot.id }"
            >
                <div class="snapshot-info" @click="previewSnapshot(snapshot)">
                    <svg class="snapshot-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 4.75h7l3 3v11.5H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.7" />
                        <path d="M14 4.75V8h3" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.7" />
                    </svg>
                    <div class="snapshot-details">
                        <span class="snapshot-name">{{ formatSnapshotName(snapshot) }}</span>
                        <span class="snapshot-time">{{ formatTime(snapshot.createdAt) }}</span>
                    </div>
                </div>

                <div class="snapshot-actions-inline">
                    <button
                        class="action-btn small"
                        :disabled="!canManageSnapshots"
                        :title="t('canvas.history.restore')"
                        :aria-label="t('canvas.history.restore')"
                        @click.stop="showRestoreConfirm(snapshot)"
                    >
                        <svg class="action-icon" viewBox="0 0 20 20" aria-hidden="true">
                            <path
                                d="M10 3.5a6.5 6.5 0 1 1-5.22 10.38a.75.75 0 0 1 1.2-.9A5 5 0 1 0 5 10H3.56a.75.75 0 0 1 0-1.5H6.5A.75.75 0 0 1 7.25 9.25v2.94a.75.75 0 0 1-1.5 0v-1.37A6.47 6.47 0 0 1 10 3.5Zm-.75 3.25a.75.75 0 0 1 1.5 0v3.04l2.07 1.2a.75.75 0 1 1-.75 1.3l-2.44-1.41a.75.75 0 0 1-.38-.65V6.75Z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                    <button
                        class="action-btn small danger"
                        :disabled="!canManageSnapshots"
                        :title="t('canvas.history.delete')"
                        :aria-label="t('canvas.history.delete')"
                        @click.stop="showDeleteConfirm(snapshot.id)"
                    >
                        <svg class="action-icon" viewBox="0 0 20 20" aria-hidden="true">
                            <path
                                d="M7.25 3A1.75 1.75 0 0 0 5.5 4.75V5H3.75a.75.75 0 0 0 0 1.5h.55l.64 8.03A2.25 2.25 0 0 0 7.18 16.75h5.64a2.25 2.25 0 0 0 2.24-2.22l.64-8.03h.55a.75.75 0 0 0 0-1.5H14.5v-.25A1.75 1.75 0 0 0 12.75 3h-5.5Zm5.75 2V4.75a.25.25 0 0 0-.25-.25h-5.5a.25.25 0 0 0-.25.25V5h6Zm-5 3a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4A.75.75 0 0 1 8 8Zm4 .75a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0v-4Z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <div v-else class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4.75h7l3 3v11.5H7A2.25 2.25 0 0 1 4.75 17V7A2.25 2.25 0 0 1 7 4.75Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.7" />
                <path d="M14 4.75V8h3" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.7" />
                <path d="M8.75 13.25h6.5M8.75 16h4.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
            </svg>
            <span class="empty-text">{{ t('canvas.history.empty') }}</span>
            <span class="empty-hint">{{ t('canvas.history.emptyHint') }}</span>
        </div>

        <div class="auto-save-settings" :class="{ disabled: !canCreateSnapshots }">
            <div class="setting-row">
                <label class="setting-label">
                    <input
                        v-model="autoSaveEnabled"
                        type="checkbox"
                        :disabled="!canCreateSnapshots"
                        @change="toggleAutoSave"
                    />
                    <span>{{ t('canvas.history.autoSaveSnapshot') }}</span>
                </label>
            </div>
            <div v-if="autoSaveEnabled" class="setting-row">
                <label class="setting-label">{{ t('canvas.history.interval') }}</label>
                <select v-model="autoSaveInterval" :disabled="!canCreateSnapshots" @change="updateAutoSaveInterval">
                    <option :value="15">15 {{ t('canvas.history.seconds') }}</option>
                    <option :value="30">30 {{ t('canvas.history.seconds') }}</option>
                    <option :value="60">1 {{ t('canvas.history.minute') }}</option>
                    <option :value="300">5 {{ t('canvas.history.minutes') }}</option>
                </select>
            </div>
        </div>

        <ConfirmDialog
            v-model="isRestoreDialogOpen"
            :title="t('canvas.history.restoreConfirmTitle')"
            :message="t('canvas.history.restoreConfirmMessage')"
            @confirm="confirmRestore"
        />

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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'

const { t, locale } = useI18n()

const props = defineProps({
    snapshots: {
        type: Array,
        default: () => []
    },
    currentState: {
        type: Object,
        default: null
    },
    canCreateSnapshots: {
        type: Boolean,
        default: true
    },
    canManageSnapshots: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits(['create-snapshot', 'restore-snapshot', 'delete-snapshot', 'preview-snapshot'])

const isCreating = ref(false)
const activeSnapshotId = ref(null)
const autoSaveEnabled = ref(false)
const autoSaveInterval = ref(15)
const isRestoreDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const pendingRestoreSnapshot = ref(null)
const pendingDeleteId = ref(null)
let autoSaveTimer = null

const isCreateDisabled = computed(() => isCreating.value || !props.canCreateSnapshots)
const sortedSnapshots = computed(() => (
    [...props.snapshots].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
))
const readOnlyHint = computed(() => (
    locale.value === 'zh-CN'
        ? '当前为只读模式，不能创建、恢复或删除快照。'
        : 'Read-only mode: snapshot changes are disabled.'
))

async function createSnapshot() {
    if (!props.canCreateSnapshots) return

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

function autoCreateSnapshot() {
    if (!autoSaveEnabled.value || !props.canCreateSnapshots) return

    const snapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    emit('create-snapshot', {
        id: snapshotId,
        name: `${t('canvas.history.autoSave')} ${formatTime(new Date().toISOString())}`,
        createdAt: new Date().toISOString(),
        auto: true
    })
}

function previewSnapshot(snapshot) {
    activeSnapshotId.value = snapshot.id
    emit('preview-snapshot', snapshot)
}

function showRestoreConfirm(snapshot) {
    if (!props.canManageSnapshots) return
    pendingRestoreSnapshot.value = snapshot
    isRestoreDialogOpen.value = true
}

function confirmRestore() {
    if (!props.canManageSnapshots || !pendingRestoreSnapshot.value) return
    emit('restore-snapshot', pendingRestoreSnapshot.value)
    pendingRestoreSnapshot.value = null
}

function showDeleteConfirm(snapshotId) {
    if (!props.canManageSnapshots) return
    pendingDeleteId.value = snapshotId
    isDeleteDialogOpen.value = true
}

function confirmDelete() {
    if (!props.canManageSnapshots || !pendingDeleteId.value) return
    emit('delete-snapshot', pendingDeleteId.value)
    if (activeSnapshotId.value === pendingDeleteId.value) {
        activeSnapshotId.value = null
    }
    pendingDeleteId.value = null
}

function toggleAutoSave() {
    if (!props.canCreateSnapshots) {
        autoSaveEnabled.value = false
        return
    }

    if (autoSaveEnabled.value) {
        startAutoSave()
    } else {
        stopAutoSave()
    }
}

function updateAutoSaveInterval() {
    if (!props.canCreateSnapshots || !autoSaveEnabled.value) return
    stopAutoSave()
    startAutoSave()
}

function startAutoSave() {
    if (!props.canCreateSnapshots) return
    stopAutoSave()
    autoSaveTimer = window.setInterval(() => {
        autoCreateSnapshot()
    }, autoSaveInterval.value * 1000)
}

function stopAutoSave() {
    if (!autoSaveTimer) return
    window.clearInterval(autoSaveTimer)
    autoSaveTimer = null
}

function formatSnapshotName(snapshot) {
    if (!snapshot) return t('canvas.history.snapshot')

    const rawName = typeof snapshot.name === 'string' ? snapshot.name.trim() : ''
    const localizedPrefix = snapshot.auto ? t('canvas.history.autoSave') : t('canvas.history.snapshot')

    if (!rawName) {
        return localizedPrefix
    }

    if (/^(快照|Snapshot)\s/.test(rawName) || /^(自动保存|Auto-save)\s/.test(rawName)) {
        return `${localizedPrefix} ${formatTime(snapshot.createdAt)}`
    }

    return rawName
}

function formatTime(isoString) {
    const date = new Date(isoString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60 * 1000) {
        return locale.value === 'zh-CN' ? '刚刚' : 'Just now'
    }

    if (diff < 60 * 60 * 1000) {
        const mins = Math.floor(diff / (60 * 1000))
        return locale.value === 'zh-CN' ? `${mins} 分钟前` : `${mins} min ago`
    }

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return date.toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

onMounted(() => {
    if (!props.canCreateSnapshots) {
        autoSaveEnabled.value = false
        return
    }

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

watch(autoSaveEnabled, value => {
    localStorage.setItem('canvas_auto_save_enabled', value.toString())
})

watch(autoSaveInterval, value => {
    localStorage.setItem('canvas_auto_save_interval', value.toString())
})

watch(() => props.canCreateSnapshots, value => {
    if (value) return
    autoSaveEnabled.value = false
    stopAutoSave()
})
</script>

<style scoped>
.history-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 4px;
}

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

.auto-save-hint,
.readonly-hint {
    font-size: 12px;
    color: var(--text-tertiary);
    text-align: center;
}

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
    width: 20px;
    height: 20px;
    display: block;
    flex-shrink: 0;
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
    gap: 6px;
    opacity: 0;
    transition: opacity 0.2s;
}

.snapshot-item:hover .snapshot-actions-inline,
.snapshot-item.active .snapshot-actions-inline {
    opacity: 1;
}

.action-btn {
    width: 30px;
    height: 30px;
    padding: 0;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    flex-shrink: 0;
}

.action-btn:hover:not(:disabled) {
    background: var(--bg-secondary);
    border-color: var(--color-primary);
    color: var(--text-primary);
}

.action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.action-btn.small {
    width: 28px;
    height: 28px;
}

.action-btn.danger:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.5);
    color: #ef4444;
}

.action-icon {
    width: 15px;
    height: 15px;
    display: block;
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

.auto-save-settings {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.auto-save-settings.disabled {
    opacity: 0.72;
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

.setting-label input[type='checkbox'] {
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

.setting-row select:disabled {
    cursor: not-allowed;
}
</style>

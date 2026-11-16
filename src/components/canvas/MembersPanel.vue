<template>
    <div>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div v-if="modelValue" class="members-overlay" @click.self="$emit('update:modelValue', false)">
                <div class="members-modal">
                    <div class="members-header">
                        <div class="header-main">
                            <h3 class="members-title">{{ t('canvas.topBar.members') }}</h3>
                            <span class="members-count">{{ roomMembers.length }} {{ t('rooms.members') }}</span>
                            <span class="header-presence">{{ presenceSummary }}</span>
                        </div>
                        <button class="close-btn" @click="$emit('update:modelValue', false)">
                            <svg class="close-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.9" />
                            </svg>
                        </button>
                    </div>

                    <div class="members-toolbar">
                        <input
                            v-model.trim="searchQuery"
                            type="text"
                            class="search-input"
                            :placeholder="copy.searchPlaceholder"
                        />
                    </div>

                    <div class="members-list">
                        <div v-if="loading" class="state-text">{{ copy.loading }}</div>
                        <div v-else-if="loadError" class="state-text error">{{ loadError }}</div>
                        <div v-else-if="filteredMembers.length === 0" class="state-text">{{ copy.empty }}</div>

                        <template v-else>
                            <section
                                v-for="section in memberSections"
                                :key="section.key"
                                class="member-section"
                            >
                                <div class="member-section-title">
                                    <span class="section-dot" :class="{ online: section.key === 'online' }" />
                                    <span>{{ section.label }}</span>
                                    <span class="section-count">{{ section.members.length }}</span>
                                </div>

                                <div
                                    v-for="member in section.members"
                                    :key="member.id"
                                    class="member-item"
                                    :class="{ me: member.user_id === currentUserId, offline: !isMemberOnline(member) }"
                                >
                                    <div class="member-avatar-wrap">
                                        <div class="member-avatar" :style="{ background: getRandomColor(getMemberStableId(member)) }">
                                            {{ getMemberDisplayName(member).charAt(0).toUpperCase() }}
                                        </div>
                                        <span
                                            class="presence-dot"
                                            :class="{ online: isMemberOnline(member) }"
                                            :title="presenceLabel(member)"
                                            :aria-label="presenceLabel(member)"
                                        />
                                    </div>

                                    <div class="member-info">
                                        <div class="member-line">
                                            <span class="member-name">{{ getMemberDisplayName(member) }}</span>
                                            <span
                                                class="inline-role"
                                                :class="roleClassName(member.role)"
                                                :title="rolePermissionTitle(member.role)"
                                            >{{ roleLabel(member.role) }}</span>
                                        </div>
                                        <span class="member-status">{{ getMemberMeta(member) }}</span>
                                    </div>

                                    <div v-if="canManageMember(member)" class="member-actions">
                                        <select
                                            class="role-select"
                                            :value="normalizeRole(member.role)"
                                            :disabled="isMemberBusy(member.id)"
                                            @change="handleRoleSelectChange(member, $event)"
                                        >
                                            <option value="viewer">{{ roleLabel('viewer') }}</option>
                                            <option value="editor">{{ roleLabel('editor') }}</option>
                                            <option v-if="roomRole === 'owner'" value="admin">{{ roleLabel('admin') }}</option>
                                        </select>
                                        <button
                                            v-if="canTransferOwnership(member)"
                                            class="transfer-btn"
                                            :disabled="isMemberBusy(member.id)"
                                            :title="copy.transfer"
                                            @click="handleOwnershipTransfer(member)"
                                        >
                                            {{ copy.transfer }}
                                        </button>
                                        <button
                                            class="remove-btn"
                                            :disabled="isMemberBusy(member.id)"
                                            :title="copy.remove"
                                            @click="handleMemberRemove(member)"
                                        >
                                            {{ copy.remove }}
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </template>
                    </div>

                    <div class="members-footer">
                        <span class="room-id">{{ t('members.roomId') }}: {{ roomId }}</span>
                        <span v-if="actionMessage" class="action-message" :class="{ error: actionError }">{{ actionMessage }}</span>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>

    <ConfirmDialog
        v-model="isConfirmDialogOpen"
        :title="confirmState.title"
        :message="confirmState.message"
        :confirm-text="confirmState.confirmText"
        :type="confirmState.type"
        @confirm="runPendingAction"
        @cancel="clearPendingAction"
    />
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
import { apiService } from '@/services/api'
import { getErrorMessage } from '@/utils/errorHandler'
import { getStoredUser, getUserId, getUsername } from '@/utils/storage'

const { t, locale } = useI18n()

interface UserInfo {
    id: string
    name: string
    isMe?: boolean
}

interface RoomMemberItem {
    id: string
    room_id: string
    user_id: string
    role: string
    joined_at?: string
    user?: {
        id: string
        username?: string
        nickname?: string
        displayName?: string
        email?: string
    } | null
}

const props = defineProps<{
    modelValue: boolean
    roomId: string
    currentUsers: UserInfo[]
    roomRole?: string | null
    canManageMembers?: boolean
    canEditCanvas?: boolean
    canManageSnapshots?: boolean
}>()

defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const currentUserId = getUserId() || ''
const currentStoredUser = getStoredUser()
const currentUsername = getUsername()?.trim() || ''

const searchQuery = ref('')
const loading = ref(false)
const loadError = ref('')
const roomMembers = ref<RoomMemberItem[]>([])
const updatingMemberId = ref('')
const removingMemberId = ref('')
const transferringMemberId = ref('')
const actionMessage = ref('')
const actionError = ref(false)
const isConfirmDialogOpen = ref(false)
const pendingAction = ref<null | (() => void | Promise<void>)>(null)
const confirmState = ref({
    title: '',
    message: '',
    confirmText: '',
    type: 'default' as 'default' | 'danger'
})

const copy = computed(() => locale.value === 'zh-CN'
    ? {
        searchPlaceholder: '\u6309\u7528\u6237\u540d / UUID / ID \u641c\u7d22',
        loading: '\u6b63\u5728\u52a0\u8f7d\u6210\u5458\u2026',
        empty: '\u6ca1\u6709\u5339\u914d\u7684\u6210\u5458',
        readonly: '\u5f53\u524d\u4e3a\u53ea\u8bfb\u534f\u4f5c\u6a21\u5f0f',
        manageMembers: '\u53ef\u641c\u7d22\u6210\u5458\u5e76\u76f4\u63a5\u8c03\u6574\u89d2\u8272',
        manageSnapshots: '\u53ef\u7f16\u8f91\u753b\u5e03\u5e76\u7ba1\u7406\u5feb\u7167',
        editable: '\u53ef\u7f16\u8f91\u753b\u5e03\u5185\u5bb9',
        owner: '\u623f\u4e3b',
        admin: '\u7ba1\u7406\u5458',
        editor: '\u7f16\u8f91\u8005',
        viewer: '\u67e5\u770b\u8005',
        unknownMember: '\u672a\u547d\u540d\u6210\u5458',
        loadMembersFailed: '\u52a0\u8f7d\u6210\u5458\u5931\u8d25',
        updateRoleFailed: '\u66f4\u65b0\u89d2\u8272\u5931\u8d25',
        roleUpdated: '\u89d2\u8272\u5df2\u66f4\u65b0',
        removeMemberFailed: '\u79fb\u9664\u6210\u5458\u5931\u8d25',
        memberRemoved: '\u6210\u5458\u5df2\u79fb\u9664',
        transferFailed: '\u8f6c\u8ba9\u623f\u4e3b\u5931\u8d25',
        transferDone: '\u623f\u4e3b\u5df2\u8f6c\u8ba9',
        transfer: '\u8f6c\u8ba9\u623f\u4e3b',
        remove: '\u79fb\u9664',
        confirm: '\u786e\u8ba4',
        online: '\u5728\u7ebf',
        offline: '\u79bb\u7ebf',
        confirmRole: '\u786e\u8ba4\u5c06 {name} \u8c03\u6574\u4e3a\u300c{role}\u300d\u5417\uff1f',
        confirmRemove: '\u786e\u8ba4\u79fb\u9664\u6210\u5458\u300c{name}\u300d\u5417\uff1f',
        confirmTransfer: '\u786e\u8ba4\u5c06\u623f\u4e3b\u8f6c\u8ba9\u7ed9\u300c{name}\u300d\u5417\uff1f\u4f60\u5c06\u964d\u4e3a\u7ba1\u7406\u5458\u3002'
    }
    : {
        searchPlaceholder: 'Search by username / UUID / ID',
        loading: 'Loading members...',
        empty: 'No matching members',
        readonly: 'You are collaborating in read-only mode',
        manageMembers: 'Search room members and update roles directly',
        manageSnapshots: 'You can edit the canvas and manage snapshots',
        editable: 'You can edit the canvas',
        owner: 'Owner',
        admin: 'Admin',
        editor: 'Editor',
        viewer: 'Viewer',
        unknownMember: 'Unknown member',
        loadMembersFailed: 'Failed to load members',
        updateRoleFailed: 'Failed to update role',
        roleUpdated: 'Role updated',
        removeMemberFailed: 'Failed to remove member',
        memberRemoved: 'Member removed',
        transferFailed: 'Failed to transfer ownership',
        transferDone: 'Ownership transferred',
        transfer: 'Transfer',
        remove: 'Remove',
        confirm: 'Confirm',
        online: 'Online',
        offline: 'Offline',
        confirmRole: 'Change {name} to "{role}"?',
        confirmRemove: 'Remove member "{name}"?',
        confirmTransfer: 'Transfer ownership to "{name}"? You will become an admin.'
    })

const filteredMembers = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    const list = roomMembers.value.filter(member => {
        if (!query) return true

        const fields = [
            getMemberDisplayName(member),
            getMemberStableId(member),
            member.user?.username || '',
            member.user?.nickname || '',
            member.user?.displayName || '',
            member.user?.email || '',
            member.user_id
        ].map(value => String(value).toLowerCase())

        return fields.some(value => value.includes(query))
    }).slice()

    list.sort((left, right) => {
        const roleDelta = rolePriority(normalizeRole(left.role)) - rolePriority(normalizeRole(right.role))
        if (roleDelta !== 0) return roleDelta
        return getMemberDisplayName(left).localeCompare(getMemberDisplayName(right))
    })

    return list
})

const onlineMembers = computed(() => filteredMembers.value.filter(member => isMemberOnline(member)))
const offlineMembers = computed(() => filteredMembers.value.filter(member => !isMemberOnline(member)))

const memberSections = computed(() => {
    const sections: Array<{ key: 'online' | 'offline'; label: string; members: RoomMemberItem[] }> = []

    if (onlineMembers.value.length) {
        sections.push({ key: 'online', label: copy.value.online, members: onlineMembers.value })
    }

    if (offlineMembers.value.length) {
        sections.push({ key: 'offline', label: copy.value.offline, members: offlineMembers.value })
    }

    return sections
})

const presenceSummary = computed(() => `${copy.value.online} ${onlineMembers.value.length} · ${copy.value.offline} ${offlineMembers.value.length}`)

function resolveApiError(source: any, fallback: string): string {
    return getErrorMessage(source?.errorCode, fallback)
}

function normalizeRole(role: string) {
    return role === 'member' ? 'editor' : role
}

function rolePriority(role: string) {
    if (role === 'owner') return 0
    if (role === 'admin') return 1
    if (role === 'editor') return 2
    if (role === 'viewer') return 3
    return 4
}

function roleLabel(role: string) {
    const normalized = normalizeRole(role)
    if (normalized === 'owner') return copy.value.owner
    if (normalized === 'admin') return copy.value.admin
    if (normalized === 'editor') return copy.value.editor
    if (normalized === 'viewer') return copy.value.viewer
    return normalized
}

function roleClassName(role: string) {
    const normalized = normalizeRole(role)
    if (normalized === 'owner') return 'role-owner'
    if (normalized === 'admin') return 'role-admin'
    if (normalized === 'viewer') return 'role-viewer'
    return 'role-member'
}

function rolePermissionTitle(role: string) {
    const normalized = normalizeRole(role)
    if (normalized === 'owner' || normalized === 'admin') return copy.value.manageMembers
    if (normalized === 'editor') return copy.value.editable
    if (normalized === 'viewer') return copy.value.readonly
    return roleLabel(role)
}

function getOnlineUser(member: RoomMemberItem) {
    return props.currentUsers.find(user => user.id === member.user_id)
}

function isMemberOnline(member: RoomMemberItem) {
    return Boolean(getOnlineUser(member))
}

function presenceLabel(member: RoomMemberItem) {
    return isMemberOnline(member) ? t('members.online') : t('members.offline')
}

function getMemberStableId(member: RoomMemberItem) {
    return member.user_id || member.user?.id || member.id
}

function getMemberDisplayName(member: RoomMemberItem) {
    const onlineUser = getOnlineUser(member)
    if (onlineUser?.name?.trim()) return onlineUser.name.trim()

    const displayName = member.user?.displayName?.trim()
    if (displayName) return displayName

    const nickname = member.user?.nickname?.trim()
    if (nickname) return nickname

    const username = member.user?.username?.trim()
    if (username) return username

    if (member.user_id === currentUserId) {
        const selfName =
            currentStoredUser?.displayName?.trim?.() ||
            currentStoredUser?.nickname?.trim?.() ||
            currentUsername

        if (selfName) return selfName
    }

    return copy.value.unknownMember
}

function getMemberMeta(member: RoomMemberItem) {
    const stableId = getMemberStableId(member)
    return member.user_id === currentUserId ? `${t('members.me')} · ${stableId}` : stableId
}

function interpolate(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce(
        (message, [key, value]) => message.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
        template
    )
}

function isMemberBusy(memberId: string) {
    return updatingMemberId.value === memberId ||
        removingMemberId.value === memberId ||
        transferringMemberId.value === memberId
}

function openConfirmDialog(options: {
    title: string
    message: string
    confirmText?: string
    type?: 'default' | 'danger'
    action: () => void | Promise<void>
}) {
    confirmState.value = {
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || copy.value.confirm,
        type: options.type || 'default'
    }
    pendingAction.value = options.action
    isConfirmDialogOpen.value = true
}

function clearPendingAction() {
    pendingAction.value = null
}

function runPendingAction() {
    const action = pendingAction.value
    pendingAction.value = null
    if (action) void action()
}

async function loadMembers() {
    if (!props.modelValue) return

    loading.value = true
    loadError.value = ''

    try {
        const response = await apiService.getRoomMembers(props.roomId)
        if (!response.success) {
            loadError.value = resolveApiError(response, copy.value.loadMembersFailed)
            roomMembers.value = []
            return
        }

        roomMembers.value = Array.isArray(response.data?.members) ? response.data.members : []
    } catch (error: any) {
        loadError.value = resolveApiError(error, copy.value.loadMembersFailed)
        roomMembers.value = []
    } finally {
        loading.value = false
    }
}

async function handleRoleChange(member: RoomMemberItem, nextRole: string) {
    if (!member.id || !nextRole) return
    if (normalizeRole(member.role) === nextRole) return
    openConfirmDialog({
        title: roleLabel(nextRole),
        message: interpolate(copy.value.confirmRole, {
            name: getMemberDisplayName(member),
            role: roleLabel(nextRole)
        }),
        action: async () => {
            updatingMemberId.value = member.id
            actionMessage.value = ''
            actionError.value = false

            try {
                const response = await apiService.updateRoomMemberRole(props.roomId, member.id, nextRole)
                if (!response.success) {
                    actionError.value = true
                    actionMessage.value = resolveApiError(response, copy.value.updateRoleFailed)
                    return
                }

                roomMembers.value = roomMembers.value.map(item => item.id === member.id ? { ...item, role: nextRole } : item)
                actionMessage.value = copy.value.roleUpdated
            } catch (error: any) {
                actionError.value = true
                actionMessage.value = resolveApiError(error, copy.value.updateRoleFailed)
            } finally {
                updatingMemberId.value = ''
            }
        }
    })
}

function handleRoleSelectChange(member: RoomMemberItem, event: Event) {
    const target = event.target as HTMLSelectElement | null
    if (!target) return
    void handleRoleChange(member, target.value)
}

function canManageMember(member: RoomMemberItem) {
    if (!props.canManageMembers) return false
    if (member.user_id === currentUserId) return false

    const targetRole = normalizeRole(member.role)
    if (targetRole === 'owner') return false
    if (props.roomRole === 'owner') return true

    return props.roomRole === 'admin' && targetRole !== 'admin'
}

function canTransferOwnership(member: RoomMemberItem) {
    return props.roomRole === 'owner' &&
        member.user_id !== currentUserId &&
        normalizeRole(member.role) !== 'owner'
}

async function handleMemberRemove(member: RoomMemberItem) {
    if (!member.id) return
    openConfirmDialog({
        title: copy.value.remove,
        message: interpolate(copy.value.confirmRemove, {
            name: getMemberDisplayName(member)
        }),
        type: 'danger',
        action: async () => {
            removingMemberId.value = member.id
            actionMessage.value = ''
            actionError.value = false

            try {
                const response = await apiService.removeRoomMember(props.roomId, member.id)
                if (!response.success) {
                    actionError.value = true
                    actionMessage.value = resolveApiError(response, copy.value.removeMemberFailed)
                    return
                }

                roomMembers.value = roomMembers.value.filter(item => item.id !== member.id)
                actionMessage.value = copy.value.memberRemoved
            } catch (error: any) {
                actionError.value = true
                actionMessage.value = resolveApiError(error, copy.value.removeMemberFailed)
            } finally {
                removingMemberId.value = ''
            }
        }
    })
}

async function handleOwnershipTransfer(member: RoomMemberItem) {
    if (!member.id) return
    openConfirmDialog({
        title: copy.value.transfer,
        message: interpolate(copy.value.confirmTransfer, {
            name: getMemberDisplayName(member)
        }),
        action: async () => {
            transferringMemberId.value = member.id
            actionMessage.value = ''
            actionError.value = false

            try {
                const response = await apiService.transferRoomOwnership(props.roomId, member.id)
                if (!response.success) {
                    actionError.value = true
                    actionMessage.value = resolveApiError(response, copy.value.transferFailed)
                    return
                }

                const previousOwnerId = response.data?.previous_owner?.id
                const newOwnerId = response.data?.new_owner?.id
                roomMembers.value = roomMembers.value.map(item => {
                    if (item.id === previousOwnerId) return { ...item, role: 'admin' }
                    if (item.id === newOwnerId) return { ...item, role: 'owner' }
                    return item
                })
                actionMessage.value = copy.value.transferDone
            } catch (error: any) {
                actionError.value = true
                actionMessage.value = resolveApiError(error, copy.value.transferFailed)
            } finally {
                transferringMemberId.value = ''
            }
        }
    })
}

function getRandomColor(id: string): string {
    const colors = ['#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1']
    let hash = 0
    for (let index = 0; index < id.length; index += 1) {
        hash = id.charCodeAt(index) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length] as string
}

watch(() => props.modelValue, (isOpen) => {
    if (isOpen) void loadMembers()
})

function handleRoomMembersUpdated(event: Event) {
    const customEvent = event as CustomEvent<{ roomId?: string }>
    if (customEvent.detail?.roomId !== props.roomId) return
    if (!props.modelValue) return
    void loadMembers()
}

onMounted(() => {
    window.addEventListener('room-members-updated', handleRoomMembersUpdated as EventListener)
})

onUnmounted(() => {
    window.removeEventListener('room-members-updated', handleRoomMembersUpdated as EventListener)
})
</script>

<style scoped src="./MembersPanel.css"></style>

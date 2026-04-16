<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div v-if="modelValue" class="members-overlay" @click.self="$emit('update:modelValue', false)">
                <div class="members-modal">
                    <div class="members-header">
                        <div class="header-main">
                            <h3 class="members-title">{{ t('canvas.topBar.members') }}</h3>
                            <span class="members-count">{{ roomMembers.length }} {{ t('rooms.members') }}</span>
                        </div>
                        <button class="close-btn" @click="$emit('update:modelValue', false)">
                            <svg class="close-icon" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.9" />
                            </svg>
                        </button>
                    </div>

                    <div class="permissions-strip">
                        <span v-if="roomRoleLabel" class="role-chip" :class="roleChipClass">{{ roomRoleLabel }}</span>
                        <span class="permission-summary">{{ permissionSummary }}</span>
                    </div>

                    <div class="search-panel">
                        <input
                            v-model.trim="searchQuery"
                            type="text"
                            class="search-input"
                            :placeholder="searchPlaceholder"
                        />
                    </div>

                    <div class="members-list">
                        <div v-if="loading" class="state-text">{{ loadingText }}</div>
                        <div v-else-if="loadError" class="state-text error">{{ loadError }}</div>
                        <div v-else-if="filteredMembers.length === 0" class="state-text">
                            {{ emptyText }}
                        </div>

                        <div
                            v-for="member in filteredMembers"
                            :key="member.id"
                            class="member-item"
                            :class="{ me: member.user_id === currentUserId, offline: !isMemberOnline(member) }"
                        >
                            <div class="member-avatar" :style="{ background: getRandomColor(getMemberStableId(member)) }">
                                {{ getMemberDisplayName(member).charAt(0).toUpperCase() }}
                            </div>

                            <div class="member-info">
                                <div class="member-line">
                                    <span
                                        class="presence-dot"
                                        :class="{ online: isMemberOnline(member) }"
                                        :title="presenceLabel(member)"
                                        :aria-label="presenceLabel(member)"
                                    />
                                    <span class="member-name">{{ getMemberDisplayName(member) }}</span>
                                    <span class="inline-role" :class="roleClassName(member.role)">{{ roleLabel(member.role) }}</span>
                                </div>
                                <span class="member-status">{{ getMemberMeta(member) }}</span>
                            </div>

                            <div
                                v-if="canManageMembers && member.user_id !== currentUserId && normalizeRole(member.role) !== 'owner'"
                                class="member-actions"
                            >
                                <select
                                    class="role-select"
                                    :value="normalizeRole(member.role)"
                                    :disabled="updatingMemberId === member.id"
                                    @change="handleRoleSelectChange(member.id, $event)"
                                >
                                    <option value="viewer">{{ roleLabel('viewer') }}</option>
                                    <option value="editor">{{ roleLabel('editor') }}</option>
                                    <option v-if="roomRole === 'owner'" value="admin">{{ roleLabel('admin') }}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="members-footer">
                        <span class="room-id">{{ t('members.roomId') }}: {{ roomId }}</span>
                        <span v-if="actionMessage" class="action-message" :class="{ error: actionError }">{{ actionMessage }}</span>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { apiService } from '@/services/api'
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
const actionMessage = ref('')
const actionError = ref(false)

const searchPlaceholder = computed(() => (
    locale.value === 'zh-CN'
        ? '按用户名 / UUID / ID 搜索'
        : 'Search by username / UUID / ID'
))

const loadingText = computed(() => (
    locale.value === 'zh-CN' ? '正在加载成员…' : 'Loading members...'
))

const emptyText = computed(() => (
    locale.value === 'zh-CN' ? '没有匹配的成员' : 'No matching members'
))

const filteredMembers = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return roomMembers.value

    return roomMembers.value.filter((member) => {
        const displayName = getMemberDisplayName(member)
        const publicUuid = getMemberPublicUuid(member)
        const stableId = getMemberStableId(member)

        const fields = [
            displayName,
            publicUuid,
            stableId,
            member.user?.nickname || '',
            member.user?.displayName || '',
            member.user?.username || '',
            member.user?.email || ''
        ].map(value => String(value).toLowerCase())

        return fields.some(value => value.includes(query))
    })
})

const roomRoleLabel = computed(() => {
    if (!props.roomRole) return ''
    return roleLabel(props.roomRole)
})

const roleChipClass = computed(() => roleClassName(props.roomRole || 'editor'))

const permissionSummary = computed(() => {
    if (!props.canEditCanvas) {
        return locale.value === 'zh-CN'
            ? '当前为只读协作模式'
            : 'You are collaborating in read-only mode'
    }

    if (props.canManageMembers) {
        return locale.value === 'zh-CN'
            ? '可搜索成员并直接调整角色'
            : 'Search room members and update roles directly'
    }

    if (props.canManageSnapshots) {
        return locale.value === 'zh-CN'
            ? '可编辑画布并管理快照'
            : 'You can edit the canvas and manage snapshots'
    }

    return locale.value === 'zh-CN'
        ? '可编辑画布内容'
        : 'You can edit the canvas'
})

function normalizeRole(role: string) {
    return role === 'member' ? 'editor' : role
}

function roleLabel(role: string) {
    const normalized = normalizeRole(role)

    if (locale.value === 'zh-CN') {
        if (normalized === 'owner') return '房主'
        if (normalized === 'admin') return '管理员'
        if (normalized === 'editor') return '编辑者'
        if (normalized === 'viewer') return '查看者'
    }

    if (normalized === 'owner') return 'Owner'
    if (normalized === 'admin') return 'Admin'
    if (normalized === 'editor') return 'Editor'
    if (normalized === 'viewer') return 'Viewer'
    return normalized
}

function roleClassName(role: string) {
    const normalized = normalizeRole(role)
    if (normalized === 'owner') return 'role-owner'
    if (normalized === 'admin') return 'role-admin'
    if (normalized === 'viewer') return 'role-viewer'
    return 'role-member'
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

function getMemberPublicUuid(member: RoomMemberItem) {
    const username = member.user?.username?.trim()
    if (username) return username

    if (member.user_id === currentUserId && currentUsername) {
        return currentUsername
    }

    return getMemberStableId(member)
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

    return locale.value === 'zh-CN' ? '未命名成员' : 'Unknown member'
}

function getMemberMeta(member: RoomMemberItem) {
    const publicUuid = getMemberPublicUuid(member)
    return member.user_id === currentUserId
        ? `${t('members.me')} · ${publicUuid}`
        : publicUuid
}

async function loadMembers() {
    if (!props.modelValue) return

    loading.value = true
    loadError.value = ''

    try {
        const response = await apiService.getRoomMembers(props.roomId)
        if (!response.success) {
            loadError.value = response.message || (locale.value === 'zh-CN' ? '加载成员失败' : 'Failed to load members')
            roomMembers.value = []
            return
        }

        roomMembers.value = Array.isArray(response.data?.members) ? response.data.members : []
    } catch (error: any) {
        loadError.value = error?.message || (locale.value === 'zh-CN' ? '加载成员失败' : 'Failed to load members')
        roomMembers.value = []
    } finally {
        loading.value = false
    }
}

async function handleRoleChange(memberId: string, nextRole: string) {
    if (!memberId || !nextRole) return

    updatingMemberId.value = memberId
    actionMessage.value = ''
    actionError.value = false

    try {
        const response = await apiService.updateRoomMemberRole(props.roomId, memberId, nextRole)
        if (!response.success) {
            actionError.value = true
            actionMessage.value = response.message || (locale.value === 'zh-CN' ? '更新角色失败' : 'Failed to update role')
            return
        }

        roomMembers.value = roomMembers.value.map(member => (
            member.id === memberId ? { ...member, role: nextRole } : member
        ))
        actionMessage.value = locale.value === 'zh-CN' ? '角色已更新' : 'Role updated'
    } catch (error: any) {
        actionError.value = true
        actionMessage.value = error?.message || (locale.value === 'zh-CN' ? '更新角色失败' : 'Failed to update role')
    } finally {
        updatingMemberId.value = ''
    }
}

function handleRoleSelectChange(memberId: string, event: Event) {
    const target = event.target as HTMLSelectElement | null
    if (!target) return
    void handleRoleChange(memberId, target.value)
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
    if (isOpen) {
        void loadMembers()
    }
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

<style scoped>
.members-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);backdrop-filter:blur(4px)}
.members-modal{width:480px;max-height:80vh;display:flex;flex-direction:column;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,.3)}
.members-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px 12px;border-bottom:1px solid var(--border-color)}
.header-main{display:flex;align-items:center;gap:10px}
.members-title{margin:0;font-size:16px;font-weight:600;color:var(--text-primary)}
.members-count{padding:4px 8px;border-radius:12px;background:var(--bg-secondary);color:var(--text-secondary);font-size:12px}
.close-btn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;margin-left:auto;border:none;border-radius:8px;background:transparent;color:var(--text-secondary);cursor:pointer;transition:all .2s}
.close-btn:hover{background:var(--bg-secondary);color:var(--text-primary)}
.close-icon{width:16px;height:16px;display:block}
.permissions-strip{display:flex;flex-wrap:wrap;gap:8px;padding:12px 20px;border-bottom:1px solid var(--border-color);background:var(--bg-secondary)}
.search-panel{padding:12px 20px;border-bottom:1px solid var(--border-color);background:var(--bg-primary)}
.search-input{width:100%;height:38px;padding:0 12px;border:1px solid var(--border-color);border-radius:10px;background:var(--bg-secondary);color:var(--text-primary)}
.role-chip,.inline-role{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.02em;white-space:nowrap}
.permission-summary{font-size:12px;color:var(--text-secondary)}
.role-owner{background:rgba(245,158,11,.16);color:#b45309}
.role-admin{background:rgba(59,130,246,.14);color:#1d4ed8}
.role-member{background:rgba(16,185,129,.14);color:#047857}
.role-viewer{background:rgba(107,114,128,.16);color:#4b5563}
.members-list{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:12px}
.member-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:var(--bg-secondary);transition:background .2s}
.member-item.me{border:1px solid rgba(102,126,234,.3);background:rgba(102,126,234,.1)}
.member-item.offline .member-avatar{filter:grayscale(.4);opacity:.74}
.member-avatar{width:36px;height:36px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-size:14px;font-weight:600}
.member-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.member-line{display:flex;align-items:center;gap:8px;min-width:0}
.presence-dot{width:8px;height:8px;flex-shrink:0;border-radius:50%;background:rgba(107,114,128,.55);box-shadow:0 0 0 1px rgba(107,114,128,.14)}
.presence-dot.online{background:#22c55e;box-shadow:0 0 0 1px rgba(34,197,94,.16)}
.member-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-primary);font-size:14px;font-weight:500}
.member-status{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--text-tertiary);font-family:monospace}
.member-actions{display:flex;align-items:center}
.role-select{height:34px;padding:0 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);color:var(--text-primary)}
.members-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 20px;border-top:1px solid var(--border-color)}
.room-id{font-size:11px;color:var(--text-tertiary);font-family:monospace}
.action-message{font-size:12px;color:#16a34a}
.action-message.error{color:#dc2626}
.state-text{padding:16px 8px;text-align:center;color:var(--text-secondary);font-size:13px}
.state-text.error{color:#dc2626}
.members-list::-webkit-scrollbar{width:4px}
.members-list::-webkit-scrollbar-thumb{background:var(--border-color);border-radius:2px}
.modal-fade-enter-active,.modal-fade-leave-active{transition:opacity .2s ease}
.modal-fade-enter-from,.modal-fade-leave-to{opacity:0}
.modal-fade-enter-active .members-modal{animation:modal-in .2s ease-out}
.modal-fade-leave-active .members-modal{animation:modal-out .15s ease-in}
@keyframes modal-in{from{opacity:0;transform:scale(.9) translateY(-10px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes modal-out{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.9)}}
</style>

<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div v-if="modelValue" class="members-overlay" @click.self="$emit('update:modelValue', false)">
                <div class="members-modal">
                    <div class="members-header">
                        <div class="header-main">
                            <h3 class="members-title">{{ t('canvas.topBar.members') }}</h3>
                            <span class="members-count">{{ onlineCount }} {{ t('members.online') }}</span>
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

                    <div class="members-list">
                        <div class="member-item me">
                            <div class="member-avatar" :style="{ background: localUserColor }">{{ localUserName.charAt(0).toUpperCase() }}</div>
                            <div class="member-info">
                                <div class="member-line">
                                    <span class="member-name">{{ localUserName }}</span>
                                    <span v-if="roomRoleLabel" class="inline-role" :class="roleChipClass">{{ roomRoleLabel }}</span>
                                </div>
                                <span class="member-status online">{{ t('members.me') }}</span>
                            </div>
                        </div>

                        <div v-for="user in otherUsers" :key="user.id" class="member-item">
                            <div class="member-avatar" :style="{ background: getRandomColor(user.id) }">{{ (user.name || 'U').charAt(0).toUpperCase() }}</div>
                            <div class="member-info">
                                <div class="member-line">
                                    <span class="member-name">{{ user.name }}</span>
                                </div>
                                <span class="member-status online">{{ t('members.online') }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="members-footer">
                        <span class="room-id">{{ t('members.roomId') }}: {{ roomId }}</span>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

interface UserInfo {
    id: string
    name: string
    isMe?: boolean
}

const props = defineProps<{
    modelValue: boolean
    roomId: string
    currentUsers: UserInfo[]
    roomRole?: string | null
    canEditCanvas?: boolean
    canManageSnapshots?: boolean
}>()

defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const localUserName = computed(() => {
    const me = props.currentUsers.find(user => user.isMe)
    return me?.name || localStorage.getItem('username') || t('common.anonymous')
})

const localUserColor = computed(() => getRandomColor(localStorage.getItem('user_id') || 'default'))
const onlineCount = computed(() => props.currentUsers?.length || 1)
const otherUsers = computed(() => props.currentUsers?.filter(user => !user.isMe) || [])

const roomRoleLabel = computed(() => {
    const role = props.roomRole
    if (!role) return ''
    if (locale.value === 'zh-CN') {
        if (role === 'owner') return '\u6240\u6709\u8005'
        if (role === 'admin') return '\u7ba1\u7406\u5458'
        if (role === 'member') return '\u53ef\u7f16\u8f91'
        if (role === 'viewer') return '\u53ea\u8bfb'
    } else {
        if (role === 'owner') return 'Owner'
        if (role === 'admin') return 'Admin'
        if (role === 'member') return 'Editor'
        if (role === 'viewer') return 'Read only'
    }
    return role
})

const roleChipClass = computed(() => {
    if (props.roomRole === 'owner') return 'role-owner'
    if (props.roomRole === 'admin') return 'role-admin'
    if (props.roomRole === 'viewer') return 'role-viewer'
    return 'role-member'
})

const permissionSummary = computed(() => {
    if (locale.value === 'zh-CN') {
        if (!props.canEditCanvas) return '\u60a8当前以只读身份参与协作'
        if (props.canManageSnapshots) return '\u60a8可编辑画布，并可管理快照'
        return '\u60a8可编辑画布'
    }
    if (!props.canEditCanvas) return 'You are collaborating in read-only mode'
    if (props.canManageSnapshots) return 'You can edit the canvas and manage snapshots'
    return 'You can edit the canvas'
})

function getRandomColor(id: string): string {
    const colors = ['#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1']
    let hash = 0
    for (let index = 0; index < id.length; index += 1) {
        hash = id.charCodeAt(index) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length] as string
}
</script>

<style scoped>
.members-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);backdrop-filter:blur(4px)}
.members-modal{width:380px;max-height:80vh;display:flex;flex-direction:column;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,.3)}
.members-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px 12px;border-bottom:1px solid var(--border-color)}
.header-main{display:flex;align-items:center;gap:10px}.members-title{margin:0;font-size:16px;font-weight:600;color:var(--text-primary)}
.members-count{padding:4px 8px;border-radius:12px;background:var(--bg-secondary);color:var(--text-secondary);font-size:12px}
.close-btn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;margin-left:auto;border:none;border-radius:8px;background:transparent;color:var(--text-secondary);cursor:pointer;transition:all .2s}
.close-btn:hover{background:var(--bg-secondary);color:var(--text-primary)}.close-icon{width:16px;height:16px;display:block}
.permissions-strip{display:flex;flex-wrap:wrap;gap:8px;padding:12px 20px;border-bottom:1px solid var(--border-color);background:var(--bg-secondary)}
.role-chip,.inline-role{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.02em}
.permission-summary{font-size:12px;color:var(--text-secondary)}
.role-owner{background:rgba(245,158,11,.16);color:#b45309}.role-admin{background:rgba(59,130,246,.14);color:#1d4ed8}.role-member{background:rgba(16,185,129,.14);color:#047857}.role-viewer{background:rgba(107,114,128,.16);color:#4b5563}
.members-list{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:12px}
.member-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:var(--bg-secondary);transition:background .2s}
.member-item:hover{background:var(--bg-tertiary)}.member-item.me{border:1px solid rgba(102,126,234,.3);background:rgba(102,126,234,.1)}
.member-avatar{width:36px;height:36px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:50%;color:white;font-size:14px;font-weight:600}
.member-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.member-line{display:flex;align-items:center;gap:8px;min-width:0}
.member-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-primary);font-size:14px;font-weight:500}
.member-status{font-size:12px;color:var(--text-tertiary)}.member-status.online{color:#48bb78}
.members-footer{padding:12px 20px;border-top:1px solid var(--border-color)}.room-id{font-size:11px;color:var(--text-tertiary);font-family:monospace}
.members-list::-webkit-scrollbar{width:4px}.members-list::-webkit-scrollbar-thumb{background:var(--border-color);border-radius:2px}
.modal-fade-enter-active,.modal-fade-leave-active{transition:opacity .2s ease}.modal-fade-enter-from,.modal-fade-leave-to{opacity:0}
.modal-fade-enter-active .members-modal{animation:modal-in .2s ease-out}.modal-fade-leave-active .members-modal{animation:modal-out .15s ease-in}
@keyframes modal-in{from{opacity:0;transform:scale(.9) translateY(-10px)}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes modal-out{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.9)}}
</style>

<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div 
                v-if="modelValue" 
                class="members-overlay"
                @click.self="$emit('update:modelValue', false)"
            >
                <div class="members-modal">
                    <div class="members-header">
                        <h3 class="members-title">{{ t('canvas.topBar.members') }}</h3>
                        <span class="members-count">{{ onlineCount }} {{ t('members.online') }}</span>
                        <button class="close-btn" @click="$emit('update:modelValue', false)">✕</button>
                    </div>
                    
                    <div class="members-list">
                        <!-- 当前用户 -->
                        <div class="member-item me">
                            <div class="member-avatar" :style="{ background: localUserColor }">
                                {{ localUserName.charAt(0).toUpperCase() }}
                            </div>
                            <div class="member-info">
                                <span class="member-name">{{ localUserName }}</span>
                                <span class="member-status online">{{ t('members.me') }}</span>
                            </div>
                        </div>
                        
                        <!-- 其他在线用户 -->
                        <div 
                            v-for="user in otherUsers" 
                            :key="user.id"
                            class="member-item"
                        >
                            <div class="member-avatar" :style="{ background: getRandomColor(user.id) }">
                                {{ (user.name || 'U').charAt(0).toUpperCase() }}
                            </div>
                            <div class="member-info">
                                <span class="member-name">{{ user.name }}</span>
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

const { t } = useI18n()

interface UserInfo {
    id: string
    name: string
    isMe?: boolean
}

const props = defineProps<{
    modelValue: boolean
    roomId: string
    currentUsers: UserInfo[]
}>()

defineEmits<{
    (e: 'update:modelValue', value: boolean): void
}>()

const localUserName = computed(() => {
    const me = props.currentUsers.find(u => u.isMe)
    return me?.name || localStorage.getItem('username') || t('common.anonymous')
})

const localUserColor = computed(() => {
    return getRandomColor(localStorage.getItem('user_id') || 'default')
})

const onlineCount = computed(() => props.currentUsers?.length || 1)

// 其他在线用户
const otherUsers = computed(() => {
    if (!props.currentUsers) return []
    return props.currentUsers.filter(u => !u.isMe)
})

// 根据 ID 生成稳定的颜色
function getRandomColor(id: string): string {
    const colors = [
        '#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
        '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
    ]
    let hash = 0
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length] as string
}
</script>

<style scoped>
.members-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.members-modal {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    width: 360px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.members-header {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    gap: 12px;
}

.members-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.members-count {
    font-size: 12px;
    color: var(--text-secondary);
    background: var(--bg-secondary);
    padding: 4px 8px;
    border-radius: 12px;
}

.close-btn {
    margin-left: auto;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.close-btn:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

.members-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.member-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--bg-secondary);
    transition: background 0.2s;
}

.member-item:hover {
    background: var(--bg-tertiary);
}

.member-item.me {
    background: rgba(102, 126, 234, 0.1);
    border: 1px solid rgba(102, 126, 234, 0.3);
}

.member-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: white;
    flex-shrink: 0;
}

.member-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.member-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.member-status {
    font-size: 12px;
    color: var(--text-tertiary);
}

.member-status.online {
    color: #48bb78;
}

.members-footer {
    padding: 12px 20px;
    border-top: 1px solid var(--border-color);
}

.room-id {
    font-size: 11px;
    color: var(--text-tertiary);
    font-family: monospace;
}

/* 滚动条 */
.members-list::-webkit-scrollbar {
    width: 4px;
}

.members-list::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
}

/* 动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.modal-fade-enter-active .members-modal {
    animation: modal-in 0.2s ease-out;
}

.modal-fade-leave-active .members-modal {
    animation: modal-out 0.15s ease-in;
}

@keyframes modal-in {
    from {
        opacity: 0;
        transform: scale(0.9) translateY(-10px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

@keyframes modal-out {
    from {
        opacity: 1;
        transform: scale(1);
    }
    to {
        opacity: 0;
        transform: scale(0.9);
    }
}
</style>

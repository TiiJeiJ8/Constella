<template>
    <div class="room-card">
        <!-- 卡片主体（点击进入房间） -->
        <div class="card-body" @click="handleClick">
            <!-- 卡片头部 -->
            <div class="card-header">
                <!-- 房间图标 -->
                <div v-if="roomIcon" class="room-icon">
                    {{ roomIcon }}
                </div>
                
                <div class="room-info">
                    <h3 class="room-name">{{ room.name }}</h3>
                    <div class="room-meta">
                        <span class="creator">👤 {{ room.creator }}</span>
                        <span class="separator">·</span>
                        <span class="member-count">👥 {{ room.memberCount }}</span>
                    </div>
                </div>
                
                <!-- 隐私状态 -->
                <div class="privacy-badge" :class="room.isPrivate ? 'private' : 'public'">
                    <span class="icon">{{ room.isPrivate ? '🔒' : '🌐' }}</span>
                </div>
            </div>

            <!-- 卡片内容 -->
            <div class="card-content">
                <p class="room-description">{{ room.description || t('rooms.noDescription') }}</p>
            </div>

            <!-- 卡片底部 -->
            <div class="card-footer">
                <div class="tags">
                    <span v-if="room.role === 'owner'" class="role-badge owner">
                        👑 {{ t('rooms.roles.owner') }}
                    </span>
                    <span v-else-if="room.role === 'admin'" class="role-badge admin">
                        ⭐ {{ t('rooms.roles.admin') }}
                    </span>
                    <span v-else-if="room.role === 'member'" class="role-badge member">
                        {{ t('rooms.roles.member') }}
                    </span>
                </div>
                
                <!-- 删除按钮（仅owner在"我的房间"中可见） -->
                <button 
                    v-if="showDeleteButton" 
                    class="delete-btn"
                    @click.stop="handleDelete"
                    :title="t('rooms.delete.deleteRoom')"
                >
                    🗑️ {{ t('rooms.delete.delete') }}
                </button>
                
                <div class="last-active">
                    <span class="time">{{ formatTime(room.lastActive) }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
    room: {
        type: Object,
        required: true
    },
    showDelete: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['click', 'delete'])

// 房间图标
const roomIcon = computed(() => {
    return props.room.settings?.appearance?.icon || null
})

// 是否显示删除按钮
const showDeleteButton = computed(() => {
    return props.showDelete && props.room.role === 'owner'
})

function handleClick() {
    emit('click', props.room)
}

function handleDelete() {
    emit('delete', props.room)
}

function formatTime(timestamp) {
    if (!timestamp) return ''
    
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return t('rooms.time.justNow')
    if (minutes < 60) return t('rooms.time.minutesAgo', { n: minutes })
    if (hours < 24) return t('rooms.time.hoursAgo', { n: hours })
    if (days < 7) return t('rooms.time.daysAgo', { n: days })
    
    return new Date(timestamp).toLocaleDateString()
}
</script>

<style scoped>
.room-card {
    position: relative;
    background: var(--bg-secondary);
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                background-color 0.3s ease,
                border-color 0.3s ease;
    border: 1px solid var(--border-light);
    min-height: 180px;
    will-change: transform;
    backface-visibility: hidden;
}

.card-body {
    padding: 20px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    min-height: 180px;
}

.room-card:hover {
    transform: translateY(-4px) translateZ(0);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: var(--accent-primary);
}

.delete-btn {
    padding: 6px 14px;
    border: none;
    background: rgba(244, 67, 54, 0.1);
    color: #f44336;
    font-size: 13px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    opacity: 0;
}

.room-card:hover .delete-btn {
    opacity: 1;
}

.delete-btn:hover {
    background: rgba(244, 67, 54, 0.2);
    transform: scale(1.1);
}

.delete-btn:active {
    transform: scale(0.95);
}

.room-card:active {
    transform: translateY(-2px) translateZ(0);
}

.dark .room-card {
    background: rgba(40, 40, 40, 0.6);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.08);
}

.dark .room-card:hover {
    background: rgba(45, 45, 45, 0.7);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    border-color: var(--accent-primary);
}

.dark .privacy-badge.private {
    background: rgba(255, 152, 0, 0.2);
}

.dark .privacy-badge.public {
    background: rgba(76, 175, 80, 0.2);
}

.dark .role-badge.owner {
    background: rgba(255, 193, 7, 0.25);
    color: #ffb300;
}

.dark .role-badge.admin {
    background: rgba(103, 126, 234, 0.25);
    color: #8b9bef;
}

.dark .role-badge.member {
    background: rgba(158, 158, 158, 0.25);
}

/* ==================== 卡片头部 ==================== */
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    gap: 12px;
}

.room-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    flex-shrink: 0;
    background: linear-gradient(135deg, rgba(103, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    transition: transform 0.3s ease;
}

.room-card:hover .room-icon {
    transform: scale(1.1);
}

.dark .room-icon {
    background: linear-gradient(135deg, rgba(103, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
}

.room-info {
    flex: 1;
    min-width: 0;
}

.room-name {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 6px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.room-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
}

.creator {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.separator {
    opacity: 0.5;
}

.member-count {
    white-space: nowrap;
}

/* ==================== 隐私徽章 ==================== */
.privacy-badge {
    width: 32px;
    height: 32px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
}

.privacy-badge.private {
    background: rgba(255, 152, 0, 0.1);
}

.privacy-badge.public {
    background: rgba(76, 175, 80, 0.1);
}

/* ==================== 卡片内容 ==================== */
.card-content {
    flex: 1;
    margin-bottom: 12px;
}

.room-description {
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* ==================== 卡片底部 ==================== */
.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid var(--border-light);
}

.tags {
    display: flex;
    gap: 8px;
}

.role-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
}

.role-badge.owner {
    background: rgba(255, 193, 7, 0.15);
    color: #f57c00;
}

.role-badge.admin {
    background: rgba(103, 126, 234, 0.15);
    color: #667eea;
}

.role-badge.member {
    background: rgba(158, 158, 158, 0.15);
    color: var(--text-secondary);
}

.last-active {
    font-size: 12px;
    color: var(--text-tertiary);
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 768px) {
    .room-card {
        padding: 16px;
    }

    .room-name {
        font-size: 16px;
    }

    .room-meta {
        font-size: 12px;
    }

    .room-description {
        font-size: 13px;
    }
}
</style>

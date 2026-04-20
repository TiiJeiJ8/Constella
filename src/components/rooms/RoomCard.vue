<template>
    <div class="room-card">
        <div class="card-body" @click="handleClick">
            <div class="card-header">
                <div v-if="roomIcon" class="room-icon">{{ roomIcon }}</div>

                <div class="room-info">
                    <h3 class="room-name">{{ room.name || t('rooms.untitled') }}</h3>
                    <div class="room-meta">
                        <span class="creator">{{ room.creator || t('common.unknown') }}</span>
                        <span class="separator">·</span>
                        <span class="member-count">{{ memberCountLabel }}</span>
                    </div>
                </div>

                <div class="privacy-badge" :class="room.isPrivate ? 'private' : 'public'">
                    <svg class="privacy-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <template v-if="room.isPrivate">
                            <path d="M7.5 10V8.25a4.5 4.5 0 0 1 9 0V10" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
                            <rect x="5.5" y="10" width="13" height="9.5" rx="2.25" fill="none" stroke="currentColor" stroke-width="1.8" />
                        </template>
                        <template v-else>
                            <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8" />
                            <path d="M3.8 12h16.4M12 3.5c2.2 2.35 3.3 5.18 3.3 8.5s-1.1 6.15-3.3 8.5M12 3.5C9.8 5.85 8.7 8.68 8.7 12s1.1 6.15 3.3 8.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
                        </template>
                    </svg>
                </div>

                <button class="favorite-btn" :class="{ 'is-favorite': isFavorited }" :title="isFavorited ? t('rooms.unfavorite') : t('rooms.favorite')" @click.stop="toggleFavorite">
                    <svg class="favorite-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21z" :fill="isFavorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                    </svg>
                </button>
            </div>

            <div class="card-content">
                <p class="room-description">{{ room.description || t('rooms.noDescription') }}</p>
            </div>

            <div class="card-footer">
                <div class="tags">
                    <span v-if="room.role" class="role-badge" :class="room.role">{{ roleLabel(room.role) }}</span>
                </div>

                <button v-if="showDeleteButton" class="delete-btn" :title="t('rooms.delete.deleteRoom')" @click.stop="handleDelete">
                    {{ t('rooms.delete.delete') }}
                </button>

                <div class="last-active">
                    <span class="time">{{ formatTime(room.lastActive) }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getFavoriteRooms, toggleFavoriteRoom } from '@/utils/storage'

const { t, locale } = useI18n()

const props = defineProps({
    room: { type: Object, required: true },
    showDelete: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: null }
})

const emit = defineEmits(['click', 'delete', 'favoriteChange'])
const isFavorited = ref(false)

function checkFavoriteStatus() {
    if (typeof props.isFavorite === 'boolean') {
        isFavorited.value = props.isFavorite
        return
    }
    isFavorited.value = getFavoriteRooms().some(fav => fav.roomId === props.room.id)
}

function toggleFavorite() {
    try {
        isFavorited.value = toggleFavoriteRoom(props.room.id)
        emit('favoriteChange', props.room.id, isFavorited.value)
    } catch (error) {
        console.error('Failed to toggle favorite:', error)
    }
}

onMounted(checkFavoriteStatus)
watch(() => props.room?.id, checkFavoriteStatus)
watch(() => props.isFavorite, checkFavoriteStatus)

const roomIcon = computed(() => props.room.settings?.appearance?.icon || null)
const showDeleteButton = computed(() => props.showDelete && props.room.role === 'owner')
const memberCountLabel = computed(() => t(props.room.memberCount === 1 ? 'rooms.memberCount.one' : 'rooms.memberCount.other', { count: props.room.memberCount ?? 0 }))

function roleLabel(role) {
    if (role === 'viewer') {
        return locale.value === 'zh-CN' ? '\u53ea\u8bfb' : 'Viewer'
    }
    if (role === 'editor' || role === 'member') {
        return locale.value === 'zh-CN' ? '\u53ef\u7f16\u8f91' : 'Editor'
    }
    return t(`rooms.roles.${role}`)
}

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
.room-card{position:relative;min-height:180px;background:var(--bg-secondary);border:1px solid var(--border-light);border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);transition:transform .3s cubic-bezier(.4,0,.2,1),box-shadow .3s cubic-bezier(.4,0,.2,1),background-color .3s ease,border-color .3s ease;will-change:transform;backface-visibility:hidden}
.card-body{display:flex;flex-direction:column;min-height:180px;padding:20px;cursor:pointer}
.room-card:hover{transform:translateY(-4px) translateZ(0);box-shadow:0 8px 24px rgba(0,0,0,.12);border-color:var(--accent-primary)}
.room-card:active{transform:translateY(-2px) translateZ(0)}
html[data-theme='dark'] .room-card{background:rgba(40,40,40,.6);box-shadow:0 2px 8px rgba(0,0,0,.3);border-color:rgba(255,255,255,.08)}
html[data-theme='dark'] .room-card:hover{background:rgba(45,45,45,.7);box-shadow:0 8px 24px rgba(0,0,0,.5);border-color:var(--accent-primary)}
.card-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
.room-icon{width:48px;height:48px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:28px;background:linear-gradient(135deg,rgba(103,126,234,.1) 0%,rgba(118,75,162,.1) 100%);transition:transform .3s ease}
.room-card:hover .room-icon{transform:scale(1.1)}
html[data-theme='dark'] .room-icon{background:linear-gradient(135deg,rgba(103,126,234,.15) 0%,rgba(118,75,162,.15) 100%)}
.room-info{flex:1;min-width:0}.room-name{margin:0 0 6px 0;font-size:18px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.room-meta{display:flex;align-items:center;gap:6px;min-width:0;font-size:13px;color:var(--text-secondary)}
.creator{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.separator{opacity:.5;font-weight:600;flex-shrink:0}.member-count{white-space:nowrap;flex-shrink:0}
.privacy-badge{width:32px;height:32px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:16px}
.privacy-badge.private{background:rgba(255,152,0,.1)}.privacy-badge.public{background:rgba(76,175,80,.1)}
html[data-theme='dark'] .privacy-badge.private{background:rgba(255,152,0,.2)}html[data-theme='dark'] .privacy-badge.public{background:rgba(76,175,80,.2)}
.privacy-icon{width:16px;height:16px;display:block}
.favorite-btn{width:32px;height:32px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:16px;background:rgba(255,193,7,.08);border:1px solid rgba(255,193,7,.12);color:rgba(184,138,0,.78);cursor:pointer;transition:all .2s;opacity:.9}
.favorite-btn:hover{opacity:1;transform:scale(1.1);background:rgba(255,193,7,.16);border-color:rgba(255,193,7,.28)}
.favorite-btn.is-favorite{opacity:1;color:#f4b400;background:rgba(255,215,0,.2);border-color:rgba(255,215,0,.32)}
.favorite-icon{width:16px;height:16px;display:block}
html[data-theme='dark'] .favorite-btn{background:rgba(255,215,0,.12);border-color:rgba(255,215,0,.22);color:rgba(255,224,130,.95);box-shadow:0 2px 8px rgba(0,0,0,.18)}
html[data-theme='dark'] .favorite-btn:hover{background:rgba(255,215,0,.2);border-color:rgba(255,215,0,.38);color:#ffe082}
html[data-theme='dark'] .favorite-btn.is-favorite{color:#ffd54f;background:rgba(255,215,0,.24);border-color:rgba(255,215,0,.4);box-shadow:0 4px 12px rgba(255,193,7,.18)}
.card-content{flex:1;margin-bottom:12px}.room-description{margin:0;font-size:14px;line-height:1.5;color:var(--text-secondary);display:-webkit-box;line-clamp:2;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:12px;border-top:1px solid var(--border-light)}
.tags{display:flex;gap:8px}.role-badge{padding:4px 10px;border-radius:12px;font-size:12px;font-weight:500;white-space:nowrap}
.role-badge.owner{background:rgba(255,193,7,.15);color:#f57c00}.role-badge.admin{background:rgba(103,126,234,.15);color:#667eea}.role-badge.member,.role-badge.editor{background:rgba(158,158,158,.15);color:var(--text-secondary)}.role-badge.viewer{background:rgba(107,114,128,.15);color:#4b5563}
html[data-theme='dark'] .role-badge.owner{background:rgba(255,193,7,.25);color:#ffb300}html[data-theme='dark'] .role-badge.admin{background:rgba(103,126,234,.25);color:#8b9bef}html[data-theme='dark'] .role-badge.member,html[data-theme='dark'] .role-badge.editor{background:rgba(158,158,158,.25)}html[data-theme='dark'] .role-badge.viewer{background:rgba(107,114,128,.25);color:#d1d5db}
.delete-btn{display:flex;align-items:center;gap:4px;white-space:nowrap;padding:6px 14px;border:none;border-radius:20px;background:rgba(244,67,54,.1);color:#f44336;font-size:13px;cursor:pointer;transition:all .2s;opacity:0}
.room-card:hover .delete-btn{opacity:1}.delete-btn:hover{background:rgba(244,67,54,.2);transform:scale(1.1)}.delete-btn:active{transform:scale(.95)}
.last-active{font-size:12px;color:var(--text-tertiary)}
@media (max-width:768px){.room-card{padding:16px}.room-name{font-size:16px}.room-meta{font-size:12px}.room-description{font-size:13px}}
</style>



<template>
    <div class="status-bar-wrapper">
        <div class="status-bar" :class="{ 'visible': isVisible }" @mouseenter="show" @mouseleave="hide">
            <!-- 左侧：统计信息 -->
            <div class="status-section">
                <span class="status-item">
                    <span class="status-icon">🔍</span>
                    <span class="status-text">{{ t('canvas.statusBar.zoom') }}: {{ zoom }}%</span>
                </span>
                <span class="status-divider">|</span>
                <span class="status-item">
                    <span class="status-icon">📍</span>
                    <span class="status-text">{{ t('canvas.statusBar.position') }}: ({{ position.x }}, {{ position.y }})</span>
                </span>
                <span v-if="selectedCount > 0" class="status-divider">|</span>
                <span v-if="selectedCount > 0" class="status-item">
                    <span class="status-text">{{ t('canvas.statusBar.selected') }}: {{ selectedCount }}</span>
                </span>
            </div>

            <!-- 中间：聊天功能 -->
            <div class="status-section chat-section">
                <ChatExpandButton :unreadCount="unreadCount" @click="$emit('toggleChat')" />
                <ChatInputBar @send="$emit('sendMessage', $event)" />
            </div>

            <!-- 右侧：连接状态 -->
            <div class="status-section">
                <span class="status-item" :class="connectionStatus">
                    <span class="status-dot"></span>
                    <span class="status-text">{{ connectionText }}</span>
                </span>
            </div>
        </div>
        <!-- 触发区域 -->
        <div class="status-bar-trigger" @mouseenter="show"></div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ChatExpandButton from './ChatExpandButton.vue'
import ChatInputBar from './ChatInputBar.vue'

const { t } = useI18n()

const isVisible = ref(false)
let hideTimer = null

function show() {
    clearTimeout(hideTimer)
    isVisible.value = true
}

function hide() {
    hideTimer = setTimeout(() => {
        isVisible.value = false
    }, 300)
}

const props = defineProps({
    zoom: {
        type: Number,
        default: 100
    },
    position: {
        type: Object,
        default: () => ({ x: 0, y: 0 })
    },
    selectedCount: {
        type: Number,
        default: 0
    },
    isSyncing: {
        type: Boolean,
        default: false
    },
    isOffline: {
        type: Boolean,
        default: false
    },
    unreadCount: {
        type: Number,
        default: 0
    }
})

defineEmits(['toggleChat', 'sendMessage'])

const connectionStatus = computed(() => {
    if (props.isOffline) return 'offline'
    if (props.isSyncing) return 'syncing'
    return 'synced'
})

const connectionText = computed(() => {
    if (props.isOffline) return t('canvas.statusBar.offline')
    if (props.isSyncing) return t('canvas.statusBar.syncing')
    return t('canvas.statusBar.synced')
})
</script>

<style scoped>
.status-bar-wrapper {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 70;
    pointer-events: none;
}

.status-bar {
    position: absolute;
    bottom: 16px;
    left: 16px;
    right: 16px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    background: var(--canvas-statusbar-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    font-size: 12px;
    color: var(--text-secondary);
    box-shadow: var(--shadow-md);
    transform: translateY(calc(100% + 32px));
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: auto;
}

.status-bar:focus-within {
    transform: translateY(0);
    opacity: 1;
}

.status-bar.visible {
    transform: translateY(0);
    opacity: 1;
}

/* 触发区域 */
.status-bar-trigger {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 30px;
    pointer-events: auto;
}

.status-section {
    display: flex;
    align-items: center;
    gap: 12px;
}

.chat-section {
    gap: 8px;
}

.status-item {
    display: flex;
    align-items: center;
    gap: 6px;
}

.status-icon {
    font-size: 14px;
}

.status-text {
    font-weight: 500;
}

.status-divider {
    color: var(--border-color);
    user-select: none;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #67c23a;
    transition: all 0.3s ease;
}

.status-item.syncing .status-dot {
    background: #409eff;
    animation: pulse-dot 1.5s ease-in-out infinite;
}

.status-item.offline .status-dot {
    background: #f56c6c;
}

@keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@media (max-width: 768px) {
    .status-bar {
        padding: 0 12px;
        font-size: 11px;
    }

    .status-icon {
        display: none;
    }

    .status-section:first-child .status-item:last-child {
        display: none;
    }
}
</style>

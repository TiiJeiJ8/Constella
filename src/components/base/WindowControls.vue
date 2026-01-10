<template>
    <div v-if="isElectron">
        <!-- 可拖动标题栏 -->
        <div class="title-bar">
            <div class="drag-region"></div>
        </div>
        
        <!-- 窗口控制按钮 -->
        <div class="window-controls">
            <button class="window-btn minimize-btn" @click="minimizeWindow" :title="t('window.minimize')">
                <MinusIcon />
            </button>
            <button class="window-btn maximize-btn" @click="toggleMaximize" :title="t('window.maximize')">
                <RectangleIcon />
            </button>
            <button class="window-btn close-btn" @click="closeWindow" :title="t('window.close')">
                <CloseIcon />
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    MinusIcon,
    RectangleIcon,
    CloseIcon
} from 'tdesign-icons-vue-next'

const { t } = useI18n()

const isElectron = ref(!!window.electron)

// 窗口控制函数
function minimizeWindow() {
    if (window.electron?.minimize) {
        window.electron.minimize()
    }
}

function toggleMaximize() {
    if (window.electron?.toggleMaximize) {
        window.electron.toggleMaximize()
    }
}

function closeWindow() {
    if (window.electron?.close) {
        window.electron.close()
    }
}
</script>

<style scoped>
/* ==================== 拖动标题栏 ==================== */
.title-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 32px;
    z-index: 1000;
    pointer-events: none;
}

.drag-region {
    width: 100%;
    height: 100%;
    -webkit-app-region: drag;
    pointer-events: auto;
}

/* ==================== 窗口控制按钮 ==================== */
.window-controls {
    position: fixed;
    top: 0;
    right: 0;
    display: flex;
    z-index: 1001;
    -webkit-app-region: no-drag;
}

.window-btn {
    width: 46px;
    height: 32px;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
    color: var(--text-primary);
}

.window-btn svg {
    width: 14px;
    height: 14px;
}

.window-btn:hover {
    background: var(--bg-tertiary);
}

.close-btn:hover {
    background: #e81123;
    color: #fff;
}
</style>

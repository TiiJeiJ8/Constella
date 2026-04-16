<template>
    <Teleport to="body">
        <Transition name="overlay">
            <div v-if="modelValue" class="plugin-overlay" @click="$emit('update:modelValue', false)"></div>
        </Transition>

        <Transition name="slide-up">
            <div v-if="modelValue" class="plugin-panel">
                <div class="plugin-panel-header">
                    <div>
                        <div class="plugin-panel-eyebrow">Constella</div>
                        <h2 class="plugin-panel-title">{{ title }}</h2>
                    </div>
                    <button
                        class="plugin-panel-close"
                        :aria-label="closeLabel"
                        :title="closeLabel"
                        @click="$emit('update:modelValue', false)"
                    >
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>

                <div class="plugin-panel-body">
                    <PluginCatalogPane />
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PluginCatalogPane from './PluginCatalogPane.vue'

defineProps({
    modelValue: {
        type: Boolean,
        default: false
    }
})

defineEmits(['update:modelValue'])

const { locale } = useI18n()

const title = computed(() => locale.value === 'zh-CN' ? '插件面板' : 'Plugin Panel')
const closeLabel = computed(() => locale.value === 'zh-CN' ? '关闭插件面板' : 'Close plugin panel')
</script>

<style scoped>
.plugin-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.28);
    backdrop-filter: blur(4px);
    z-index: 2100;
}

.plugin-panel {
    position: fixed;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    width: min(1080px, calc(100vw - 32px));
    max-height: calc(100vh - 48px);
    border-radius: 28px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    box-shadow: 0 28px 80px rgba(15, 23, 42, 0.22);
    z-index: 2101;
    overflow: hidden;
}

.plugin-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 24px 18px;
    border-bottom: 1px solid var(--border-color);
}

.plugin-panel-eyebrow {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--text-secondary);
}

.plugin-panel-title {
    margin: 6px 0 0;
    font-size: 1.25rem;
    color: var(--text-primary);
}

.plugin-panel-close {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    transition: transform 0.22s ease, background-color 0.22s ease;
}

.plugin-panel-close:hover {
    transform: translateY(-1px);
}

.plugin-panel-body {
    padding: 22px 24px 24px;
    overflow: auto;
    max-height: calc(100vh - 140px);
}

.overlay-enter-active,
.overlay-leave-active,
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.24s ease;
}

.overlay-enter-from,
.overlay-leave-to {
    opacity: 0;
}

.slide-up-enter-from,
.slide-up-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(16px);
}
</style>


<template>
    <div class="blank-renderer" :style="containerStyle">
        <div class="blank-placeholder">
            <span class="icon">+</span>
            <span class="hint">{{ t('canvas.node.defaultContent') }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NodeContent } from '../index'

const { t } = useI18n()

const props = defineProps<{
    content: NodeContent
    width: number
    height: number
}>()

const containerStyle = computed(() => ({
    width: `${props.width}px`,
    height: `${props.height}px`
}))
</script>

<style scoped>
.blank-renderer {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 2px dashed rgba(255, 255, 255, 0.2);
    border-radius: 4px;
}

.blank-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: rgba(255, 255, 255, 0.4);
    user-select: none;
}

.icon {
    font-size: 24px;
    font-weight: 300;
}

.hint {
    font-size: 11px;
}
</style>

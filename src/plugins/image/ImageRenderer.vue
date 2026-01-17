<template>
    <div class="image-renderer" :class="displayMode">
        <img 
            v-if="imageSrc"
            :src="imageSrc" 
            :alt="altText"
            @load="handleLoad"
            @error="handleError"
        />
        <div v-else-if="loading" class="loading-state">
            <span class="loading-icon">⏳</span>
        </div>
        <div v-else-if="error" class="error-state">
            <span class="error-icon">🖼️</span>
            <span class="error-text">图片加载失败</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RendererProps } from '../index'
import { apiService } from '../../services/api'

const props = defineProps<RendererProps>()

const loading = ref(true)
const error = ref(false)

// 处理 constella:// 协议为后端地址，动态获取 baseUrl
function resolveConstellaUrl(url: string): string {
    const backendPrefix = apiService.getBaseUrl();
    if (url?.startsWith("constella://")) {
        return backendPrefix + url.replace("constella://", "/");
    }
    return url;
}

const imageSrc = computed(() => {
    return resolveConstellaUrl(props.content?.data || '');
})

// 替代文本
const altText = computed(() => {
    const metadata = (props.content as any)?.metadata
    return metadata?.name || 'Image'
})

// 显示模式
const displayMode = computed(() => {
    return props.displayMode || 'full'
})

// 图片加载成功
function handleLoad() {
    loading.value = false
    error.value = false
}

// 图片加载失败
function handleError() {
    loading.value = false
    error.value = true
}

// 监听 src 变化重置状态
watch(imageSrc, () => {
    loading.value = true
    error.value = false
})
</script>

<style scoped>
.image-renderer {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 4px;
}

.image-renderer img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.image-renderer.card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.loading-state,
.error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--text-tertiary);
}

.loading-icon,
.error-icon {
    font-size: 32px;
    opacity: 0.5;
}

.error-text {
    font-size: 12px;
}

/* 深色主题适配 */
html[data-theme='dark'] .image-renderer {
    background: rgba(255, 255, 255, 0.02);
}
</style>

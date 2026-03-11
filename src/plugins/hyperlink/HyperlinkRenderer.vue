<template>
    <div class="hyperlink-renderer" :class="displayMode">
        <!-- Card 模式：紧凑 -->
        <div v-if="displayMode === 'card'" class="card-view">
            <img
                class="favicon"
                :src="faviconUrl"
                @error="onFaviconError"
                alt=""
            />
            <div class="card-text">
                <span class="card-title">{{ displayTitle }}</span>
                <span class="card-domain">{{ domain }}</span>
            </div>
        </div>

        <!-- Full 模式：完整卡片 -->
        <div v-else class="full-view">
            <div class="link-header">
                <img
                    class="favicon-large"
                    :src="faviconUrl"
                    @error="onFaviconError"
                    alt=""
                />
                <div class="link-info">
                    <span class="link-title">{{ displayTitle }}</span>
                    <span class="link-domain">{{ domain }}</span>
                </div>
                <span class="link-icon">↗</span>
            </div>
            <div class="link-url">{{ url }}</div>
        </div>

        <!-- 无 URL 时的占位 -->
        <div v-if="!url" class="empty-state">
            <span class="empty-icon">🔗</span>
            <span class="empty-hint">{{ t('plugins.hyperlink.renderer.emptyHint') }}</span>
        </div>
    </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
    content: { type: Object, required: true },
    width:   { type: Number, default: 200 },
    height:  { type: Number, default: 120 },
    displayMode: { type: String, default: 'full' }
})

const { t } = useI18n()

const url = computed(() => props.content?.data || '')
const title = computed(() => props.content?.metadata?.title || '')

// 提取域名
const domain = computed(() => {
    if (!url.value) return ''
    try {
        return new URL(url.value).hostname.replace(/^www\./, '')
    } catch {
        return url.value
    }
})

// 显示标题：优先用户设置的，否则用域名
const displayTitle = computed(() => title.value || domain.value || t('plugins.hyperlink.renderer.defaultTitle'))

// Favicon：Google Favicon Service（需要网络）
const faviconSrc = ref('')
const FALLBACK = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text y="20" font-size="20">🌐</text></svg>'

const faviconUrl = computed(() => {
    if (!url.value) return FALLBACK
    try {
        const { protocol, hostname } = new URL(url.value)
        // 先用直接路径，@error 回退到 Google
        return faviconSrc.value || `${protocol}//${hostname}/favicon.ico`
    } catch {
        return FALLBACK
    }
})

// 图标加载失败 → 尝试 Google Favicon API → 最终回退 emoji
let errorCount = 0
function onFaviconError(e) {
    errorCount++
    if (errorCount === 1 && url.value) {
        // 第一次失败：用 Google Favicon API
        const encoded = encodeURIComponent(url.value)
        e.target.src = `https://www.google.com/s2/favicons?domain_url=${encoded}&sz=64`
    } else {
        // 第二次失败：用内联 SVG emoji
        e.target.src = FALLBACK
    }
}
</script>

<style scoped>
.hyperlink-renderer {
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    justify-content: center;
    padding: 10px 12px;
    box-sizing: border-box;
    overflow: hidden;
}

/* Card 模式 */
.card-view {
    display: flex; align-items: center; gap: 8px;
}
.favicon { width: 20px; height: 20px; border-radius: 4px; flex-shrink: 0; object-fit: contain; }
.card-text { display: flex; flex-direction: column; overflow: hidden; }
.card-title {
    font-size: 13px; font-weight: 600; color: white;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.card-domain {
    font-size: 11px; color: rgba(255,255,255,0.6);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Full 模式 */
.full-view { display: flex; flex-direction: column; gap: 6px; }
.link-header { display: flex; align-items: center; gap: 10px; }
.favicon-large { width: 32px; height: 32px; border-radius: 6px; object-fit: contain; flex-shrink: 0; }
.link-info { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.link-title {
    font-size: 14px; font-weight: 600; color: white;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.link-domain { font-size: 12px; color: rgba(255,255,255,0.6); }
.link-icon { font-size: 16px; color: rgba(255,255,255,0.5); flex-shrink: 0; }
.link-url {
    font-size: 11px; color: rgba(255,255,255,0.4);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    padding: 4px 6px;
    background: rgba(0,0,0,0.2);
    border-radius: 4px;
}

/* 空状态 */
.empty-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 6px; color: rgba(255,255,255,0.4);
}
.empty-icon { font-size: 28px; }
.empty-hint { font-size: 12px; }
</style>
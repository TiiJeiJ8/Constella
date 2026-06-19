<template>
    <div
        class="hyperlink-renderer"
        :class="{
            compact: isCompact,
            empty: !hasUrl,
            invalid: hasUrl && !parsedUrl,
            secure: isSecure
        }"
    >
        <div v-if="hasUrl" class="link-card">
            <div class="link-main">
                <div class="site-mark" aria-hidden="true">
                    <img
                        v-if="faviconUrl"
                        class="favicon"
                        :src="faviconUrl"
                        alt=""
                        @error="handleFaviconError"
                    />
                    <LinkIcon v-else />
                </div>

                <div class="link-copy">
                    <div class="title-row">
                        <span class="link-title">{{ displayTitle }}</span>
                        <span v-if="!isCompact" class="scheme-pill">{{ protocolLabel }}</span>
                    </div>
                    <div class="link-meta">
                        <span class="link-domain">{{ domainLabel }}</span>
                    </div>
                </div>

                <JumpIcon v-if="!isCompact" class="open-mark" aria-hidden="true" />
            </div>

            <div v-if="!isCompact" class="link-url">{{ shortUrl }}</div>
        </div>

        <div v-else class="empty-state">
            <div class="site-mark empty-mark" aria-hidden="true">
                <LinkIcon />
            </div>
            <div class="empty-copy">
                <span class="empty-title">{{ t('plugins.hyperlink.renderer.defaultTitle') }}</span>
                <span class="empty-hint">{{ t('plugins.hyperlink.renderer.emptyHint') }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { JumpIcon, LinkIcon } from 'tdesign-icons-vue-next'
import type { DisplayMode, NodeContent } from '../index'

const props = withDefaults(defineProps<{
    content: NodeContent
    width?: number
    height?: number
    displayMode?: DisplayMode
}>(), {
    width: 200,
    height: 120,
    displayMode: 'full'
})

const { t } = useI18n()

const faviconFailed = ref(false)
const rawUrl = computed(() => (props.content?.data || '').trim())
const customTitle = computed(() => {
    const value = props.content?.metadata?.title
    return typeof value === 'string' ? value.trim() : ''
})

const hasUrl = computed(() => rawUrl.value.length > 0)
const parsedUrl = computed(() => parseUrl(rawUrl.value))
const isCompact = computed(() => props.displayMode === 'card' || props.width < 220 || props.height < 105)
const isSecure = computed(() => parsedUrl.value?.protocol === 'https:')

const faviconUrl = computed(() => {
    const parsed = parsedUrl.value
    if (faviconFailed.value || !parsed || !['http:', 'https:'].includes(parsed.protocol)) return ''
    return `${parsed.origin}/favicon.ico`
})

const domainLabel = computed(() => {
    const parsed = parsedUrl.value
    if (!parsed) return rawUrl.value
    return parsed.hostname.replace(/^www\./i, '')
})

const displayTitle = computed(() => {
    return customTitle.value || domainLabel.value || t('plugins.hyperlink.renderer.defaultTitle')
})

const protocolLabel = computed(() => {
    const protocol = parsedUrl.value?.protocol.replace(':', '')
    return protocol || 'url'
})

const shortUrl = computed(() => {
    const parsed = parsedUrl.value
    if (!parsed) return rawUrl.value

    const host = parsed.hostname.replace(/^www\./i, '')
    const path = parsed.pathname === '/' ? '' : parsed.pathname
    return `${host}${path}${parsed.search}${parsed.hash}`
})

watch(rawUrl, () => {
    faviconFailed.value = false
})

function parseUrl(value: string) {
    if (!value) return null

    try {
        return new URL(value)
    } catch {
        // Be tolerant for pasted domains while keeping the stored value unchanged.
        if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(value)) {
            try {
                return new URL(`https://${value}`)
            } catch {
                return null
            }
        }
        return null
    }
}

function handleFaviconError() {
    faviconFailed.value = true
}
</script>

<style scoped>
.hyperlink-renderer {
    --link-surface-soft: color-mix(in srgb, var(--bg-primary, #ffffff) 72%, var(--color-primary, #667eea) 6%);
    --link-border: color-mix(in srgb, var(--border-color, #dcdfe6) 78%, var(--color-primary, #667eea));
    --link-text: var(--text-primary, #2c3e50);
    --link-muted: var(--text-secondary, #606266);
    --link-faint: var(--text-tertiary, #909399);
    --link-accent: var(--accent-primary, #409eff);
    --link-accent-soft: color-mix(in srgb, var(--accent-primary, #409eff) 14%, transparent);
    --link-url-bg: color-mix(in srgb, var(--bg-tertiary, #ebeef5) 62%, transparent);
    width: 100%;
    height: 100%;
    min-width: 0;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    padding: 10px 12px;
    box-sizing: border-box;
    overflow: hidden;
    color: var(--link-text);
}

.link-card,
.empty-state {
    width: 100%;
    height: 100%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
}

.hyperlink-renderer:hover .link-card,
.hyperlink-renderer:hover .empty-state {
    color: var(--link-text);
}

.link-main {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

.site-mark {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid color-mix(in srgb, var(--link-accent) 20%, var(--link-border));
    border-radius: 8px;
    background: var(--link-surface-soft);
    color: var(--link-accent);
    overflow: hidden;
}

.site-mark svg {
    width: 18px;
    height: 18px;
}

.favicon {
    width: 22px;
    height: 22px;
    object-fit: contain;
}

.link-copy,
.empty-copy {
    min-width: 0;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.title-row {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

.link-title,
.empty-title {
    min-width: 0;
    color: var(--link-text);
    font-size: 14px;
    font-weight: 760;
    letter-spacing: 0;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.scheme-pill {
    flex: 0 0 auto;
    max-width: 58px;
    padding: 2px 6px;
    border-radius: 999px;
    background: var(--link-accent-soft);
    color: var(--link-accent);
    font-size: 10px;
    font-weight: 760;
    line-height: 1.2;
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.link-meta {
    min-width: 0;
    display: flex;
    align-items: center;
}

.link-domain,
.empty-hint {
    min-width: 0;
    color: var(--link-muted);
    font-size: 12px;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.open-mark {
    width: 17px;
    height: 17px;
    flex: 0 0 auto;
    color: var(--link-faint);
}

.link-url {
    min-width: 0;
    padding: 5px 8px;
    border: 1px solid color-mix(in srgb, var(--link-border) 72%, transparent);
    border-radius: 6px;
    background: var(--link-url-bg);
    color: var(--link-faint);
    font-family: "Cascadia Mono", Consolas, "SFMono-Regular", Menlo, monospace;
    font-size: 11px;
    font-weight: 400;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.empty-state {
    flex-direction: row;
    align-items: center;
}

.empty-mark {
    background: var(--link-accent-soft);
}

.hyperlink-renderer.compact .link-card {
    gap: 0;
    padding: 0;
}

.hyperlink-renderer.compact .site-mark {
    width: 30px;
    height: 30px;
    flex-basis: 30px;
    border-radius: 7px;
}

.hyperlink-renderer.compact .favicon {
    width: 18px;
    height: 18px;
}

.hyperlink-renderer.compact .link-title {
    font-size: 13px;
}

.hyperlink-renderer.compact .link-domain {
    font-size: 11px;
}

.hyperlink-renderer.invalid .site-mark {
    color: var(--dialog-danger, #ef4444);
    border-color: color-mix(in srgb, var(--dialog-danger, #ef4444) 32%, var(--link-border));
}

html[data-theme='dark'] .hyperlink-renderer {
    --link-surface-soft: rgba(255, 255, 255, 0.05);
    --link-border: rgba(255, 255, 255, 0.12);
    --link-text: var(--text-primary, #e4e7ed);
    --link-muted: var(--text-secondary, #c0c4cc);
    --link-faint: var(--text-tertiary, #909399);
    --link-accent: var(--accent-primary, #409eff);
    --link-accent-soft: rgba(64, 158, 255, 0.14);
    --link-url-bg: rgba(255, 255, 255, 0.05);
}
</style>

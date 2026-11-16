<template>
    <div class="about-view">
        <WindowControls />

        <button class="back-btn" :class="{ 'no-electron': !isElectron }" :title="t('about.backToHome')" @click="goBack">
            <ChevronLeftIcon />
            <span>{{ t('about.backToHome') }}</span>
        </button>

        <main class="main-content">
            <Transition name="fade-slide" mode="out-in">
                <div :key="currentLocale" class="content-wrapper">
                    <div class="header-section">
                        <div class="title-icon-row" aria-hidden="true">
                            <span>✨</span>
                            <span>Constella</span>
                            <span>🌌</span>
                        </div>
                        <h1 class="title" style="user-select: none;">{{ t('about.title') }}</h1>
                        <p class="subtitle" style="user-select: none;">{{ t('about.subtitle') }}</p>
                        <p class="version" style="user-select: none;">{{ t('about.version') }}: {{ appVersion }}</p>
                    </div>

                    <div class="description-section">
                        <p class="description">{{ t('about.description') }}</p>
                    </div>

                    <div class="features-section">
                        <h2 class="section-title"><span aria-hidden="true">🧩</span>{{ t('about.features.title') }}</h2>
                        <div class="features-grid">
                            <div v-for="feature in featureItems" :key="feature.title" class="feature-item">
                                <span class="feature-icon" :class="`feature-${feature.iconKey}`" aria-hidden="true">
                                    {{ feature.emoji }}
                                </span>
                                <div class="feature-content">
                                    <span class="feature-text">{{ feature.title }}</span>
                                    <span class="feature-desc">{{ feature.desc }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tech-section">
                        <h2 class="section-title"><span aria-hidden="true">⚙️</span>{{ t('about.tech.title') }}</h2>
                        <div class="tech-list">
                            <p class="tech-item">🎨 {{ t('about.tech.frontend') }}</p>
                            <p class="tech-item">🖥️ {{ t('about.tech.backend') }}</p>
                            <p class="tech-item">🔄 {{ t('about.tech.realtime') }}</p>
                        </div>
                    </div>

                    <div class="authors-section">
                        <h2 class="section-title"><span aria-hidden="true">👥</span>{{ t('about.authors.title') }}</h2>
                        <div class="authors-container">
                            <button class="author-item" @click="openAuthorGithub('TiiJeiJ8')">
                                <div class="author-avatar">
                                    <img src="../assets/IMG/Author_TiiJeiJ8.jpg" :alt="t('about.authors.author1')" />
                                </div>
                                <span class="author-name">{{ t('about.authors.author1') }}</span>
                            </button>
                            <span class="author-separator" aria-hidden="true">×</span>
                            <button class="author-item" @click="openAuthorGithub('fkj577')">
                                <div class="author-avatar">
                                    <img src="../assets/IMG/Author_fkj577.jpg" :alt="t('about.authors.author2')" />
                                </div>
                                <span class="author-name">{{ t('about.authors.author2') }}</span>
                            </button>
                        </div>
                    </div>

                    <div class="licenses-section">
                        <h2 class="section-title"><span aria-hidden="true">📜</span>{{ t('about.licenses.title') }}</h2>
                        <p class="licenses-intro">{{ t('about.licenses.intro') }}</p>
                        <div class="license-list">
                            <article v-for="item in licenseItems" :key="item.name" class="license-card">
                                <div class="license-card-header">
                                    <span class="license-mark" aria-hidden="true">{{ item.mark }}</span>
                                    <div>
                                        <h3 class="license-name">{{ item.name }}</h3>
                                        <p class="license-type">{{ item.license }}</p>
                                    </div>
                                </div>
                                <p class="license-desc">{{ item.description }}</p>
                                <p class="license-meta">{{ item.meta }}</p>
                            </article>
                        </div>
                    </div>

                    <div class="links-section">
                        <button class="link-btn" @click="openGithub">
                            <LogoGithubIcon />
                            <span>{{ t('about.links.github') }}</span>
                        </button>
                    </div>
                </div>
            </Transition>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeftIcon, LogoGithubIcon } from 'tdesign-icons-vue-next'
import WindowControls from '@/components/base/WindowControls.vue'

interface FeatureItem {
    iconKey: 'canvas' | 'collab' | 'permissions' | 'network' | 'assets' | 'plugins'
    emoji: string
    title: string
    desc: string
}

interface LicenseItem {
    mark: string
    name: string
    license: string
    description: string
    meta: string
}

const { t, locale } = useI18n()
const emit = defineEmits(['navigate'])
const appVersion = __APP_VERSION__

const isElectron = ref(!!(window as Window & { electron?: unknown }).electron)
const currentLocale = computed(() => locale.value)

const featureItems = computed<FeatureItem[]>(() =>
    locale.value === 'zh-CN'
        ? [
              { iconKey: 'canvas', emoji: '🧠', title: '结构化画布编辑', desc: '用节点与连线组织想法和内容。' },
              { iconKey: 'collab', emoji: '🤝', title: '多人实时协作', desc: '基于 Yjs 的实时同步机制。' },
              { iconKey: 'permissions', emoji: '🔐', title: '房间权限控制', desc: '清晰区分成员角色与协作边界。' },
              { iconKey: 'network', emoji: '📡', title: '局域网服务发现', desc: '自动发现附近可连接的服务端。' },
              { iconKey: 'assets', emoji: '🗂️', title: '资源与快照工作流', desc: '方便迭代、恢复与回滚。' },
              { iconKey: 'plugins', emoji: '🧩', title: '插件扩展与导出', desc: '支持节点扩展和多格式导出。' }
          ]
        : [
              { iconKey: 'canvas', emoji: '🧠', title: 'Structured canvas editing', desc: 'Organize ideas with nodes and edges.' },
              { iconKey: 'collab', emoji: '🤝', title: 'Real-time collaboration', desc: 'Powered by Yjs synchronization.' },
              { iconKey: 'permissions', emoji: '🔐', title: 'Room permissions', desc: 'Clear roles and collaboration boundaries.' },
              { iconKey: 'network', emoji: '📡', title: 'LAN discovery', desc: 'Find nearby servers automatically.' },
              { iconKey: 'assets', emoji: '🗂️', title: 'Assets and snapshots', desc: 'Iterate, restore, and roll back safely.' },
              { iconKey: 'plugins', emoji: '🧩', title: 'Plugins and export', desc: 'Extend nodes and export in multiple formats.' }
          ]
)

const licenseItems = computed<LicenseItem[]>(() => [
    {
        mark: 'C',
        name: 'Constella',
        license: t('about.licenses.constella.license'),
        description: t('about.licenses.constella.description'),
        meta: t('about.licenses.constella.meta')
    },
    {
        mark: 'M',
        name: 'MarkText / Muya',
        license: t('about.licenses.muya.license'),
        description: t('about.licenses.muya.description'),
        meta: t('about.licenses.muya.meta')
    }
])

function goBack() {
    emit('navigate', 'home')
}

function openGithub() {
    const url = 'https://github.com/TiiJeiJ8/constella'
    const electron = (window as Window & { electron?: { openExternal?: (u: string) => void } }).electron
    if (electron?.openExternal) {
        electron.openExternal(url)
    } else {
        window.open(url, '_blank')
    }
}

function openAuthorGithub(username: string) {
    const url = `https://github.com/${username}`
    const electron = (window as Window & { electron?: { openExternal?: (u: string) => void } }).electron
    if (electron?.openExternal) {
        electron.openExternal(url)
    } else {
        window.open(url, '_blank')
    }
}
</script>

<style scoped src="./AboutView.css"></style>

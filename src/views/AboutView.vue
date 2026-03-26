<template>
    <div class="about-view">
        <WindowControls />

        <button class="back-btn" :class="{ 'no-electron': !isElectron }" @click="goBack" :title="t('about.backToHome')">
            <ChevronLeftIcon />
            <span>{{ t('about.backToHome') }}</span>
        </button>

        <main class="main-content">
            <Transition name="fade-slide" mode="out-in">
                <div :key="currentLocale" class="content-wrapper">
                    <div class="header-section">
                        <h1 class="title" style="user-select: none;">{{ t('about.title') }}</h1>
                        <p class="subtitle" style="user-select: none;">{{ t('about.subtitle') }}</p>
                        <p class="version" style="user-select: none;">{{ t('about.version') }}: 1.0.0</p>
                    </div>

                    <div class="description-section">
                        <p class="description">{{ t('about.description') }}</p>
                    </div>

                    <div class="features-section">
                        <h2 class="section-title">{{ t('about.features.title') }}</h2>
                        <div class="features-grid">
                            <div v-for="feature in featureItems" :key="feature.title" class="feature-item">
                                <span class="feature-icon">{{ feature.icon }}</span>
                                <div class="feature-content">
                                    <span class="feature-text">{{ feature.title }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tech-section">
                        <h2 class="section-title">{{ t('about.tech.title') }}</h2>
                        <div class="tech-list">
                            <p class="tech-item">{{ t('about.tech.frontend') }}</p>
                            <p class="tech-item">{{ t('about.tech.backend') }}</p>
                            <p class="tech-item">{{ t('about.tech.realtime') }}</p>
                        </div>
                    </div>

                    <div class="authors-section">
                        <h2 class="section-title">{{ t('about.authors.title') }}</h2>
                        <div class="authors-container">
                            <button class="author-item" @click="openAuthorGithub('TiiJeiJ8')">
                                <div class="author-avatar">
                                    <img src="../assets/IMG/Author_TiiJeiJ8.jpg" :alt="t('about.authors.author1')" />
                                </div>
                                <span class="author-name">{{ t('about.authors.author1') }}</span>
                            </button>
                            <span class="author-separator">✦</span>
                            <button class="author-item" @click="openAuthorGithub('fkj577')">
                                <div class="author-avatar">
                                    <img src="../assets/IMG/Author_fkj577.jpg" :alt="t('about.authors.author2')" />
                                </div>
                                <span class="author-name">{{ t('about.authors.author2') }}</span>
                            </button>
                        </div>
                    </div>

                    <div class="links-section">
                        <button class="link-btn" @click="openGithub">
                            <LogoGithubIcon />
                            <span>{{ t('about.links.github') }}</span>
                        </button>
                        <div class="license-text">{{ t('about.links.license') }}</div>
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
    icon: string
    title: string
    desc: string
}

const { t, locale } = useI18n()
const emit = defineEmits(['navigate'])

const isElectron = ref(!!(window as Window & { electron?: unknown }).electron)
const currentLocale = computed(() => locale.value)

const featureItems = computed<FeatureItem[]>(() =>
    locale.value === 'zh-CN'
        ? [
              { icon: '🧭', title: '结构化画布编辑', desc: '通过节点与连线组织想法，支持缩放、拖拽与关系表达。' },
              { icon: '🤝', title: '多人实时协作', desc: '基于 Yjs 的协同同步机制，支持多人同时编辑。' },
              { icon: '🔐', title: '房间与权限控制', desc: '支持公开/私有房间、成员角色与协作边界管理。' },
              { icon: '🌐', title: '局域网服务发现', desc: '自动发现可用服务器，也支持手动输入地址连接。' },
              { icon: '🗂️', title: '资源与快照工作流', desc: '支持资源上传管理与快照恢复，便于迭代与回滚。' },
              { icon: '🧩', title: '插件扩展与导出能力', desc: '支持多类节点扩展，提供 JSON/PNG/SVG 等导出方式。' },
          ]
        : [
              { icon: '🧭', title: 'Structured canvas editing', desc: 'Organize ideas with nodes and edges, including zoom, drag, and relation mapping.' },
              { icon: '🤝', title: 'Real-time multi-user collaboration', desc: 'Built on Yjs synchronization so multiple users can edit at the same time.' },
              { icon: '🔐', title: 'Room and permission control', desc: 'Public/private rooms, member roles, and clear collaboration boundaries.' },
              { icon: '🌐', title: 'LAN server discovery', desc: 'Auto-discover nearby servers with manual URL connection as fallback.' },
              { icon: '🗂️', title: 'Assets and snapshots workflow', desc: 'Manage uploaded assets and restore snapshots during iterative work.' },
              { icon: '🧩', title: 'Plugin extensibility and export support', desc: 'Extensible node system with export options like JSON, PNG, and SVG.' },
          ]
)

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

<style scoped>
.about-view {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
}

.back-btn {
    position: fixed;
    top: 40px;
    left: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
    z-index: 1000;
    -webkit-app-region: no-drag;
    color: var(--text-primary);
    font-size: 0.9rem;
    font-weight: 500;
}

.back-btn.no-electron {
    top: 12px;
}

.back-btn:hover {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    color: #fff;
    transform: translateX(-2px);
}

.back-btn svg {
    width: 18px;
    height: 18px;
}

.main-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 40px 40px;
    overflow-y: auto;
}

.content-wrapper {
    max-width: 800px;
    width: 100%;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.3s ease;
}

.fade-slide-enter-from {
    opacity: 0;
    transform: translateY(-10px);
}

.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(10px);
}

.header-section {
    text-align: center;
    margin-bottom: 48px;
}

.title {
    font-size: 3.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 12px;
    letter-spacing: -0.02em;
}

.subtitle {
    font-size: 1.25rem;
    color: var(--text-secondary);
    font-weight: 400;
    margin-bottom: 8px;
}

.version {
    font-size: 0.9rem;
    color: var(--text-tertiary);
    font-weight: 500;
}

.description-section {
    margin-bottom: 48px;
}

.description {
    font-size: 1rem;
    line-height: 1.6;
    color: var(--text-secondary);
    text-align: center;
}

.features-section {
    margin-bottom: 48px;
}

.section-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 24px;
    text-align: center;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
}

.feature-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: 12px;
    transition: all 0.3s ease;
}

.feature-item:hover {
    background: var(--bg-tertiary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.feature-icon {
    font-size: 1.5rem;
}

.feature-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.feature-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-weight: 600;
}

.tech-section {
    margin-bottom: 48px;
}

.tech-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.tech-item {
    padding: 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-light);
    border-radius: 12px;
    font-size: 0.95rem;
    color: var(--text-secondary);
    font-weight: 500;
}

.authors-section {
    margin-bottom: 48px;
}

.authors-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 32px;
}

.author-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: var(--bg-secondary);
    border: 2px solid var(--border-light);
    border-radius: 16px;
    transition: all 0.3s ease;
    cursor: pointer;
}

.author-item:hover {
    background: var(--bg-tertiary);
    border-color: var(--accent-primary);
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
}

.author-avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid var(--accent-primary);
    transition: all 0.3s ease;
}

.author-item:hover .author-avatar {
    border-color: var(--accent-hover);
    transform: scale(1.05);
}

.author-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.author-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
}

.author-separator {
    font-size: 1.5rem;
    color: var(--text-tertiary);
    user-select: none;
}

.links-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.link-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 28px;
    background: var(--accent-primary);
    border-radius: 12px;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    transition: all 0.3s ease;
}

.link-btn:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
}

.link-btn svg {
    width: 20px;
    height: 20px;
}

.license-text {
    font-size: 0.85rem;
    color: var(--text-tertiary);
    font-weight: 500;
}

@media (max-width: 768px) {
    .main-content {
        padding: 60px 20px 40px;
    }

    .title {
        font-size: 2.5rem;
    }

    .subtitle {
        font-size: 1rem;
    }

    .features-grid {
        grid-template-columns: 1fr;
    }

    .back-btn {
        top: 40px;
        left: 12px;
        padding: 8px 16px;
        font-size: 0.85rem;
    }
}
</style>

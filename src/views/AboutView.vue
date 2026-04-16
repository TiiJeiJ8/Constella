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
    iconKey: 'canvas' | 'collab' | 'permissions' | 'network' | 'assets' | 'plugins'
    emoji: string
    title: string
    desc: string
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
    max-width: 840px;
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

.title-icon-row {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px;
    margin-bottom: 14px;
    border-radius: 999px;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: 0.86rem;
    font-weight: 700;
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

.description-section,
.features-section,
.tech-section,
.authors-section {
    margin-bottom: 48px;
}

.description {
    font-size: 1rem;
    line-height: 1.6;
    color: var(--text-secondary);
    text-align: center;
}

.section-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 24px;
    text-align: center;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 1.25rem;
}

.feature-canvas { background: rgba(59, 130, 246, 0.12); }
.feature-collab { background: rgba(16, 185, 129, 0.12); }
.feature-permissions { background: rgba(245, 158, 11, 0.14); }
.feature-network { background: rgba(99, 102, 241, 0.12); }
.feature-assets { background: rgba(236, 72, 153, 0.12); }
.feature-plugins { background: rgba(139, 92, 246, 0.12); }

.feature-content {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.feature-text {
    font-size: 0.92rem;
    color: var(--text-primary);
    font-weight: 700;
}

.feature-desc {
    color: var(--text-secondary);
    font-size: 0.82rem;
    line-height: 1.5;
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
    font-size: 1.4rem;
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

    .authors-container {
        gap: 18px;
    }

    .back-btn {
        top: 40px;
        left: 12px;
        padding: 8px 16px;
        font-size: 0.85rem;
    }
}
</style>

<template>
    <div class="about-view">
        <!-- 窗口控制组件 -->
        <WindowControls />

        <!-- 返回按钮 -->
        <button class="back-btn" :class="{ 'no-electron': !isElectron }" @click="goBack" :title="t('about.backToHome')">
            <ChevronLeftIcon />
            <span>{{ t('about.backToHome') }}</span>
        </button>

        <!-- 主内容 -->
        <main class="main-content">
            <Transition name="fade-slide" mode="out-in">
                <div :key="currentLocale" class="content-wrapper">
                    <!-- 标题区 -->
                    <div class="header-section">
                        <h1 class="title" style="user-select: none;">{{ t('about.title') }}</h1>
                        <p class="subtitle" style="user-select: none;">{{ t('about.subtitle') }}</p>
                        <p class="version" style="user-select: none;">{{ t('about.version') }}: 0.1.0</p>
                    </div>

                    <!-- 描述区 -->
                    <div class="description-section">
                        <p class="description">{{ t('about.description') }}</p>
                    </div>

                    <!-- 功能特色区 -->
                    <div class="features-section">
                        <h2 class="section-title">{{ t('about.features.title') }}</h2>
                        <div class="features-grid">
                            <div class="feature-item">
                                <span class="feature-icon">🖥️</span>
                                <span class="feature-text">{{ t('about.features.crossPlatform') }}</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">🎨</span>
                                <span class="feature-text">{{ t('about.features.infiniteCanvas') }}</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">🔄</span>
                                <span class="feature-text">{{ t('about.features.realtime') }}</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">💾</span>
                                <span class="feature-text">{{ t('about.features.offline') }}</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">🔐</span>
                                <span class="feature-text">{{ t('about.features.secure') }}</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">🚀</span>
                                <span class="feature-text">{{ t('about.features.easyDeploy') }}</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">📒</span>
                                <span class="feature-text">{{ t('about.features.cardDesign') }}</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">🪡</span>
                                <span class="feature-text">{{ t('about.features.mindMap') }}</span>
                            </div>
                            <div class="feature-item">
                                <span class="feature-icon">📼</span>
                                <span class="feature-text">{{ t('about.features.mediaSupport') }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- 技术栈区 -->
                    <div class="tech-section">
                        <h2 class="section-title">{{ t('about.tech.title') }}</h2>
                        <div class="tech-list">
                            <p class="tech-item">{{ t('about.tech.frontend') }}</p>
                            <p class="tech-item">{{ t('about.tech.backend') }}</p>
                            <p class="tech-item">{{ t('about.tech.realtime') }}</p>
                        </div>
                    </div>

                    <!-- 链接区 -->
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

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    ChevronLeftIcon,
    LogoGithubIcon
} from 'tdesign-icons-vue-next'
import WindowControls from '@/components/base/WindowControls.vue'

const { t, locale } = useI18n()
const emit = defineEmits(['navigate'])

const isElectron = ref(!!window.electron)
const currentLocale = computed(() => locale.value)

function goBack() {
    emit('navigate', 'home')
}

function openGithub() {
    const url = 'https://github.com/TiiJeiJ8/constella'
    if (window.electron?.openExternal) {
        window.electron.openExternal(url)
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

/* ==================== 返回按钮 ==================== */
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

/* ==================== 主内容 ==================== */
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

/* ==================== 语言切换动画 ==================== */
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

/* ==================== 标题区 ==================== */
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

/* ==================== 描述区 ==================== */
.description-section {
    margin-bottom: 48px;
}

.description {
    font-size: 1rem;
    line-height: 1.6;
    color: var(--text-secondary);
    text-align: center;
}

/* ==================== 功能特色区 ==================== */
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
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
}

.feature-item {
    display: flex;
    align-items: center;
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

.feature-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-weight: 500;
}

/* ==================== 技术栈区 ==================== */
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

/* ==================== 链接区 ==================== */
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

/* ==================== 响应式设计 ==================== */
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
<template>
    <div 
        ref="topbarRef" 
        class="topbar" 
        :class="{ expanded: searchExpanded }"
    >
        <!-- 搜索图标/输入框 -->
        <div class="search-section">
            <button 
                v-if="!searchExpanded" 
                class="search-icon-btn"
                @click.stop="expandSearch"
                :title="t('topbar.search')"
            >
                <span class="icon">🔍</span>
            </button>
            
            <Transition name="search-fade">
                <div v-if="searchExpanded" class="search-input-wrapper" @click.stop>
                    <span class="search-icon">🔍</span>
                    <input
                        ref="searchInputRef"
                        v-model="searchQuery"
                        type="text"
                        class="search-input"
                        :placeholder="t('topbar.searchPlaceholder')"
                        @blur="handleSearchBlur"
                    />
                </div>
            </Transition>
        </div>

        <!-- 标签组 -->
        <div class="tabs">
            <button
                v-for="tab in tabs"
                :key="tab.id"
                class="tab"
                :class="{ active: activeTab === tab.id }"
                @click="switchTab(tab.id)"
            >
                <span v-if="!searchExpanded" class="tab-text-full">{{ t(`topbar.tabs.${tab.id}`) }}</span>
                <span v-else class="tab-text-short">{{ t(`topbar.tabsShort.${tab.id}`) }}</span>
            </button>
        </div>

        <!-- 创建房间按钮 -->
        <button 
            class="create-btn"
            :title="t('topbar.createRoom')"
            @click="handleCreateRoom"
        >
            <span class="icon">✨</span>
        </button>
    </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const emit = defineEmits(['createRoom', 'search', 'tabChange'])

// 引用
const topbarRef = ref(null)
const searchInputRef = ref(null)

// 状态
const searchExpanded = ref(false)
const searchQuery = ref('')
const activeTab = ref('all')

// 标签配置
const tabs = [
    { id: 'all', label: '全部房间', shortLabel: '全部' },
    { id: 'my', label: '我的房间', shortLabel: '我的' },
    { id: 'joined', label: '已加入', shortLabel: '已加入' },
    { id: 'public', label: '公开房间', shortLabel: '公开' }
]

// 展开搜索
function expandSearch() {
    searchExpanded.value = true
    nextTick(() => {
        searchInputRef.value?.focus()
    })
}

// 收起搜索
function collapseSearch() {
    if (!searchQuery.value) {
        searchExpanded.value = false
    }
}

// 搜索失焦处理
function handleSearchBlur() {
    // 延迟执行，避免点击其他元素时立即收起
    setTimeout(() => {
        collapseSearch()
    }, 200)
}

// 切换标签
function switchTab(tabId) {
    activeTab.value = tabId
    emit('tabChange', tabId)
}

// 创建房间
function handleCreateRoom() {
    emit('createRoom')
}

// 点击外部关闭搜索
function handleClickOutside(event) {
    if (searchExpanded.value && !topbarRef.value?.contains(event.target)) {
        collapseSearch()
    }
}

// 监听搜索输入
function handleSearchInput() {
    emit('search', searchQuery.value)
}

// 监听搜索查询变化
import { watch } from 'vue'
watch(searchQuery, () => {
    handleSearchInput()
})

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.topbar {
    height: 56px;
    padding: 0 24px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 28px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 450px;
    max-width: 700px;
}

.topbar.expanded {
    min-width: 700px;
    max-width: 800px;
}

/* ==================== 暗色模式 ==================== */
html[data-theme='dark'] .topbar {
    background: rgba(28, 28, 28, 0.95);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

/* ==================== 搜索区域 ==================== */
.search-section {
    display: flex;
    align-items: center;
    position: relative;
}

.search-icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 16px;
    background: transparent;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.search-icon-btn:hover {
    background: rgba(0, 0, 0, 0.05);
}

.dark .search-icon-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

.search-icon-btn .icon {
    font-size: 18px;
}

.search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 12px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 18px;
    width: 300px;
}

.dark .search-input-wrapper {
    background: rgba(255, 255, 255, 0.05);
}

.search-icon {
    font-size: 16px;
    opacity: 0.6;
}

.search-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 14px;
    color: var(--text-primary);
    outline: none;
}

.search-input::placeholder {
    color: var(--text-tertiary);
}

/* ==================== 搜索淡入淡出动画 ==================== */
.search-fade-enter-active,
.search-fade-leave-active {
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-fade-enter-from {
    opacity: 0;
    width: 0;
}

.search-fade-leave-to {
    opacity: 0;
    width: 0;
}

/* ==================== 标签组 ==================== */
.tabs {
    flex: 1;
    display: flex;
    gap: 8px;
}

.tab {
    padding: 8px 16px;
    border: none;
    background: transparent;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    color: var(--text-primary);
    white-space: nowrap;
}

.tab:hover {
    background: rgba(103, 126, 234, 0.1);
}

.tab.active {
    background: rgba(103, 126, 234, 0.2);
    font-weight: 500;
}

.tab-text-full,
.tab-text-short {
    transition: opacity 0.3s ease;
}

/* ==================== 创建按钮 ==================== */
.create-btn {
    width: 36px;
    height: 36px;
    border-radius: 18px;
    background: linear-gradient(135deg, #42a5f5 0%, #478ed1 100%);
    color: white;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.create-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(66, 165, 245, 0.4);
}

.create-btn:active {
    transform: scale(1.05);
}

.create-btn .icon {
    font-size: 18px;
}

/* 深色模式下的创建按钮 */
html[data-theme='dark'] .create-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

html[data-theme='dark'] .create-btn:hover {
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 1200px) {
    .topbar {
        width: 350px;
    }

    .topbar.expanded {
        width: 600px;
    }

    .search-input-wrapper {
        width: 250px;
    }
}

@media (max-width: 768px) {
    .topbar {
        width: calc(100vw - 32px);
        padding: 0 16px;
    }

    .topbar.expanded {
        width: calc(100vw - 32px);
    }

    .search-input-wrapper {
        width: 200px;
    }

    .tab {
        padding: 6px 12px;
        font-size: 13px;
    }

    .create-btn {
        width: 32px;
        height: 32px;
    }
}
</style>

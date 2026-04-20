<template>
    <div
        ref="topbarRef"
        class="topbar"
        :class="{
            expanded: isRoomsMode && searchExpanded,
            'collection-mode': !isRoomsMode,
            'compact-mode': !isRoomsMode
        }"
    >
        <Transition name="topbar-mode" mode="out-in">
            <div :key="mode" class="topbar-content">
                <template v-if="isRoomsMode">
                    <div class="search-section">
                        <button
                            v-if="!searchExpanded"
                            class="search-icon-btn"
                            :title="t('topbar.search')"
                            @click.stop="expandSearch"
                        >
                            <span class="search-glyph" aria-hidden="true"></span>
                        </button>

                        <Transition name="search-fade">
                            <div
                                v-if="searchExpanded"
                                class="search-input-wrapper"
                                @click.stop
                            >
                                <span class="search-glyph" aria-hidden="true"></span>
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

                    <div class="tabs">
                        <button
                            v-for="tab in tabs"
                            :key="tab.id"
                            class="tab"
                            :class="{ active: currentTab === tab.id }"
                            @click="switchTab(tab.id)"
                        >
                            <span v-if="!searchExpanded" class="tab-text-full">{{ t(`topbar.tabs.${tab.id}`) }}</span>
                            <span v-else class="tab-text-short">{{ t(`topbar.tabsShort.${tab.id}`) }}</span>
                        </button>
                    </div>

                    <button
                        class="secondary-action-btn"
                        :title="t('inviteRoom.title')"
                        @click="emit('directJoin')"
                    >
                        <span class="lock-glyph" aria-hidden="true"></span>
                    </button>

                    <button
                        class="create-btn"
                        :title="t('topbar.createRoom')"
                        @click="emit('createRoom')"
                    >
                        <span class="create-glyph" aria-hidden="true"></span>
                    </button>
                </template>

                <template v-else>
                    <div class="collection-title">
                        <span class="collection-title-text">{{ title }}</span>
                    </div>

                    <div class="collection-search">
                        <div class="search-input-wrapper always-visible">
                            <span class="search-glyph" aria-hidden="true"></span>
                            <input
                                v-model="searchQuery"
                                type="text"
                                class="search-input"
                                :placeholder="searchPlaceholder"
                            />
                        </div>
                    </div>
                </template>
            </div>
        </Transition>
    </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
    mode: {
        type: String,
        default: 'rooms'
    },
    title: {
        type: String,
        default: ''
    },
    searchValue: {
        type: String,
        default: ''
    },
    activeTab: {
        type: String,
        default: 'all'
    }
})

const emit = defineEmits(['createRoom', 'directJoin', 'search', 'tabChange'])

const topbarRef = ref(null)
const searchInputRef = ref(null)
const searchExpanded = ref(false)
const searchQuery = ref(props.searchValue)
const currentTab = ref(props.activeTab)

const isRoomsMode = computed(() => props.mode === 'rooms')
const searchPlaceholder = computed(() => {
    if (props.mode === 'recent') return t('recent.searchPlaceholder')
    if (props.mode === 'favorites') return t('favorites.searchPlaceholder')
    return t('topbar.searchPlaceholder')
})

const tabs = [
    { id: 'all' },
    { id: 'my' },
    { id: 'joined' },
    { id: 'public' }
]

function expandSearch() {
    if (!isRoomsMode.value) return
    searchExpanded.value = true
    nextTick(() => searchInputRef.value?.focus())
}

function collapseSearch() {
    if (!searchQuery.value) {
        searchExpanded.value = false
    }
}

function handleSearchBlur() {
    if (!isRoomsMode.value) return
    window.setTimeout(() => {
        collapseSearch()
    }, 200)
}

function switchTab(tabId) {
    currentTab.value = tabId
    emit('tabChange', tabId)
}

function handleClickOutside(event) {
    if (!isRoomsMode.value) return
    if (searchExpanded.value && !topbarRef.value?.contains(event.target)) {
        collapseSearch()
    }
}

watch(() => props.searchValue, value => {
    searchQuery.value = value
    if (isRoomsMode.value && value) {
        searchExpanded.value = true
    }
})

watch(() => props.activeTab, value => {
    currentTab.value = value
})

watch(() => props.mode, mode => {
    if (mode !== 'rooms') {
        searchExpanded.value = false
    } else if (searchQuery.value) {
        searchExpanded.value = true
    }
})

watch(searchQuery, value => {
    emit('search', value)
})

onMounted(() => {
    if (isRoomsMode.value && searchQuery.value) {
        searchExpanded.value = true
    }
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
    width: min(720px, calc(100vw - 32px));
    min-width: min(480px, calc(100vw - 32px));
    max-width: calc(100vw - 32px);
    overflow: hidden;
}

.topbar-content {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: gap 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.topbar.expanded {
    width: min(800px, calc(100vw - 32px));
    min-width: min(700px, calc(100vw - 32px));
}

.topbar.collection-mode {
    width: min(520px, calc(100vw - 32px));
    min-width: 0;
    padding: 0 16px;
    border-radius: 22px;
}

html[data-theme='dark'] .topbar {
    background: rgba(28, 28, 28, 0.95);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.search-section,
.collection-search {
    display: flex;
    align-items: center;
    position: relative;
}

.collection-search {
    flex: 1;
    justify-content: center;
    min-width: 0;
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

.search-glyph {
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-radius: 50%;
    position: relative;
    display: inline-block;
    color: var(--text-secondary);
    flex-shrink: 0;
}

.search-glyph::after {
    content: '';
    position: absolute;
    width: 7px;
    height: 2px;
    border-radius: 2px;
    background: currentColor;
    right: -5px;
    bottom: -2px;
    transform: rotate(45deg);
    transform-origin: center;
}

.search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 36px;
    padding: 0 12px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 18px;
    width: 300px;
}

.search-input-wrapper.always-visible {
    width: min(220px, 100%);
}

.dark .search-input-wrapper {
    background: rgba(255, 255, 255, 0.05);
}

.search-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 14px;
    color: var(--text-primary);
    outline: none;
    min-width: 0;
}

.search-input::placeholder {
    color: var(--text-tertiary);
}

.collection-title {
    display: flex;
    align-items: center;
    min-width: 0;
    flex-shrink: 0;
}

.collection-title-text {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    letter-spacing: 0.01em;
}

.search-fade-enter-active,
.search-fade-leave-active {
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-fade-enter-from,
.search-fade-leave-to {
    opacity: 0;
    width: 0;
    transform: translateX(-8px);
}

.topbar-mode-enter-active,
.topbar-mode-leave-active {
    transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.topbar-mode-enter-from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
}

.topbar-mode-leave-to {
    opacity: 0;
    transform: translateY(-10px) scale(0.985);
}

.compact-mode .topbar-content {
    gap: 10px;
}

.compact-mode .collection-title {
    min-width: fit-content;
}

.compact-mode .collection-search {
    justify-content: flex-end;
}

.compact-mode .search-input-wrapper.always-visible {
    height: 32px;
    padding: 0 10px;
}

.compact-mode .search-input {
    font-size: 12px;
}

.tabs {
    flex: 1;
    display: flex;
    gap: 8px;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
    display: none;
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

.secondary-action-btn {
    width: 36px;
    height: 36px;
    padding: 0;
    border-radius: 18px;
    border: 1px solid rgba(103, 126, 234, 0.14);
    background: transparent;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.22s ease;
    flex-shrink: 0;
}

.secondary-action-btn:hover {
    background: rgba(103, 126, 234, 0.08);
    border-color: rgba(103, 126, 234, 0.22);
    transform: translateY(-1px);
}

.lock-glyph {
    position: relative;
    width: 12px;
    height: 10px;
    border: 1.8px solid currentColor;
    border-radius: 3px;
    display: inline-block;
    box-sizing: border-box;
}

.lock-glyph::before {
    content: '';
    position: absolute;
    left: 50%;
    bottom: calc(100% - 1px);
    width: 8px;
    height: 7px;
    border: 1.8px solid currentColor;
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    transform: translateX(-50%);
    box-sizing: border-box;
}

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

.create-glyph {
    width: 14px;
    height: 14px;
    position: relative;
    display: inline-block;
}

.create-glyph::before,
.create-glyph::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 14px;
    height: 2px;
    background: currentColor;
    border-radius: 2px;
    transform: translate(-50%, -50%);
}

.create-glyph::after {
    transform: translate(-50%, -50%) rotate(90deg);
}

html[data-theme='dark'] .create-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

html[data-theme='dark'] .secondary-action-btn {
    border-color: rgba(255, 255, 255, 0.08);
    background: transparent;
}

html[data-theme='dark'] .secondary-action-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.14);
}

html[data-theme='dark'] .create-btn:hover {
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
}

@media (max-width: 1200px) {
    .topbar {
        width: min(560px, calc(100vw - 32px));
        min-width: 0;
    }

    .topbar.expanded {
        width: min(680px, calc(100vw - 32px));
        min-width: 0;
    }

    .topbar.collection-mode {
        width: min(470px, calc(100vw - 32px));
    }

    .search-input-wrapper {
        width: min(250px, 34vw);
    }
}

@media (max-width: 768px) {
    .topbar {
        width: calc(100vw - 32px);
        padding: 0 16px;
        gap: 10px;
    }

    .topbar-content {
        gap: 10px;
    }

    .topbar.expanded,
    .topbar.collection-mode {
        width: calc(100vw - 32px);
    }

    .search-input-wrapper,
    .search-input-wrapper.always-visible {
        width: min(200px, 42vw);
    }

    .compact-mode .collection-search {
        justify-content: flex-end;
    }

    .tab {
        padding: 6px 12px;
        font-size: 13px;
    }

    .create-btn {
        width: 32px;
        height: 32px;
    }

    .secondary-action-btn {
        height: 32px;
        width: 32px;
    }
}

@media (max-width: 560px) {
    .topbar,
    .topbar.expanded,
    .topbar.collection-mode {
        width: calc(100vw - 20px);
        max-width: calc(100vw - 20px);
        padding: 0 12px;
        gap: 8px;
    }

    .topbar-content {
        gap: 8px;
    }

    .search-input-wrapper,
    .search-input-wrapper.always-visible {
        width: min(150px, 38vw);
    }

    .compact-mode .topbar-content {
        gap: 8px;
    }

    .tab {
        padding: 6px 10px;
        font-size: 12px;
    }

    .collection-title-text {
        font-size: 14px;
    }

    .secondary-action-btn {
        width: 32px;
    }
}
</style>

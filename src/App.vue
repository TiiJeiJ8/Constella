<template>
    <Transition name="slide" mode="out-in">
        <HomeView v-if="currentView === 'home'" @navigate="handleNavigate" />
        <AboutView v-else-if="currentView === 'about'" @navigate="handleNavigate" />
    </Transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import HomeView from './views/HomeView.vue'
import AboutView from './views/AboutView.vue'

const currentView = ref('home')

// 在应用启动时初始化主题
onMounted(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    document.documentElement.setAttribute('data-theme', savedTheme)
})

function handleNavigate(view) {
    currentView.value = view
}
</script>

<style scoped>
/* ==================== 页面切换动画 ==================== */
.slide-enter-active,
.slide-leave-active {
    transition: all 0.4s ease;
}

.slide-enter-from {
    opacity: 0;
    transform: translateX(30px);
}

.slide-leave-to {
    opacity: 0;
    transform: translateX(-30px);
}
</style>

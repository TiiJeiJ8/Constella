<template>
    <Transition name="slide" mode="out-in">
        <HomeView v-if="currentView === 'home'" @navigate="handleNavigate" />
        <AboutView v-else-if="currentView === 'about'" @navigate="handleNavigate" />
    </Transition>
</template>

<script setup>
import { ref } from 'vue'
import HomeView from './views/HomeView.vue'
import AboutView from './views/AboutView.vue'

const currentView = ref('home')

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

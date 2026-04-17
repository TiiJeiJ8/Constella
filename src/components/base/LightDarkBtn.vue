<template>
    <button
        class="theme-button"
        :class="{ active: isDark }"
        type="button"
        :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
        @click="toggleTheme"
    >
        <svg v-if="isDark" class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.66 6.34l-1.55 1.55M7.89 16.11l-1.55 1.55M17.66 17.66l-1.55-1.55M7.89 7.89L6.34 6.34" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
            <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8" />
        </svg>
        <svg v-else class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.5 14.75A7.25 7.25 0 0 1 9.25 5.5a7.75 7.75 0 1 0 9.25 9.25Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8" />
        </svg>
    </button>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { applyTheme, getStoredTheme, setTheme } from '@/utils/theme'

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: undefined
    },
    theme: {
        type: String,
        default: undefined
    }
})

const emit = defineEmits(['update:modelValue', 'change'])
const isDark = ref(false)

watch(() => props.modelValue, val => {
    if (typeof val === 'boolean') {
        isDark.value = val
        applyTheme(val ? 'dark' : 'light')
    }
})

watch(() => props.theme, val => {
    if (val === 'dark' || val === 'light') {
        isDark.value = val === 'dark'
        applyTheme(val)
    }
})

function toggleTheme() {
    isDark.value = !isDark.value
    const theme = isDark.value ? 'dark' : 'light'
    setTheme(theme)
    emit('update:modelValue', isDark.value)
    emit('change', theme)
}

onMounted(() => {
    if (props.modelValue === undefined && props.theme === undefined) {
        const savedTheme = getStoredTheme()
        isDark.value = savedTheme === 'dark'
        applyTheme(savedTheme)
    }
})
</script>

<style scoped>
.theme-button {
    width: 40px;
    height: 40px;
    border: 1px solid var(--border-color);
    border-radius: 50%;
    background: var(--bg-secondary);
    color: var(--text-primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s ease;
}

.theme-button:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
}

.theme-button.active {
    background: color-mix(in srgb, var(--accent-primary) 10%, var(--bg-secondary) 90%);
}

.theme-icon {
    width: 18px;
    height: 18px;
    display: block;
}
</style>

export type AppTheme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'theme'
const SETTINGS_STORAGE_KEY = 'settings'
const DEFAULT_THEME: AppTheme = 'light'

function readValidTheme(value: unknown): AppTheme | null {
    return value === 'dark' || value === 'light' ? value : null
}

export function normalizeTheme(value: unknown): AppTheme {
    return readValidTheme(value) ?? DEFAULT_THEME
}

function getCurrentDocumentTheme(): AppTheme | null {
    if (typeof document === 'undefined') return null
    return readValidTheme(document.documentElement.getAttribute('data-theme'))
}

function getSettingsTheme(): AppTheme | null {
    try {
        if (typeof window === 'undefined') return null
        const settings = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}')
        return readValidTheme(settings?.theme)
    } catch {
        return null
    }
}

export function getStoredTheme(): AppTheme {
    try {
        if (typeof window === 'undefined') return DEFAULT_THEME

        const storedTheme = readValidTheme(window.localStorage.getItem(THEME_STORAGE_KEY))
        const settingsTheme = getSettingsTheme()
        const documentTheme = getCurrentDocumentTheme()

        if (storedTheme && settingsTheme && storedTheme !== settingsTheme) {
            return documentTheme === settingsTheme ? settingsTheme : storedTheme
        }

        return storedTheme ?? settingsTheme ?? documentTheme ?? DEFAULT_THEME
    } catch {
        return getCurrentDocumentTheme() ?? DEFAULT_THEME
    }
}

export function applyTheme(theme: AppTheme) {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', theme)
}

export function setTheme(theme: AppTheme) {
    const normalizedTheme = normalizeTheme(theme)
    applyTheme(normalizedTheme)
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme)
        const nextSettings = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}')
        nextSettings.theme = normalizedTheme
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings))
    } catch {}
    return normalizedTheme
}

export function applyStoredTheme() {
    const theme = getStoredTheme()
    applyTheme(theme)
    return theme
}

const STORAGE_KEYS = {
    accessToken: 'access_token',
    legacyAccessToken: 'accessToken',
    refreshToken: 'refresh_token',
    legacyRefreshToken: 'refreshToken',
    userId: 'user_id',
    username: 'username',
    user: 'user',
    recentVisits: 'recentVisits',
    favoriteRooms: 'favoriteRooms'
} as const

interface RecentVisitRecord {
    roomId: string
    lastVisit: number
}

interface FavoriteRoomRecord {
    roomId: string
    addedAt: number
}

function readJson<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) as T : fallback
    } catch (error) {
        console.error(`[storage] Failed to parse "${key}"`, error)
        return fallback
    }
}

function writeJson(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value))
}

function migrateLegacyToken(nextKey: string, legacyKey: string) {
    const currentValue = localStorage.getItem(nextKey)
    if (currentValue) return currentValue

    const legacyValue = localStorage.getItem(legacyKey)
    if (!legacyValue) return ''

    localStorage.setItem(nextKey, legacyValue)
    localStorage.removeItem(legacyKey)
    return legacyValue
}

export function getAccessToken() {
    return migrateLegacyToken(STORAGE_KEYS.accessToken, STORAGE_KEYS.legacyAccessToken)
}

export function getRefreshToken() {
    return migrateLegacyToken(STORAGE_KEYS.refreshToken, STORAGE_KEYS.legacyRefreshToken)
}

export function setAuthTokens(tokens: { accessToken?: string; refreshToken?: string }) {
    if (tokens.accessToken) {
        localStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken)
        localStorage.removeItem(STORAGE_KEYS.legacyAccessToken)
    }

    if (tokens.refreshToken) {
        localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken)
        localStorage.removeItem(STORAGE_KEYS.legacyRefreshToken)
    }
}

export function getStoredUser() {
    return readJson<Record<string, any> | null>(STORAGE_KEYS.user, null)
}

export function getUserId() {
    const directUserId = localStorage.getItem(STORAGE_KEYS.userId)
    if (directUserId) return directUserId

    const storedUser = getStoredUser()
    const derivedUserId = storedUser?.id != null ? String(storedUser.id) : ''
    if (derivedUserId) {
        localStorage.setItem(STORAGE_KEYS.userId, derivedUserId)
    }
    return derivedUserId
}

export function getUsername() {
    const directUsername = localStorage.getItem(STORAGE_KEYS.username)
    if (directUsername) return directUsername

    const storedUser = getStoredUser()
    const derivedUsername = storedUser?.username || ''
    if (derivedUsername) {
        localStorage.setItem(STORAGE_KEYS.username, derivedUsername)
    }
    return derivedUsername
}

export function setStoredUser(user: Record<string, any> | null) {
    if (!user) {
        localStorage.removeItem(STORAGE_KEYS.user)
        localStorage.removeItem(STORAGE_KEYS.userId)
        localStorage.removeItem(STORAGE_KEYS.username)
        return
    }

    writeJson(STORAGE_KEYS.user, user)

    if (user.id != null) {
        localStorage.setItem(STORAGE_KEYS.userId, String(user.id))
    }

    if (typeof user.username === 'string' && user.username.trim()) {
        localStorage.setItem(STORAGE_KEYS.username, user.username.trim())
    }
}

export function clearAuthStorage() {
    localStorage.removeItem(STORAGE_KEYS.accessToken)
    localStorage.removeItem(STORAGE_KEYS.legacyAccessToken)
    localStorage.removeItem(STORAGE_KEYS.refreshToken)
    localStorage.removeItem(STORAGE_KEYS.legacyRefreshToken)
    localStorage.removeItem(STORAGE_KEYS.user)
    localStorage.removeItem(STORAGE_KEYS.userId)
    localStorage.removeItem(STORAGE_KEYS.username)
}

export function getRecentVisits() {
    return readJson<RecentVisitRecord[]>(STORAGE_KEYS.recentVisits, [])
}

export function saveRecentVisits(visits: RecentVisitRecord[]) {
    writeJson(STORAGE_KEYS.recentVisits, visits)
}

export function recordRecentVisit(roomId: string) {
    const nextVisits = getRecentVisits()
        .filter(visit => visit.roomId !== roomId)
    nextVisits.unshift({ roomId, lastVisit: Date.now() })
    saveRecentVisits(nextVisits.slice(0, 50))
}

export function getFavoriteRooms() {
    return readJson<FavoriteRoomRecord[]>(STORAGE_KEYS.favoriteRooms, [])
}

export function saveFavoriteRooms(rooms: FavoriteRoomRecord[]) {
    writeJson(STORAGE_KEYS.favoriteRooms, rooms)
}

export function toggleFavoriteRoom(roomId: string) {
    const favorites = getFavoriteRooms()
    const isFavorited = favorites.some(item => item.roomId === roomId)

    if (isFavorited) {
        const nextFavorites = favorites.filter(item => item.roomId !== roomId)
        saveFavoriteRooms(nextFavorites)
        return false
    }

    saveFavoriteRooms([
        ...favorites,
        { roomId, addedAt: Date.now() }
    ])
    return true
}

export function removeRoomFromLocalCollections(roomId: string) {
    saveFavoriteRooms(getFavoriteRooms().filter(item => item.roomId !== roomId))
    saveRecentVisits(getRecentVisits().filter(item => item.roomId !== roomId))
}

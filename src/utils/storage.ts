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

const TODO_CACHE_VERSION = 1
const TODO_CACHE_PREFIX = 'ctodo3'
const TODO_LEGACY_GLOBAL_KEY = 'ctodo2'
const TODO_LEGACY_ROOM_PREFIX = 'ctodo2:'
const TODO_MISSING_PURGE_MS = 7 * 24 * 60 * 60 * 1000

interface RecentVisitRecord {
    roomId: string
    lastVisit: number
}

interface FavoriteRoomRecord {
    roomId: string
    addedAt: number
}

export interface CachedTodoItem {
    id: string
    text: string
    done: boolean
    dueDate?: string
    assigneeId?: string
    assigneeName?: string
    creatorId?: string
    creatorName?: string
    isPublic?: boolean
    createdAt: number
}

interface TodoCacheEnvelope {
    version: number
    serverId: string
    roomId: string
    updatedAt: number
    missingSince?: number
    todos: CachedTodoItem[]
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

function normalizeServerId(serverUrl?: string) {
    const raw = (serverUrl || localStorage.getItem('serverUrl') || '').trim().replace(/\/$/, '')
    if (!raw) return 'local'

    try {
        const url = new URL(raw)
        url.hash = ''
        url.search = ''
        url.pathname = url.pathname.replace(/\/$/, '')
        return `${url.protocol}//${url.host}${url.pathname}`.toLowerCase()
    } catch {
        return raw.toLowerCase()
    }
}

function encodeKeyPart(value: string) {
    return encodeURIComponent(value)
}

export function getTodoCacheKey(serverUrl: string | undefined, roomId: string) {
    return `${TODO_CACHE_PREFIX}:${encodeKeyPart(normalizeServerId(serverUrl))}:${encodeKeyPart(roomId || 'global')}`
}

function readTodoEnvelope(key: string): TodoCacheEnvelope | null {
    return readJson<TodoCacheEnvelope | null>(key, null)
}

function writeTodoEnvelope(serverUrl: string | undefined, roomId: string, todos: CachedTodoItem[], missingSince?: number) {
    const serverId = normalizeServerId(serverUrl)
    writeJson(getTodoCacheKey(serverUrl, roomId), {
        version: TODO_CACHE_VERSION,
        serverId,
        roomId,
        updatedAt: Date.now(),
        missingSince,
        todos
    } satisfies TodoCacheEnvelope)
}

function migrateLegacyTodos(serverUrl: string | undefined, roomId: string) {
    const roomLegacyKey = `${TODO_LEGACY_ROOM_PREFIX}${roomId || 'global'}`
    const roomLegacy = localStorage.getItem(roomLegacyKey)
    if (roomLegacy) {
        const todos = readJson<CachedTodoItem[]>(roomLegacyKey, [])
        writeTodoEnvelope(serverUrl, roomId, todos)
        localStorage.removeItem(roomLegacyKey)
        return todos
    }

    const globalMigrationKey = `${TODO_LEGACY_ROOM_PREFIX}migrated:${normalizeServerId(serverUrl)}:${roomId || 'global'}`
    const globalLegacy = localStorage.getItem(TODO_LEGACY_GLOBAL_KEY)
    if (globalLegacy && !localStorage.getItem(globalMigrationKey)) {
        const todos = readJson<CachedTodoItem[]>(TODO_LEGACY_GLOBAL_KEY, [])
        writeTodoEnvelope(serverUrl, roomId, todos)
        localStorage.setItem(globalMigrationKey, '1')
        return todos
    }

    return []
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

export function loadTodoCache(serverUrl: string | undefined, roomId: string) {
    const key = getTodoCacheKey(serverUrl, roomId)
    const cached = readTodoEnvelope(key)
    if (cached) {
        if (cached.missingSince) {
            writeTodoEnvelope(serverUrl, roomId, cached.todos)
        }
        return cached.todos
    }

    return migrateLegacyTodos(serverUrl, roomId)
}

export function saveTodoCache(serverUrl: string | undefined, roomId: string, todos: CachedTodoItem[]) {
    writeTodoEnvelope(serverUrl, roomId, todos)
}

export function removeTodoCache(serverUrl: string | undefined, roomId: string) {
    localStorage.removeItem(getTodoCacheKey(serverUrl, roomId))
}

export function reconcileTodoCacheForRooms(serverUrl: string | undefined, activeRoomIds: string[]) {
    const serverId = normalizeServerId(serverUrl)
    const serverPrefix = `${TODO_CACHE_PREFIX}:${encodeKeyPart(serverId)}:`
    const activeRooms = new Set(activeRoomIds)
    const now = Date.now()

    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index)
        if (!key || !key.startsWith(serverPrefix)) continue

        const cached = readTodoEnvelope(key)
        if (!cached) continue

        if (activeRooms.has(cached.roomId)) {
            if (cached.missingSince) {
                writeTodoEnvelope(serverUrl, cached.roomId, cached.todos)
            }
            continue
        }

        if (cached.missingSince && now - cached.missingSince > TODO_MISSING_PURGE_MS) {
            localStorage.removeItem(key)
        } else if (!cached.missingSince) {
            writeJson(key, {
                ...cached,
                missingSince: now
            } satisfies TodoCacheEnvelope)
        }
    }
}

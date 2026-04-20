import { parseServerTimestamp } from '@/utils/time'

export interface RoomListItem {
    id: string
    name: string
    description: string
    creator: string
    memberCount: number
    isPrivate: boolean
    role: string | null
    accessScope?: 'member' | 'preview'
    joinMode?: 'direct'
    lastActive: number
    createdAt?: string
    settings: Record<string, any>
}

export function mapRoomSummary(room: any): RoomListItem | null {
    if (!room?.id) return null

    try {
        return {
            id: room.id,
            name: room.name || '',
            description: room.description || '',
            creator: room.owner?.id || '',
            memberCount: Math.max(0, room.member_count || 0),
            isPrivate: Boolean(room.is_private),
            role: room.user_role || null,
            accessScope: room.access_scope || 'preview',
            joinMode: 'direct',
            lastActive: parseServerTimestamp(room.updated_at),
            createdAt: room.created_at,
            settings: room.settings || {}
        }
    } catch (error) {
        console.error('[roomMapper] Failed to map room summary', room, error)
        return null
    }
}

export function mapRoomCollection(data: any): RoomListItem[] {
    const roomsData = data?.rooms || data || []
    if (!Array.isArray(roomsData)) return []

    return roomsData
        .map(mapRoomSummary)
        .filter(Boolean) as RoomListItem[]
}

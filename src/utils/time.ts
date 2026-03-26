export function parseServerTimestamp(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }

    if (typeof value !== 'string') {
        return Date.now()
    }

    const trimmed = value.trim()
    if (!trimmed) {
        return Date.now()
    }

    const hasTimezone = /([zZ]|[+\-]\d{2}:?\d{2})$/.test(trimmed)
    const normalized = hasTimezone ? trimmed : `${trimmed.replace(' ', 'T')}Z`
    const parsed = Date.parse(normalized)

    if (Number.isNaN(parsed)) {
        return Date.now()
    }

    return parsed
}

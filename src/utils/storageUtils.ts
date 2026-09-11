export const THEME_KEY = 'arnooxine-theme'
export const READER_SETTINGS_KEY = 'arnooxine-reader-settings'
export const CONTENT_KEY = 'arnooxine-content'
/** Legacy localStorage key; migrated into IndexedDB by historyStore. */
export const HISTORY_KEY = 'arnooxine-history'
export const HISTORY_LIMIT_KEY = 'arnooxine-history-limit'

/** About 1.5MB of UTF-8. Leaves headroom under typical localStorage quotas. */
export const MAX_CONTENT_BYTES = 1_500_000
export const DEFAULT_HISTORY_LIMIT = 10
/**
 * Soft ceiling so a typo like 1e15 cannot explode storage.
 * Not a product max — users may choose 10…1000+.
 */
export const MAX_HISTORY_LIMIT = 10_000

export interface HistoryEntry {
    id: string
    text: string
    savedAt: number
}

export type SaveFailureReason = 'too-large' | 'quota' | 'unavailable'

export type SaveContentResult =
    | { ok: true }
    | { ok: false; reason: SaveFailureReason }

export type Theme = 'dark' | 'light'

const FA_FONTS = new Set(['Vazirmatn', 'Shabnam', 'Samim', 'Sahel', 'Lalezar', 'VazirCode', 'System'])
const EN_FONTS = new Set(['Inter', 'Roboto', 'JetBrains Mono', 'Fira Code', 'Outfit'])
const AR_FONTS = new Set(['Amiri', 'Cairo', 'Scheherazade New'])
const FONT_SIZES = new Set([15, 17, 19, 21, 24])
const LINE_HEIGHTS = new Set([1.6, 1.8, 2.0, 2.2, 2.4])

export interface ReaderSettings {
    fontFamily: string
    fontFamilyEn: string
    fontFamilyAr: string
    fontSize: number
    lineHeight: number
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
    fontFamily: 'Vazirmatn',
    fontFamilyEn: 'Inter',
    fontFamilyAr: 'Amiri',
    fontSize: 17,
    lineHeight: 2.0,
}

function pickString(value: unknown, allowed: Set<string>, fallback: string): string {
    return typeof value === 'string' && allowed.has(value) ? value : fallback
}

function pickNumber(value: unknown, allowed: Set<number>, fallback: number): number {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
    return allowed.has(n) ? n : fallback
}

export function parseReaderSettings(raw: string | null): ReaderSettings {
    if (!raw) return DEFAULT_READER_SETTINGS
    try {
        const parsed = JSON.parse(raw) as Partial<ReaderSettings>
        let fontFamily = pickString(parsed.fontFamily, FA_FONTS, DEFAULT_READER_SETTINGS.fontFamily)
        if (parsed.fontFamily === 'Yekan') fontFamily = 'Vazirmatn'

        return {
            fontFamily,
            fontFamilyEn: pickString(parsed.fontFamilyEn, EN_FONTS, DEFAULT_READER_SETTINGS.fontFamilyEn),
            fontFamilyAr: pickString(parsed.fontFamilyAr, AR_FONTS, DEFAULT_READER_SETTINGS.fontFamilyAr),
            fontSize: pickNumber(parsed.fontSize, FONT_SIZES, DEFAULT_READER_SETTINGS.fontSize),
            lineHeight: pickNumber(parsed.lineHeight, LINE_HEIGHTS, DEFAULT_READER_SETTINGS.lineHeight),
        }
    } catch {
        return DEFAULT_READER_SETTINGS
    }
}

export function loadTheme(): Theme {
    try {
        const saved = localStorage.getItem(THEME_KEY)
        if (saved === 'light' || saved === 'dark') return saved
    } catch {
        // ignore private mode / quota
    }
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function loadReaderSettings(): ReaderSettings {
    try {
        return parseReaderSettings(localStorage.getItem(READER_SETTINGS_KEY))
    } catch {
        return DEFAULT_READER_SETTINGS
    }
}

export function loadContentDetailed(): { text: string; truncated: boolean } {
    try {
        const saved = localStorage.getItem(CONTENT_KEY)
        if (typeof saved !== 'string') return {text: '', truncated: false}
        if (contentByteSize(saved) <= MAX_CONTENT_BYTES) return {text: saved, truncated: false}
        const clipped = truncateToByteLimit(saved, MAX_CONTENT_BYTES)
        try {
            localStorage.setItem(CONTENT_KEY, clipped)
        } catch {
            // ignore rewrite failures; still return a bounded string for the editor
        }
        return {text: clipped, truncated: true}
    } catch {
        return {text: '', truncated: false}
    }
}

export function loadContent(): string {
    return loadContentDetailed().text
}

export function saveTheme(theme: Theme): void {
    try {
        localStorage.setItem(THEME_KEY, theme)
    } catch {
        // ignore
    }
}

export function saveReaderSettings(settings: ReaderSettings): void {
    try {
        localStorage.setItem(READER_SETTINGS_KEY, JSON.stringify(settings))
    } catch {
        // ignore
    }
}

export function contentByteSize(text: string): number {
    return new Blob([text]).size
}

/** UTF-8-safe truncate used when persisted content exceeds the cap. */
export function truncateToByteLimit(text: string, maxBytes: number): string {
    if (contentByteSize(text) <= maxBytes) return text
    const bytes = new TextEncoder().encode(text)
    let end = Math.min(maxBytes, bytes.length)
    while (end > 0 && (bytes[end] & 0xc0) === 0x80) end -= 1
    return new TextDecoder().decode(bytes.slice(0, end))
}

export function isQuotaExceededError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false
    const error = err as { name?: string; code?: number }
    return (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22 ||
        error.code === 1014
    )
}

export function saveContent(text: string): SaveContentResult {
    if (contentByteSize(text) > MAX_CONTENT_BYTES) {
        return {ok: false, reason: 'too-large'}
    }
    try {
        localStorage.setItem(CONTENT_KEY, text)
        return {ok: true}
    } catch (err) {
        if (isQuotaExceededError(err)) return {ok: false, reason: 'quota'}
        return {ok: false, reason: 'unavailable'}
    }
}

export function clearContent(): SaveContentResult {
    try {
        localStorage.removeItem(CONTENT_KEY)
        return {ok: true}
    } catch {
        return {ok: false, reason: 'unavailable'}
    }
}

export function saveFailureMessage(reason: SaveFailureReason): string {
    switch (reason) {
        case 'too-large':
            return 'حجم سند از سقف ۱٫۵ مگابایت بیشتر است و ذخیره نشد'
        case 'quota':
            return 'حافظهٔ مرورگر پر است؛ سند ذخیره نشد. خروجی بگیرید'
        case 'unavailable':
            return 'ذخیره در این مرورگر ممکن نیست؛ خروجی بگیرید'
    }
}

export function normalizeHistoryLimit(value: unknown): number {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
    if (!Number.isFinite(n)) return DEFAULT_HISTORY_LIMIT
    return Math.min(MAX_HISTORY_LIMIT, Math.max(1, Math.floor(n)))
}

export function loadHistoryLimit(): number {
    try {
        return normalizeHistoryLimit(localStorage.getItem(HISTORY_LIMIT_KEY))
    } catch {
        return DEFAULT_HISTORY_LIMIT
    }
}

export function saveHistoryLimit(limit: number): number {
    const next = normalizeHistoryLimit(limit)
    try {
        localStorage.setItem(HISTORY_LIMIT_KEY, String(next))
    } catch {
        // ignore
    }
    return next
}

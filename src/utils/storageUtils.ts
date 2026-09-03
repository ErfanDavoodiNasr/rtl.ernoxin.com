export const THEME_KEY = 'arnooxine-theme'
export const READER_SETTINGS_KEY = 'arnooxine-reader-settings'
export const CONTENT_KEY = 'arnooxine-content'

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

export function loadContent(): string {
    try {
        const saved = localStorage.getItem(CONTENT_KEY)
        return typeof saved === 'string' ? saved : ''
    } catch {
        return ''
    }
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

export function saveContent(text: string): void {
    try {
        localStorage.setItem(CONTENT_KEY, text)
    } catch {
        // ignore
    }
}

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
    clearContent,
    CONTENT_KEY,
    contentByteSize,
    DEFAULT_HISTORY_LIMIT,
    DEFAULT_READER_SETTINGS,
    loadContentDetailed,
    loadHistoryLimit,
    MAX_CONTENT_BYTES,
    MAX_HISTORY_LIMIT,
    normalizeHistoryLimit,
    parseReaderSettings,
    saveContent,
    saveFailureMessage,
    saveHistoryLimit,
    truncateToByteLimit,
} from './storageUtils'

function createMemoryStorage(): Storage {
    const store = new Map<string, string>()
    return {
        get length() {
            return store.size
        },
        clear() {
            store.clear()
        },
        getItem(key: string) {
            return store.has(key) ? store.get(key)! : null
        },
        key(index: number) {
            return [...store.keys()][index] ?? null
        },
        removeItem(key: string) {
            store.delete(key)
        },
        setItem(key: string, value: string) {
            store.set(key, String(value))
        },
    }
}

describe('parseReaderSettings', () => {
    it('returns defaults for null or invalid JSON', () => {
        expect(parseReaderSettings(null)).toEqual(DEFAULT_READER_SETTINGS)
        expect(parseReaderSettings('{bad json')).toEqual(DEFAULT_READER_SETTINGS)
    })

    it('rejects unknown font families and sizes', () => {
        const result = parseReaderSettings(JSON.stringify({
            fontFamily: 'Comic Sans',
            fontFamilyEn: 'Unknown',
            fontFamilyAr: 'Unknown',
            fontSize: 99,
            lineHeight: 9.9,
        }))
        expect(result).toEqual(DEFAULT_READER_SETTINGS)
    })

    it('accepts valid settings', () => {
        const result = parseReaderSettings(JSON.stringify({
            fontFamily: 'Shabnam',
            fontFamilyEn: 'Roboto',
            fontFamilyAr: 'Cairo',
            fontSize: 19,
            lineHeight: 1.8,
        }))
        expect(result.fontFamily).toBe('Shabnam')
        expect(result.fontFamilyEn).toBe('Roboto')
        expect(result.fontFamilyAr).toBe('Cairo')
        expect(result.fontSize).toBe(19)
        expect(result.lineHeight).toBe(1.8)
    })

    it('migrates removed Yekan font to Vazirmatn', () => {
        const result = parseReaderSettings(JSON.stringify({fontFamily: 'Yekan'}))
        expect(result.fontFamily).toBe('Vazirmatn')
    })
})

describe('saveContent', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createMemoryStorage())
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('persists text under the size cap', () => {
        expect(saveContent('سلام')).toEqual({ok: true})
        expect(localStorage.getItem(CONTENT_KEY)).toBe('سلام')
    })

    it('refuses documents over the size cap without writing', () => {
        const huge = 'ا'.repeat(MAX_CONTENT_BYTES + 1)
        expect(contentByteSize(huge)).toBeGreaterThan(MAX_CONTENT_BYTES)
        expect(saveContent(huge)).toEqual({ok: false, reason: 'too-large'})
        expect(localStorage.getItem(CONTENT_KEY)).toBeNull()
    })

    it('reports quota errors instead of swallowing them', () => {
        const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
            const err = new Error('quota')
            err.name = 'QuotaExceededError'
            throw err
        })
        expect(saveContent('سلام')).toEqual({ok: false, reason: 'quota'})
        spy.mockRestore()
    })

    it('clears stored content', () => {
        saveContent('موقت')
        expect(clearContent()).toEqual({ok: true})
        expect(localStorage.getItem(CONTENT_KEY)).toBeNull()
    })

    it('has a user-facing message for each failure', () => {
        expect(saveFailureMessage('too-large')).toContain('۱٫۵')
        expect(saveFailureMessage('quota')).toContain('خروجی')
        expect(saveFailureMessage('unavailable')).toContain('خروجی')
    })
})

describe('history limit preference', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createMemoryStorage())
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('defaults history limit to 10 and clamps invalid values', () => {
        expect(loadHistoryLimit()).toBe(DEFAULT_HISTORY_LIMIT)
        expect(normalizeHistoryLimit(0)).toBe(1)
        expect(normalizeHistoryLimit(99999)).toBe(MAX_HISTORY_LIMIT)
        expect(saveHistoryLimit(25)).toBe(25)
        expect(loadHistoryLimit()).toBe(25)
        expect(saveHistoryLimit(1000)).toBe(1000)
    })
})

describe('loadContentDetailed / truncateToByteLimit', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createMemoryStorage())
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('truncates oversized stored content and reports truncated', () => {
        const huge = 'ا'.repeat(MAX_CONTENT_BYTES + 50)
        localStorage.setItem(CONTENT_KEY, huge)
        const result = loadContentDetailed()
        expect(result.truncated).toBe(true)
        expect(contentByteSize(result.text)).toBeLessThanOrEqual(MAX_CONTENT_BYTES)
        expect(contentByteSize(localStorage.getItem(CONTENT_KEY) || '')).toBeLessThanOrEqual(MAX_CONTENT_BYTES)
    })

    it('truncateToByteLimit respects UTF-8 boundaries', () => {
        const text = 'سلام دنیا'
        const limited = truncateToByteLimit(text, 5)
        expect(contentByteSize(limited)).toBeLessThanOrEqual(5)
        expect(() => limited).not.toThrow()
    })
})

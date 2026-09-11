import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {HISTORY_KEY, saveHistoryLimit} from './storageUtils'
import {
    clearHistory,
    HISTORY_COALESCE_MS,
    loadHistory,
    pushHistory,
    resetHistoryMigrationForTests,
    resetHistoryStoreForTests,
    setHistoryLimitAndTrim,
} from './historyStore'

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

describe('historyStore', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', createMemoryStorage())
        resetHistoryStoreForTests()
        saveHistoryLimit(10)
    })

    afterEach(() => {
        resetHistoryStoreForTests()
        vi.unstubAllGlobals()
        vi.useRealTimers()
    })

    it('defaults to empty history and skips blanks', async () => {
        expect(await loadHistory()).toEqual([])
        expect((await pushHistory('')).entries).toEqual([])
    })

    it('pushes newest-first, dedupes identical content, and respects limit', async () => {
        await pushHistory('اول', {limit: 2, force: true})
        await pushHistory('اول', {limit: 2, force: true})
        await pushHistory('دوم', {limit: 2, force: true})
        await pushHistory('سوم', {limit: 2, force: true})
        const entries = await loadHistory()
        expect(entries.map((e) => e.text)).toEqual(['سوم', 'دوم'])
        expect(entries).toHaveLength(2)
    })

    it('coalesces rapid non-forced revisions', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
        await pushHistory('a', {force: true})
        await pushHistory('b', {force: false})
        expect((await loadHistory()).map((e) => e.text)).toEqual(['a'])

        vi.setSystemTime(Date.now() + HISTORY_COALESCE_MS + 1)
        await pushHistory('b', {force: false})
        expect((await loadHistory()).map((e) => e.text)).toEqual(['b', 'a'])
    })

    it('force push always creates a recovery point', async () => {
        await pushHistory('قبل از جایگذاری', {force: true})
        await pushHistory('بعد از جایگذاری', {force: true})
        expect((await loadHistory()).map((e) => e.text)).toEqual([
            'بعد از جایگذاری',
            'قبل از جایگذاری',
        ])
    })

    it('trims oldest when the limit shrinks and grows when it increases', async () => {
        for (const text of ['a', 'b', 'c']) {
            await pushHistory(text, {limit: 5, force: true})
        }
        const shrunk = await setHistoryLimitAndTrim(1)
        expect(shrunk.limit).toBe(1)
        expect(shrunk.entries).toHaveLength(1)
        expect(shrunk.entries[0].text).toBe('c')

        const grown = await setHistoryLimitAndTrim(100)
        expect(grown.limit).toBe(100)
        expect(grown.entries).toHaveLength(1)
        await pushHistory('d', {limit: 100, force: true})
        expect((await loadHistory()).map((e) => e.text)).toEqual(['d', 'c'])
    })

    it('clears history without throwing', async () => {
        await pushHistory('x', {force: true})
        expect((await clearHistory()).entries).toEqual([])
        expect(await loadHistory()).toEqual([])
    })

    it('migrates legacy localStorage history into the store', async () => {
        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify([{id: 'legacy-1', text: 'از localStorage', savedAt: 1}]),
        )
        resetHistoryStoreForTests()
        const entries = await loadHistory()
        expect(entries.map((e) => e.text)).toEqual(['از localStorage'])
        expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
    })

    it('handles 10/100/500 revision counts without pathological slowdown', async () => {
        saveHistoryLimit(1000)
        for (const count of [10, 100, 500]) {
            await clearHistory()
            const started = performance.now()
            for (let i = 0; i < count; i++) {
                await pushHistory(`doc-${count}-${i}-${'متن '.repeat(10)}`, {
                    limit: 1000,
                    force: true,
                })
            }
            const afterWrite = performance.now()
            const loaded = await loadHistory()
            const afterLoad = performance.now()
            expect(loaded.length).toBe(count)
            expect(afterWrite - started).toBeLessThan(count * 20 + 3_000)
            expect(afterLoad - afterWrite).toBeLessThan(2_000)
        }

        const trimmed = await setHistoryLimitAndTrim(10)
        expect(trimmed.entries).toHaveLength(10)
    })

    it('survives corrupted legacy payloads', async () => {
        localStorage.setItem(HISTORY_KEY, '{not-json')
        resetHistoryStoreForTests()
        expect(await loadHistory()).toEqual([])
    })

    it('does not replace existing revisions with legacy localStorage', async () => {
        await pushHistory('موجود', {force: true})
        localStorage.setItem(
            HISTORY_KEY,
            JSON.stringify([{id: 'legacy-2', text: 'نباید جایگزین شود', savedAt: 2}]),
        )
        resetHistoryMigrationForTests()
        const entries = await loadHistory()
        expect(entries.map((e) => e.text)).toEqual(['موجود'])
        expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
    })

    it('falls back to memory when IndexedDB is missing', async () => {
        resetHistoryStoreForTests()
        vi.stubGlobal('indexedDB', undefined)
        const result = await pushHistory('حافظه', {force: true})
        expect(result.ok).toBe(true)
        expect(result.entries.map((e) => e.text)).toEqual(['حافظه'])
        expect((await loadHistory()).map((e) => e.text)).toEqual(['حافظه'])
    })

    it('ignores blank legacy rows and empty legacy arrays', async () => {
        localStorage.setItem(HISTORY_KEY, JSON.stringify([{id: 1}, null, 'x']))
        resetHistoryStoreForTests()
        expect(await loadHistory()).toEqual([])
        expect(localStorage.getItem(HISTORY_KEY)).toBeNull()

        localStorage.setItem(HISTORY_KEY, '[]')
        resetHistoryStoreForTests()
        expect(await loadHistory()).toEqual([])
        expect(localStorage.getItem(HISTORY_KEY)).toBeNull()
    })
})

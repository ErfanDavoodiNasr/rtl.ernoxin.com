/**
 * Local version history in IndexedDB (async, non-blocking).
 * Limit preference stays in localStorage via storageUtils.
 */
import {
    HISTORY_KEY,
    type HistoryEntry,
    isQuotaExceededError,
    loadHistoryLimit,
    normalizeHistoryLimit,
    saveHistoryLimit,
} from './storageUtils'

export const HISTORY_DB_NAME = 'arnooxine-history'
export const HISTORY_DB_VERSION = 1
export const HISTORY_STORE = 'revisions'
/** Typing/autosave within this window coalesces into one revision. */
export const HISTORY_COALESCE_MS = 20_000

export type HistoryPushOptions = {
    limit?: number
    /** Bypass coalesce window (paste, clear, restore, import). */
    force?: boolean
}

export type HistoryWriteResult = {
    entries: HistoryEntry[]
    ok: boolean
    reason?: 'quota' | 'unavailable'
}

type RevisionRow = HistoryEntry & { hash: string }

let dbPromise: Promise<IDBDatabase> | null = null
let memoryFallback: RevisionRow[] | null = null
let migrateOnce: Promise<void> | null = null

function simpleHash(text: string): string {
    // ponytail: FNV-1a 32-bit is enough for duplicate detection; upgrade if collisions matter
    let h = 0x811c9dc5
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i)
        h = Math.imul(h, 0x01000193)
    }
    return (h >>> 0).toString(16)
}

function openDb(): Promise<IDBDatabase> {
    if (memoryFallback) {
        return Promise.reject(new Error('idb-unavailable'))
    }
    if (dbPromise) return dbPromise
    if (typeof indexedDB === 'undefined') {
        memoryFallback = []
        return Promise.reject(new Error('idb-unavailable'))
    }

    dbPromise = new Promise((resolve, reject) => {
        let req: IDBOpenDBRequest
        try {
            req = indexedDB.open(HISTORY_DB_NAME, HISTORY_DB_VERSION)
        } catch (err) {
            memoryFallback = []
            reject(err)
            return
        }
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(HISTORY_STORE)) {
                const store = db.createObjectStore(HISTORY_STORE, {keyPath: 'id'})
                store.createIndex('savedAt', 'savedAt', {unique: false})
                store.createIndex('hash', 'hash', {unique: false})
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => {
            memoryFallback = []
            reject(req.error ?? new Error('idb-open-failed'))
        }
    })

    return dbPromise
}

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error('idb-request-failed'))
    })
}

function sortNewest(entries: RevisionRow[]): RevisionRow[] {
    return [...entries].sort((a, b) => b.savedAt - a.savedAt || b.id.localeCompare(a.id))
}

function toPublic(rows: RevisionRow[]): HistoryEntry[] {
    return sortNewest(rows).map(({id, text, savedAt}) => ({id, text, savedAt}))
}

async function readAllRows(): Promise<RevisionRow[]> {
    if (memoryFallback) return [...memoryFallback]

    try {
        const db = await openDb()
        const tx = db.transaction(HISTORY_STORE, 'readonly')
        const store = tx.objectStore(HISTORY_STORE)
        const rows = await idbRequest(store.getAll() as IDBRequest<RevisionRow[]>)
        return Array.isArray(rows) ? rows : []
    } catch {
        if (!memoryFallback) memoryFallback = []
        return [...memoryFallback]
    }
}

async function replaceAllRows(rows: RevisionRow[]): Promise<HistoryWriteResult> {
    let limited = sortNewest(rows)

    const writeMemory = (next: RevisionRow[]): HistoryWriteResult => {
        memoryFallback = next
        return {entries: toPublic(next), ok: true}
    }

    if (memoryFallback) return writeMemory(limited)

    const attemptWrite = async (next: RevisionRow[]): Promise<void> => {
        const db = await openDb()
        const tx = db.transaction(HISTORY_STORE, 'readwrite')
        const store = tx.objectStore(HISTORY_STORE)
        store.clear()
        for (const row of next) store.put(row)
        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error ?? new Error('idb-tx-failed'))
            tx.onabort = () => reject(tx.error ?? new Error('idb-tx-aborted'))
        })
    }

    try {
        await attemptWrite(limited)
        return {entries: toPublic(limited), ok: true}
    } catch (err) {
        if (isQuotaExceededError(err)) {
            while (limited.length > 0) {
                limited = limited.slice(0, -1)
                try {
                    await attemptWrite(limited)
                    return {entries: toPublic(limited), ok: true}
                } catch (inner) {
                    if (!isQuotaExceededError(inner)) break
                }
            }
            return {entries: [], ok: false, reason: 'quota'}
        }
        return writeMemory(limited)
    }
}

async function ensureMigrated(): Promise<void> {
    if (migrateOnce) return migrateOnce
    migrateOnce = (async () => {
        try {
            const raw = localStorage.getItem(HISTORY_KEY)
            if (!raw) return
            const parsed = JSON.parse(raw) as unknown
            if (!Array.isArray(parsed) || parsed.length === 0) {
                localStorage.removeItem(HISTORY_KEY)
                return
            }
            const existing = await readAllRows()
            if (existing.length > 0) {
                localStorage.removeItem(HISTORY_KEY)
                return
            }
            const rows: RevisionRow[] = []
            for (const item of parsed) {
                if (!item || typeof item !== 'object') continue
                const e = item as Partial<HistoryEntry>
                if (typeof e.id !== 'string' || typeof e.text !== 'string' || typeof e.savedAt !== 'number') {
                    continue
                }
                rows.push({id: e.id, text: e.text, savedAt: e.savedAt, hash: simpleHash(e.text)})
            }
            if (rows.length) await replaceAllRows(rows)
            localStorage.removeItem(HISTORY_KEY)
        } catch {
            // ignore migration failures; keep editor working
        }
    })()
    return migrateOnce
}

export async function loadHistory(): Promise<HistoryEntry[]> {
    await ensureMigrated()
    const limit = loadHistoryLimit()
    const rows = await readAllRows()
    return toPublic(rows).slice(0, limit)
}

export async function pushHistory(
    text: string,
    options: HistoryPushOptions = {},
): Promise<HistoryWriteResult> {
    await ensureMigrated()
    const limit = normalizeHistoryLimit(options.limit ?? loadHistoryLimit())
    if (!text.trim()) {
        const entries = (await loadHistory()).slice(0, limit)
        return {entries, ok: true}
    }

    const rows = sortNewest(await readAllRows())
    const hash = simpleHash(text)
    if (rows[0]?.hash === hash || rows[0]?.text === text) {
        return {entries: toPublic(rows).slice(0, limit), ok: true}
    }

    const now = Date.now()
    if (!options.force && rows[0] && now - rows[0].savedAt < HISTORY_COALESCE_MS) {
        return {entries: toPublic(rows).slice(0, limit), ok: true}
    }

    const savedAt = Math.max(now, (rows[0]?.savedAt ?? 0) + 1)
    const entry: RevisionRow = {
        id: `${savedAt}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        savedAt,
        hash,
    }
    return replaceAllRows([entry, ...rows].slice(0, limit))
}

export async function setHistoryLimitAndTrim(
    limit: number,
): Promise<{ limit: number; entries: HistoryEntry[]; ok: boolean }> {
    const nextLimit = saveHistoryLimit(limit)
    await ensureMigrated()
    const rows = sortNewest(await readAllRows()).slice(0, nextLimit)
    const result = await replaceAllRows(rows)
    return {limit: nextLimit, entries: result.entries, ok: result.ok}
}

export async function clearHistory(): Promise<HistoryWriteResult> {
    await ensureMigrated()
    return replaceAllRows([])
}

/** Test helper: wipe module state so the next open is fresh. */
export function resetHistoryStoreForTests(): void {
    dbPromise = null
    memoryFallback = null
    migrateOnce = null
}

/** Test helper: allow ensureMigrated to run again without wiping stored rows. */
export function resetHistoryMigrationForTests(): void {
    migrateOnce = null
}

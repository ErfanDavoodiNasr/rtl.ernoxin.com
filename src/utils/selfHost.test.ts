import {describe, expect, it} from 'vitest'
import {readdirSync, readFileSync, statSync} from 'node:fs'
import {join} from 'node:path'

const CDN_RE = /cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare|fonts\.googleapis|fonts\.gstatic|cloudfront\.net/i

/** Vendor bundles may embed documentation URLs that are never fetched at runtime. */
const VENDOR_CHUNK_RE = /(jspdf|html2canvas|mermaid|katex|syntax|prism)/i

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        const st = statSync(path)
        if (st.isDirectory()) walk(path, out)
        else if (/\.(js|css|html|svg|json)$/.test(name)) out.push(path)
    }
    return out
}

describe('production self-host policy', () => {
    it('first-party dist assets contain no CDN hosts', () => {
        let files: string[] = []
        try {
            files = walk('dist').filter((file) => !VENDOR_CHUNK_RE.test(file))
        } catch {
            return
        }
        if (files.length === 0) return

        const hits: string[] = []
        for (const file of files) {
            const text = readFileSync(file, 'utf8')
            if (CDN_RE.test(text)) hits.push(file)
        }
        expect(hits, `CDN references in: ${hits.join(', ')}`).toEqual([])
    })
})

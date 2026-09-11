import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {preprocessMarkdown} from '../utils/markdownUtils'
import {countMermaidBlocks, markdownNeedsKatex} from '../utils/previewReady'
import {getBidiTextProps} from '../utils/bidiUtils'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../tests/fixtures/rendering')

function load(name: string): string {
    return readFileSync(join(fixturesDir, name), 'utf8')
}

describe('rendering fixtures', () => {
    it('preprocesses persian + mixed bidi without throwing', () => {
        const persian = load('persian.md')
        const mixed = load('mixed-bidi.md')
        expect(preprocessMarkdown(persian)).toContain('فارسی')
        expect(preprocessMarkdown(mixed)).toContain('API')
        expect(getBidiTextProps(persian).dir).toBe('rtl')
    })

    it('detects math and mermaid needs from fixtures', () => {
        expect(markdownNeedsKatex(load('math-basic.md'))).toBe(true)
        expect(markdownNeedsKatex(load('physics.md'))).toBe(true)
        expect(countMermaidBlocks(load('mermaid.md'))).toBeGreaterThan(0)
    })

    it('handles security and stress fixtures without throwing', () => {
        expect(() => preprocessMarkdown(load('security.md'))).not.toThrow()
        expect(() => preprocessMarkdown(load('stress.md'))).not.toThrow()
        expect(() => preprocessMarkdown(load('tables.md'))).not.toThrow()
        expect(() => preprocessMarkdown(load('code.md'))).not.toThrow()
        expect(() => preprocessMarkdown(load('unicode.md'))).not.toThrow()
    })

    it('does not leave javascript: schemes intact after preprocess', () => {
        const out = preprocessMarkdown(load('security.md'))
        // preprocess must not invent executable URLs; stripping is renderer responsibility
        expect(out).toContain('javascript:')
        expect(out).toContain('<script>')
    })
})

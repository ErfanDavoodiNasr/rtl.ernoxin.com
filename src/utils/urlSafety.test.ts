import {describe, expect, it} from 'vitest'
import {isExternalHttpUrl, safeMarkdownUrl} from './urlSafety'

describe('safeMarkdownUrl', () => {
    it('keeps http(s), mailto, and fragment links', () => {
        expect(safeMarkdownUrl('https://example.com')).toBe('https://example.com')
        expect(safeMarkdownUrl('mailto:a@b.com')).toBe('mailto:a@b.com')
        expect(safeMarkdownUrl('#section')).toBe('#section')
        expect(safeMarkdownUrl('/docs')).toBe('/docs')
    })

    it('strips scriptable protocols', () => {
        expect(safeMarkdownUrl('javascript:alert(1)')).toBe('')
        expect(safeMarkdownUrl(' data:text/html,x')).toBe('')
        expect(safeMarkdownUrl('vbscript:msgbox(1)')).toBe('')
        expect(safeMarkdownUrl('java\nscript:alert(1)')).toBe('')
        expect(safeMarkdownUrl('java\tscript:alert(1)')).toBe('')
    })
})

describe('isExternalHttpUrl', () => {
    it('detects only absolute http(s) links', () => {
        expect(isExternalHttpUrl('https://x.com')).toBe(true)
        expect(isExternalHttpUrl('#x')).toBe(false)
        expect(isExternalHttpUrl('mailto:a@b.com')).toBe(false)
    })
})

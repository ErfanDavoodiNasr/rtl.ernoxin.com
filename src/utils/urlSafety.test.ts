import {describe, expect, it} from 'vitest'
import {isExternalHttpUrl, safeMarkdownUrl} from './urlSafety'

describe('safeMarkdownUrl', () => {
    it('keeps http(s), mailto, and fragment links', () => {
        expect(safeMarkdownUrl('https://example.com')).toBe('https://example.com')
        expect(safeMarkdownUrl('mailto:a@b.com')).toBe('mailto:a@b.com')
        expect(safeMarkdownUrl('#section')).toBe('#section')
        expect(safeMarkdownUrl('/docs')).toBe('/docs')
        expect(safeMarkdownUrl('./rel')).toBe('./rel')
        expect(safeMarkdownUrl('../up')).toBe('../up')
    })

    it('strips scriptable protocols', () => {
        expect(safeMarkdownUrl('javascript:alert(1)')).toBe('')
        expect(safeMarkdownUrl(' data:text/html,x')).toBe('')
        expect(safeMarkdownUrl('vbscript:msgbox(1)')).toBe('')
        expect(safeMarkdownUrl('java\nscript:alert(1)')).toBe('')
        expect(safeMarkdownUrl('java\tscript:alert(1)')).toBe('')
        expect(safeMarkdownUrl('file:///etc/passwd')).toBe('')
        expect(safeMarkdownUrl('blob:https://x/y')).toBe('')
    })

    it('keeps spaced relative paths while rejecting protocol-relative hosts', () => {
        expect(safeMarkdownUrl('./my file.md')).toBe('./my file.md')
        expect(safeMarkdownUrl('//evil.example/phish')).toBe('')
        expect(safeMarkdownUrl(' //evil.example/x')).toBe('')
        expect(safeMarkdownUrl('/\n/evil.example')).toBe('')
    })
})

describe('isExternalHttpUrl', () => {
    it('detects absolute http(s) and protocol-relative links', () => {
        expect(isExternalHttpUrl('https://x.com')).toBe(true)
        expect(isExternalHttpUrl('//evil.example')).toBe(true)
        expect(isExternalHttpUrl('#x')).toBe(false)
        expect(isExternalHttpUrl('mailto:a@b.com')).toBe(false)
        expect(isExternalHttpUrl('/docs')).toBe(false)
    })
})

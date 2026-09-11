import {describe, expect, it} from 'vitest'
import {sanitizeSvg} from './svgSanitize'

describe('sanitizeSvg', () => {
    it('removes scripts, foreignObject, and javascript hrefs', () => {
        const cleaned = sanitizeSvg([
            '<svg xmlns="http://www.w3.org/2000/svg">',
            '<script>alert(1)</script>',
            '<a href="javascript:alert(1)"><rect width="10" height="10"></rect></a>',
            '<foreignObject><div onclick="alert(1)">x</div></foreignObject>',
            '<circle cx="1" cy="1" r="1"></circle>',
            '</svg>',
        ].join(''))

        expect(cleaned.toLowerCase()).not.toContain('<script')
        expect(cleaned.toLowerCase()).not.toContain('javascript:')
        expect(cleaned.toLowerCase()).not.toContain('foreignobject')
        expect(cleaned.toLowerCase()).not.toContain('onclick')
        expect(cleaned).toContain('<circle')
        expect(cleaned).toContain('<rect')
    })

    it('keeps gradient/marker url() styles used by Mermaid', () => {
        const cleaned = sanitizeSvg([
            '<svg xmlns="http://www.w3.org/2000/svg">',
            '<path style="fill:url(#grad);stroke:url(#marker)" d="M0 0"/>',
            '<path style="fill:expression(alert(1))" d="M0 0"/>',
            '</svg>',
        ].join(''))

        expect(cleaned).toContain('fill:url(#grad)')
        expect(cleaned).toContain('stroke:url(#marker)')
        expect(cleaned.toLowerCase()).not.toContain('expression(')
    })

    it('strips external hrefs, animate, and use elements', () => {
        const cleaned = sanitizeSvg([
            '<svg xmlns="http://www.w3.org/2000/svg">',
            '<a href="https://evil.example"><rect width="10" height="10"></rect></a>',
            '<a href="#local"><circle cx="1" cy="1" r="1"></circle></a>',
            '<use href="https://evil.example/x.svg#g"></use>',
            '<animate attributeName="x" from="0" to="10"></animate>',
            '<path style="fill:url(https://evil.example/x)" d="M0 0"/>',
            '</svg>',
        ].join(''))

        expect(cleaned.toLowerCase()).not.toContain('https://evil.example')
        expect(cleaned.toLowerCase()).not.toContain('<use')
        expect(cleaned.toLowerCase()).not.toContain('<animate')
        expect(cleaned).toContain('href="#local"')
        expect(cleaned).toContain('<circle')
        expect(cleaned.toLowerCase()).not.toContain('url(https://')
    })
})

import {describe, expect, it} from 'vitest'
import {decodeCssEscapes, styleLooksSafe} from './styleSafety'

describe('decodeCssEscapes', () => {
    it('decodes hex escapes used to smuggle schemes', () => {
        expect(decodeCssEscapes('\\68ttps://evil.com')).toBe('https://evil.com')
        expect(decodeCssEscapes('\\75rl(https://x)')).toBe('url(https://x)')
    })
})

describe('styleLooksSafe', () => {
    it('allows KaTeX-like positioning and fragment paint servers', () => {
        expect(styleLooksSafe('margin-right:0.2778em;top:-0.1em')).toBe(true)
        expect(styleLooksSafe('fill:url(#grad);stroke:url(#marker)')).toBe(true)
    })

    it('rejects javascript, expression, and @import', () => {
        expect(styleLooksSafe('background:javascript:alert(1)')).toBe(false)
        expect(styleLooksSafe('width:expression(alert(1))')).toBe(false)
        expect(styleLooksSafe('@import url(https://evil.com/x.css)')).toBe(false)
    })

    it('rejects network and data paint servers including CSS escapes', () => {
        expect(styleLooksSafe('background-image:url(https://evil.example/pixel.gif)')).toBe(false)
        expect(styleLooksSafe('fill:url(data:image/svg+xml;base64,AAAA)')).toBe(false)
        expect(styleLooksSafe('fill:url(\\68ttps://evil.com/x)')).toBe(false)
        expect(styleLooksSafe('fill:\\75rl(https://evil.com/x)')).toBe(false)
        expect(styleLooksSafe('fill:url( url(https://evil.com) )')).toBe(false)
    })
})

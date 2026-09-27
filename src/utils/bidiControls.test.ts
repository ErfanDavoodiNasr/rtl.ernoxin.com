import {describe, expect, it} from 'vitest'
import {containsBidiControls, visualizeBidiControls} from './bidiControls'

describe('bidiControls', () => {
    it('detects Trojan Source control characters', () => {
        expect(containsBidiControls('safe code')).toBe(false)
        expect(containsBidiControls('if (access\u202E) {')).toBe(true)
        expect(containsBidiControls('x\u200F y')).toBe(true)
    })

    it('visualizes without silently dropping text', () => {
        const raw = 'admin\u202Ecod /*'
        const shown = visualizeBidiControls(raw)
        expect(shown).toContain('⟦RLO⟧')
        expect(shown).toContain('admin')
        expect(shown).not.toContain('\u202E')
    })
})

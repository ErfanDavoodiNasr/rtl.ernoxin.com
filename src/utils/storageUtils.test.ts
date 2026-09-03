import {describe, expect, it} from 'vitest'
import {DEFAULT_READER_SETTINGS, parseReaderSettings,} from './storageUtils'

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

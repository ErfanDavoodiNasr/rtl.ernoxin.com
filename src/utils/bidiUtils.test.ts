import {describe, expect, it} from 'vitest'
import {
    countDirectionalLetters,
    detectTextDirection,
    getBidiTextProps,
    getFirstStrongDirection,
    isArabicText,
    isPureEnglish,
} from './bidiUtils'

describe('countDirectionalLetters', () => {
    it('counts Latin and RTL letters separately', () => {
        expect(countDirectionalLetters('Hello سلام')).toEqual({ltr: 5, rtl: 4})
        expect(countDirectionalLetters('123 !!!')).toEqual({ltr: 0, rtl: 0})
    })
})

describe('getFirstStrongDirection', () => {
    it('detects first strong char', () => {
        expect(getFirstStrongDirection('Note: فارسی')).toBe('ltr')
        expect(getFirstStrongDirection('سلام friends')).toBe('rtl')
        expect(getFirstStrongDirection('123')).toBeNull()
    })
})

describe('detectTextDirection — screenshot regression cases', () => {
    it('Note: فارسی… → rtl (English start, Persian body)', () => {
        expect(
            detectTextDirection(
                'Note: این پاراگراف با انگلیسی شروع می‌شود ولی باید راست‌چین بماند',
            ),
        ).toBe('rtl')
    })

    it('pure English list item → ltr', () => {
        expect(
            detectTextDirection(
                'Hello world this is a long English-only paragraph that should clearly go left-to-right without Persian influence.',
            ),
        ).toBe('ltr')
    })

    it('سلام دوستان، please check… → rtl (starts Persian; bullet must stay RTL)', () => {
        expect(
            detectTextDirection('سلام دوستان، please check the config file carefully before deploy.'),
        ).toBe('rtl')
    })

    it('The Persian word سلام means… → ltr (no visual reorder of English)', () => {
        expect(
            detectTextDirection(
                'The Persian word سلام means hello in everyday English conversation and documentation examples.',
            ),
        ).toBe('ltr')
    })

    it('نکته مهم: remember this… → rtl', () => {
        expect(detectTextDirection('نکته مهم: remember this — اگر کلمات فارسی هنوز قابل‌توجه باشند')).toBe(
            'rtl',
        )
    })

    it('Persian label + chemistry/math stays rtl', () => {
        expect(detectTextDirection('واکنش: $\\ce{CH4 + 2O2 -> CO2 + 2H2O}$')).toBe('rtl')
        expect(detectTextDirection('طبق قانون نیوتن: $F = ma$')).toBe('rtl')
        expect(detectTextDirection('آب: $\\ce{H2O}$')).toBe('rtl')
    })
})

describe('detectTextDirection — core rules', () => {
    it('pure Persian → rtl', () => {
        expect(detectTextDirection('سلام دنیا')).toBe('rtl')
    })

    it('pure English → ltr', () => {
        expect(detectTextDirection('Hello world')).toBe('ltr')
        expect(detectTextDirection('API endpoint configuration')).toBe('ltr')
    })

    it('digits alone → rtl default', () => {
        expect(detectTextDirection('123')).toBe('rtl')
        expect(detectTextDirection('')).toBe('rtl')
    })

    it('Arabic → rtl', () => {
        expect(detectTextDirection('بسم الله الرحمن الرحيم')).toBe('rtl')
    })

    it('starts Persian with overwhelming English (≥4×) can flip to ltr', () => {
        expect(
            detectTextDirection(
                'سلام one two three four five six seven eight nine ten eleven twelve',
            ),
        ).toBe('ltr')
    })

    it('Hi سلام / Test تست stay rtl (balanced mixed)', () => {
        expect(detectTextDirection('Hi سلام')).toBe('rtl')
        expect(detectTextDirection('Test تست')).toBe('rtl')
    })
})

describe('isPureEnglish / isArabicText', () => {
    it('isPureEnglish', () => {
        expect(isPureEnglish('Hello world')).toBe(true)
        expect(isPureEnglish('Hello سلام')).toBe(false)
        expect(isPureEnglish('')).toBe(false)
    })

    it('isArabicText', () => {
        expect(isArabicText('المدرسة')).toBe(true)
        expect(isArabicText('این گزینه است')).toBe(false)
        expect(isArabicText('Hello')).toBe(false)
    })
})

describe('getBidiTextProps', () => {
    it('pure English gets ltr + english font', () => {
        const props = getBidiTextProps('Hello world')
        expect(props.dir).toBe('ltr')
        expect(props.className).toContain('bidi-ltr')
        expect(props.className).toContain('is-english')
    })

    it('Persian gets rtl', () => {
        const props = getBidiTextProps('سلام دنیا')
        expect(props.dir).toBe('rtl')
        expect(props.className ?? '').not.toContain('bidi-ltr')
    })

    it('screenshot: English-start Persian body → rtl', () => {
        expect(getBidiTextProps('Note: این متن باید راست‌چین باشد').dir).toBe('rtl')
    })

    it('screenshot: Persian-start English tail → rtl', () => {
        expect(
            getBidiTextProps('سلام دوستان، please check the config file carefully before deploy.')
                .dir,
        ).toBe('rtl')
    })

    it('screenshot: English sentence with one Persian word → ltr', () => {
        expect(
            getBidiTextProps(
                'The Persian word سلام means hello in everyday English conversation and documentation examples.',
            ).dir,
        ).toBe('ltr')
    })
})

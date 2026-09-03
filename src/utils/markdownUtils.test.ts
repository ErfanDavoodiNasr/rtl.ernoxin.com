import {describe, expect, it} from 'vitest'
import {preprocessMarkdown} from './markdownUtils'

describe('preprocessMarkdown — basics', () => {
    it('returns empty string for empty input', () => {
        expect(preprocessMarkdown('')).toBe('')
        expect(preprocessMarkdown('   ')).toBe('   ')
    })

    it('leaves normal Persian prose untouched', () => {
        const input = 'سلام دنیا\n\nاین یک پاراگراف است.'
        expect(preprocessMarkdown(input)).toBe(input)
    })
})

describe('preprocessMarkdown — ASCII / ChatGPT tables', () => {
    it('converts ASCII box tables to markdown tables', () => {
        const input = [
            '+------+------+',
            '| نام  | سن   |',
            '+------+------+',
            '| علی  | ۲۵   |',
            '+------+------+',
        ].join('\n')

        const result = preprocessMarkdown(input)
        expect(result).toContain('| نام  | سن   |')
        expect(result).toContain('|---|')
        expect(result).toContain('| علی  | ۲۵   |')
        expect(result).not.toContain('+------')
    })

    it('does not convert tables inside code blocks', () => {
        const input = '```\n| a | b |\n|---|---|\n```'
        expect(preprocessMarkdown(input)).toBe(input)
    })

    it('adds blank line before GFM table glued to previous text', () => {
        const input = ['متن قبلی', '| a | b |', '|---|---|', '| 1 | 2 |'].join('\n')
        const result = preprocessMarkdown(input)
        expect(result).toContain('متن قبلی\n\n| a | b |')
    })

    it('handles multi-column ChatGPT comparison tables', () => {
        const input = [
            '+----------+----------+----------+',
            '| ویژگی   | گزینه A  | گزینه B  |',
            '+----------+----------+----------+',
            '| سرعت    | بالا     | متوسط    |',
            '| هزینه   | زیاد     | کم       |',
            '+----------+----------+----------+',
        ].join('\n')
        const result = preprocessMarkdown(input)
        expect(result.split('\n').filter((l) => l.startsWith('|')).length).toBeGreaterThanOrEqual(4)
        expect(result).toContain('ویژگی')
        expect(result).toContain('سرعت')
    })
})

describe('preprocessMarkdown — math / physics / chemistry', () => {
    it('converts \\(...\\) to inline math', () => {
        expect(preprocessMarkdown(String.raw`\(x^2\)`)).toBe('$x^2$')
    })

    it('converts \\[...\\] to display math', () => {
        expect(preprocessMarkdown(String.raw`\[E=mc^2\]`)).toBe('$$E=mc^2$$')
    })

    it('wraps bare align environments in $$', () => {
        const input = String.raw`\begin{align} a &= b \\ c &= d \end{align}`
        const result = preprocessMarkdown(input)
        expect(result).toContain('$$')
        expect(result).toContain('\\begin{align}')
    })

    it('wraps bare \\ce{...} chemistry macros in inline math', () => {
        expect(preprocessMarkdown(String.raw`واکنش \ce{H2O} آب است`)).toBe(
            'واکنش $\\ce{H2O}$ آب است',
        )
        expect(preprocessMarkdown(String.raw`\ce{2H2 + O2 -> 2H2O}`)).toBe(
            '$\\ce{2H2 + O2 -> 2H2O}$',
        )
    })

    it('does not double-wrap chemistry already in math', () => {
        expect(preprocessMarkdown(String.raw`$\ce{H2O}$`)).toBe('$\\ce{H2O}$')
    })

    it('converts ```math fences to $$ blocks', () => {
        const input = ['```math', 'E = mc^2', '```'].join('\n')
        const result = preprocessMarkdown(input)
        expect(result).toContain('$$')
        expect(result).toContain('E = mc^2')
        expect(result).not.toContain('```math')
    })

    it('converts ```latex and ```tex fences', () => {
        expect(preprocessMarkdown('```latex\n\\frac{a}{b}\n```')).toContain('\\frac{a}{b}')
        expect(preprocessMarkdown('```tex\nx^2\n```')).toContain('$$')
    })

    it('preserves mermaid and normal code fences', () => {
        const mermaid = ['```mermaid', 'graph TD', 'A-->B', '```'].join('\n')
        expect(preprocessMarkdown(mermaid)).toBe(mermaid)

        const js = ['```js', 'const x = 1', '```'].join('\n')
        expect(preprocessMarkdown(js)).toBe(js)
    })

    it('does not rewrite math delimiters inside code fences', () => {
        const input = ['```', String.raw`\(x\)`, '```'].join('\n')
        expect(preprocessMarkdown(input)).toBe(input)
    })

    it('handles physics-style display math mixed with Persian', () => {
        const input = String.raw`طبق قانون نیوتن داریم: \[ F = ma \]`
        const result = preprocessMarkdown(input)
        expect(result).toContain('$$ F = ma $$')
        expect(result).toContain('طبق قانون نیوتن')
    })
})

describe('preprocessMarkdown — realistic ChatGPT paste scenarios', () => {
    it('mixed heading, list, table, math, mermaid in one paste', () => {
        const input = [
            '# خلاصه',
            '',
            'Note: این راه‌حل پیشنهادی است.',
            '',
            '1. مرحله اول',
            '2. مرحله دوم با API',
            '',
            '| نام | مقدار |',
            '|-----|-------|',
            '| a   | 1     |',
            '',
            String.raw`فرمول: \( E = mc^2 \)`,
            '',
            '```mermaid',
            'flowchart LR',
            '  A[شروع] --> B[پایان]',
            '```',
            '',
            String.raw`شیمی: \ce{CO2}`,
        ].join('\n')

        const result = preprocessMarkdown(input)
        expect(result).toContain('$ E = mc^2 $')
        expect(result).toContain('$\\ce{CO2}$')
        expect(result).toContain('```mermaid')
        expect(result).toContain('| نام | مقدار |')
        expect(result).toContain('Note: این راه‌حل')
    })
})

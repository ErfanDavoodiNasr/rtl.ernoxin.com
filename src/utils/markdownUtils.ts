/**
 * Markdown preprocessing for AI chat output
 * (ChatGPT / Claude / DeepSeek / Cursor / Gemini).
 */

function preprocessAsciiTables(text: string): string {
    const lines = text.split('\n')
    const result: string[] = []
    let inTable = false
    let inCodeBlock = false
    let tableLines: string[] = []

    const isBorder = (line: string) => /(?=.*[-_])^[+\-_|\s=:]+$/.test(line.trim())
    const isData = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed.includes('|')) return false
        if (isBorder(line)) return false
        const pipes = (trimmed.match(/\|/g) || []).length
        return pipes >= 2 || (trimmed.startsWith('|') && trimmed.endsWith('|'))
    }

    const processTable = (block: string[]): string[] => {
        const dataLines = block.filter((line) => !isBorder(line))
        if (dataLines.length === 0) return block

        const borderLines = block.filter((line) => isBorder(line))
        const alignmentRow = borderLines.find((line) => line.includes(':'))

        const res: string[] = []
        let header = dataLines[0].trim()
        if (!header.startsWith('|')) header = '| ' + header
        if (!header.endsWith('|')) header = header + ' |'
        res.push(header)

        if (alignmentRow) {
            let sep = alignmentRow.trim().replace(/^\+/, '|').replace(/\+$/, '|').replace(/\+/g, '|')
            if (!sep.startsWith('|')) sep = '| ' + sep
            if (!sep.endsWith('|')) sep = sep + ' |'
            res.push(sep)
        } else {
            const colCount = (header.match(/\|/g) || []).length - 1
            const separator = '|' + Array(Math.max(1, colCount)).fill('---').join('|') + '|'
            res.push(separator)
        }

        for (let i = 1; i < dataLines.length; i++) {
            let row = dataLines[i].trim()
            if (!row.startsWith('|')) row = '| ' + row
            if (!row.endsWith('|')) row = row + ' |'
            res.push(row)
        }
        return res
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
            inCodeBlock = !inCodeBlock
            if (inTable) {
                result.push(...processTable(tableLines))
                tableLines = []
                inTable = false
            }
            result.push(line)
            continue
        }

        if (inCodeBlock) {
            result.push(line)
            continue
        }

        if (!inTable) {
            if (isBorder(line) && i + 1 < lines.length && isData(lines[i + 1])) {
                inTable = true
                tableLines.push(line)
            } else if (isData(line) && i + 1 < lines.length && isBorder(lines[i + 1])) {
                inTable = true
                tableLines.push(line)
            } else {
                result.push(line)
            }
        } else if (isBorder(line) || isData(line)) {
            tableLines.push(line)
        } else {
            result.push(...processTable(tableLines))
            tableLines = []
            inTable = false
            result.push(line)
        }
    }

    if (tableLines.length > 0) {
        result.push(...processTable(tableLines))
    }

    return result.join('\n')
}

function protectCodeBlocks(text: string): { text: string; blocks: string[] } {
    const blocks: string[] = []
    const protectedText = text.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
        blocks.push(match)
        return `\0CODE_BLOCK_${blocks.length - 1}\0`
    })
    return {text: protectedText, blocks}
}

function restoreCodeBlocks(text: string, blocks: string[]): string {
    return text.replace(/\0CODE_BLOCK_(\d+)\0/g, (_, index) => blocks[Number(index)] || '')
}

/** ```math / ```latex / ```tex → $$...$$ so KaTeX can render them. */
function preprocessMathFences(text: string): string {
    return text.replace(/```(?:math|latex|tex)\s*\n([\s\S]*?)```/gi, (_, body: string) => {
        const trimmed = body.replace(/^\n+|\n+$/g, '')
        return `\n$$\n${trimmed}\n$$\n`
    })
}

function preprocessMathDelimiters(text: string): string {
    let out = text

    // \[...\] → $$...$$  (display)
    out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, math: string) => `$$${math}$$`)

    // \(...\) → $...$  (inline)
    out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, math: string) => `$${math}$`)

    // Bare chemistry macros not already inside $...$
    out = out.replace(/(?<!\$)\\ce\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}(?!\$)/g, (_m, body: string) => `$\\ce{${body}}$`)

    // Bare LaTeX environments not already wrapped in $$
    const envNames = [
        'align',
        'align\\*',
        'equation',
        'equation\\*',
        'gather',
        'gather\\*',
        'multline',
        'multline\\*',
        'matrix',
        'pmatrix',
        'bmatrix',
        'vmatrix',
        'Vmatrix',
        'cases',
        'array',
        'chemical',
    ]
    const envRegex = new RegExp(
        `(?<!\\$)\\\\begin\\{(${envNames.join('|')})\\}[\\s\\S]*?\\\\end\\{\\1\\}(?!\\$)`,
        'g',
    )
    out = out.replace(envRegex, (match) => `\n$$\n${match}\n$$\n`)

    return out
}

/**
 * ChatGPT sometimes pastes GFM tables without a blank line before them,
 * which some parsers mishandle. Ensure a blank line before table headers.
 */
function ensureBlankLineBeforeTables(text: string): string {
    const lines = text.split('\n')
    const out: string[] = []
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const next = lines[i + 1]
        const looksLikeHeader = /^\|.+\|/.test(line.trim())
        const looksLikeSep = next !== undefined && /^\|?\s*:?-{3,}/.test(next.trim())
        if (
            looksLikeHeader &&
            looksLikeSep &&
            out.length > 0 &&
            out[out.length - 1].trim() !== '' &&
            !out[out.length - 1].trim().startsWith('|')
        ) {
            out.push('')
        }
        out.push(line)
    }
    return out.join('\n')
}

export function preprocessMarkdown(text: string): string {
    if (!text) return ''

    // Convert math/latex fences before protecting remaining code blocks
    const prepared = preprocessMathFences(text)
    const {text: withoutCode, blocks} = protectCodeBlocks(prepared)
    let processed = preprocessMathDelimiters(withoutCode)
    processed = preprocessAsciiTables(processed)
    processed = ensureBlankLineBeforeTables(processed)
    return restoreCodeBlocks(processed, blocks)
}

/**
 * Shared CSS style attribute checks for Mermaid SVG + HTML export.
 * Rejects network/data paint servers and CSS-escape protocol smuggling.
 */

/** Decode common CSS escapes so url(\68ttps://…) cannot bypass scheme checks. */
export function decodeCssEscapes(value: string): string {
    return value.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex: string) => {
        const code = Number.parseInt(hex, 16)
        if (!Number.isFinite(code) || code === 0) return ''
        try {
            return String.fromCodePoint(code)
        } catch {
            return ''
        }
    }).replace(/\\(.)/g, '$1')
}

function isSafePaintUrl(inner: string): boolean {
    const trimmed = decodeCssEscapes(inner).trim().replace(/^['"]|['"]$/g, '')
    if (!trimmed) return false
    // Fragment paint servers (gradients/markers) only.
    return trimmed.startsWith('#')
}

/**
 * True when a style attribute is safe to keep in Mermaid SVG / exported HTML.
 * Allows KaTeX positioning styles; blocks javascript:, expression(), @import, and non-fragment url().
 */
export function styleLooksSafe(style: string): boolean {
    const decoded = decodeCssEscapes(style)
    const lower = decoded.toLowerCase()
    if (
        lower.includes('javascript:') ||
        lower.includes('expression(') ||
        lower.includes('@import') ||
        lower.includes('behavior:') ||
        lower.includes('-moz-binding')
    ) {
        return false
    }

    // Match url(...) including nested / spaced forms after decode.
    const urls = lower.match(/url\s*\(([^)]*)\)/g) || []
    for (const raw of urls) {
        const inner = raw.replace(/^url\s*\(/i, '').replace(/\)$/, '')
        if (!isSafePaintUrl(inner)) return false
    }
    return true
}

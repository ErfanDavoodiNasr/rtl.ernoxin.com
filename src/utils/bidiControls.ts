/** Unicode bidirectional control characters that can visually disguise code (Trojan Source). */
const BIDI_CONTROL_RE =
    /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/

export function containsBidiControls(text: string): boolean {
    return BIDI_CONTROL_RE.test(text)
}

/**
 * Replace bidi controls with visible placeholders for safe visualization.
 * Does not mutate clipboard / source text — only display helpers.
 */
export function visualizeBidiControls(text: string): string {
    return text
        .replace(/\u202A/g, '⟦LRE⟧')
        .replace(/\u202B/g, '⟦RLE⟧')
        .replace(/\u202C/g, '⟦PDF⟧')
        .replace(/\u202D/g, '⟦LRO⟧')
        .replace(/\u202E/g, '⟦RLO⟧')
        .replace(/\u2066/g, '⟦LRI⟧')
        .replace(/\u2067/g, '⟦RLI⟧')
        .replace(/\u2068/g, '⟦FSI⟧')
        .replace(/\u2069/g, '⟦PDI⟧')
        .replace(/\u200E/g, '⟦LRM⟧')
        .replace(/\u200F/g, '⟦RLM⟧')
        .replace(/\u061C/g, '⟦ALM⟧')
}

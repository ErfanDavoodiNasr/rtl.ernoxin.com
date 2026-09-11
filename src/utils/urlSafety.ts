import {compactUrl} from './urlCompact'

/** Allow safe links, including in-page fragments, and drop scriptable URLs. */
export function safeMarkdownUrl(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (
        trimmed.startsWith('#') ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('./') ||
        trimmed.startsWith('../')
    ) {
        return trimmed
    }

    const compact = compactUrl(trimmed)
    const lower = compact.toLowerCase()
    if (
        lower.startsWith('javascript:') ||
        lower.startsWith('vbscript:') ||
        lower.startsWith('data:') ||
        lower.startsWith('blob:')
    ) {
        return ''
    }
    if (/^https?:/i.test(compact) || /^mailto:/i.test(compact)) return compact
    return ''
}

export function isExternalHttpUrl(value: string | undefined): boolean {
    return typeof value === 'string' && /^https?:/i.test(value)
}

import {compactUrl} from './urlCompact'

/**
 * Allow safe links (including in-page fragments) and drop scriptable / ambiguous URLs.
 * Protocol-relative `//host` is rejected: it is network-absolute and bypasses "local path" checks.
 */
export function safeMarkdownUrl(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return ''

    const compact = compactUrl(trimmed)
    if (!compact) return ''

    // Protocol-relative URLs are absolute network refs, not in-app paths.
    if (compact.startsWith('//')) return ''

    // Preserve original spacing for relative/fragment links; only use compact for checks.
    if (
        compact.startsWith('#') ||
        compact.startsWith('/') ||
        compact.startsWith('./') ||
        compact.startsWith('../')
    ) {
        // Still reject relatives that compact into protocol-relative form.
        if (compact.startsWith('//')) return ''
        return trimmed
    }

    const lower = compact.toLowerCase()
    if (
        lower.startsWith('javascript:') ||
        lower.startsWith('vbscript:') ||
        lower.startsWith('data:') ||
        lower.startsWith('blob:') ||
        lower.startsWith('file:')
    ) {
        return ''
    }
    if (/^https?:/i.test(compact) || /^mailto:/i.test(compact)) return compact
    return ''
}

export function isExternalHttpUrl(value: string | undefined): boolean {
    if (typeof value !== 'string' || !value) return false
    const compact = compactUrl(value.trim())
    return /^https?:/i.test(compact) || compact.startsWith('//')
}

/** Strip control chars and whitespace so scheme checks cannot be bypassed. */
export function compactUrl(value: string): string {
    let out = ''
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i)
        if (code > 0x20) out += value[i]
    }
    return out
}

/**
 * Read a local .md / .txt (or plain text) File into an editor string.
 * Rejects empty binary-looking blobs by requiring decodable UTF-8 text.
 */
async function readFileAsText(file: File): Promise<string> {
    if (typeof file.text === 'function') {
        return file.text()
    }
    // jsdom / older environments may lack File.text()
    if (typeof Response !== 'undefined') {
        return new Response(file).text()
    }
    return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error ?? new Error('read-failed'))
        reader.onload = () => resolve(String(reader.result ?? ''))
        reader.readAsText(file)
    })
}

export async function readTextFile(file: File): Promise<string> {
    const name = (file.name || '').toLowerCase()
    const type = (file.type || '').toLowerCase()
    const allowedExt = name.endsWith('.md') || name.endsWith('.txt') || name.endsWith('.markdown')
    const allowedType =
        type === '' ||
        type.startsWith('text/') ||
        type === 'application/markdown' ||
        type === 'application/octet-stream'

    if (!allowedExt && !allowedType) {
        throw new Error('unsupported-type')
    }

    // Soft cap aligned with MAX_CONTENT_BYTES (1.5MB) — callers still enforce.
    if (file.size > 2_000_000) {
        throw new Error('too-large')
    }

    const text = await readFileAsText(file)
    if (text.includes('\u0000')) {
        throw new Error('binary')
    }
    return text
}

export function isImportableFile(file: File | null | undefined): boolean {
    if (!file) return false
    const name = (file.name || '').toLowerCase()
    return (
        name.endsWith('.md') ||
        name.endsWith('.txt') ||
        name.endsWith('.markdown') ||
        (file.type || '').startsWith('text/')
    )
}

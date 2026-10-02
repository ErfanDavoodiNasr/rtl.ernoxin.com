export interface TextSelection {
    start: number
    end: number
}

export interface InsertResult {
    text: string
    cursor: number
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

/**
 * Insert clipboard text:
 * - with selection → replace selection (or insert at caret if collapsed)
 * - without a known selection (null) → replace the document with clipboard text
 */
export function insertClipboardText(
    current: string,
    clip: string,
    selection: TextSelection | null,
): InsertResult {
    if (!clip) {
        const cursor = selection
            ? clamp(selection.end, 0, current.length)
            : current.length
        return {text: current, cursor}
    }

    if (selection) {
        const start = clamp(selection.start, 0, current.length)
        const end = clamp(selection.end, start, current.length)
        const text = current.slice(0, start) + clip + current.slice(end)
        return {text, cursor: start + clip.length}
    }

    return {text: clip, cursor: clip.length}
}

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
 * Insert clipboard text like a normal editor:
 * - with selection → replace selection
 * - with caret → insert at caret
 * - without a known selection → insert at document end (caret at end), no forced newline
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

    const text = current + clip
    return {text, cursor: text.length}
}

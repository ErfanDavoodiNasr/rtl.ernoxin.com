/**
 * Bi-directional & language detection for a Persian-first viewer.
 *
 * Combines first strong character with word majority:
 * - starts Persian/Arabic → prefer RTL (even if English follows)
 * - starts English → RTL only when Persian body is significant
 * This avoids both "Note: فارسی…" going LTR and English sentences with one
 * Persian word getting visually reordered inside an RTL box.
 */

const RTL_LETTER =
    /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g
const LTR_LETTER = /[A-Za-z\u00C0-\u024F]/g
const FIRST_STRONG = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]|[A-Za-z\u00C0-\u024F]/

export type TextDirection = 'ltr' | 'rtl'

/** Count strong directional letters (ignores digits, punctuation, spaces). */
export function countDirectionalLetters(text: string): { rtl: number; ltr: number } {
    if (!text) return {rtl: 0, ltr: 0}
    return {
        rtl: (text.match(RTL_LETTER) || []).length,
        ltr: (text.match(LTR_LETTER) || []).length,
    }
}

type WordScript = 'rtl' | 'ltr' | 'neutral'

function classifyWord(word: string): WordScript {
    const {rtl, ltr} = countDirectionalLetters(word)
    if (rtl === 0 && ltr === 0) return 'neutral'
    if (rtl === 0) return 'ltr'
    if (ltr === 0) return 'rtl'
    return rtl >= ltr ? 'rtl' : 'ltr'
}

export function countDirectionalWords(text: string): { rtl: number; ltr: number } {
    const words = text.trim().split(/\s+/).filter(Boolean)
    let rtl = 0
    let ltr = 0
    for (const word of words) {
        const kind = classifyWord(word)
        if (kind === 'rtl') rtl++
        else if (kind === 'ltr') ltr++
    }
    return {rtl, ltr}
}

/** First strong directional character: 'rtl' | 'ltr' | null */
export function getFirstStrongDirection(text: string): TextDirection | null {
    const match = text.match(FIRST_STRONG)
    if (!match) return null
    return LTR_LETTER.test(match[0]) ? 'ltr' : 'rtl'
}

/**
 * Decide paragraph/block direction.
 *
 * - no letters → rtl (app default)
 * - only one script → that script
 * - starts RTL → rtl unless Latin words overwhelm (≥4×)
 * - starts LTR → rtl unless Latin words clearly dominate (≥2×)
 */
export function detectTextDirection(text: string): TextDirection {
    // Strip math/chem so formulas don't flip Persian labels to LTR
    const cleaned = text
        .replace(/\$\$[\s\S]*?\$\$/g, ' ')
        .replace(/\$[^$]+\$/g, ' ')
        .replace(/\\ce\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, ' ')
    const {rtl, ltr} = countDirectionalWords(cleaned)
    if (rtl === 0 && ltr === 0) return 'rtl'
    if (rtl === 0) return 'ltr'
    if (ltr === 0) return 'rtl'

    const first = getFirstStrongDirection(cleaned)
    if (first === 'rtl') {
        // "سلام دوستان، please check the config…" stays RTL
        return ltr > rtl * 4 ? 'ltr' : 'rtl'
    }
    // "Note: این متن…" → rtl; "The word سلام means…" → ltr
    return ltr >= rtl * 2 ? 'ltr' : 'rtl'
}

/** True when text has Latin letters and zero RTL script letters. */
export function isPureEnglish(text: string): boolean {
    if (!text || typeof text !== 'string') return false
    const trimmed = text.trim()
    if (!trimmed) return false
    const {rtl, ltr} = countDirectionalLetters(trimmed)
    return ltr > 0 && rtl === 0
}

/**
 * Arabic (vs Persian) heuristic for Arabic font selection.
 * Persian letters گ چ پ ژ force "not Arabic".
 */
export function isArabicText(text: string): boolean {
    if (!text || typeof text !== 'string') return false
    const trimmed = text.trim()
    if (!trimmed) return false

    if (/[گچپژ]/.test(trimmed)) return false
    if (!/[\u0600-\u06FF]/.test(trimmed)) return false

    const arabicWordsRegex =
        /\b(في|من|إلى|على|عن|هذا|هذه|هؤلاء|ذلك|تلك|التي|الذي|الذين|كان|كانت|يكون|لقد|أن|إن|هل|لم|لن|ماذا|لماذا|كيف|حيث|نحن|هم|هن|أنت|أنتم|عليهم|عليكم|صلى|عليه|وسلم|بسم|الله|الرحمن|الرحيم|آية|سورة|حديث)\b/gu
    const arabicWordMatches = trimmed.match(arabicWordsRegex) || []
    const alMatches = trimmed.match(/\bال[ء-ي]{3,}\b/gu) || []
    const arabicCharMatches = trimmed.match(/[ةى]/g) || []

    const arabicScore = arabicWordMatches.length * 2 + alMatches.length + arabicCharMatches.length
    if (arabicScore >= 2) return true

    const totalWords = trimmed.split(/\s+/).length
    if (totalWords <= 4 && (arabicWordMatches.length >= 1 || arabicCharMatches.length >= 1)) {
        return true
    }

    return false
}

export interface BidiTextAttributes {
    dir: TextDirection
    className?: string
    style?: { fontFamily?: string }
}

/** Shared bidi class/style props for markdown block elements. */
export function getBidiTextProps(text: string, className?: string): BidiTextAttributes {
    const dir = detectTextDirection(text)
    const isEng = dir === 'ltr' && isPureEnglish(text)
    const isAr = dir === 'rtl' && isArabicText(text)

    let cls = className || ''
    if (dir === 'ltr') cls += ' bidi-ltr'
    if (isEng) cls += ' is-english'
    else if (isAr) cls += ' is-arabic'

    return {
        dir,
        className: cls.trim() || undefined,
        style: isAr
            ? {fontFamily: 'var(--preview-font-ar)'}
            : isEng
                ? {fontFamily: 'var(--preview-font-en)'}
                : undefined,
    }
}

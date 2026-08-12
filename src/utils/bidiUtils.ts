/**
 * Bi-directional & Language Detection Helpers
 */

/**
 * Checks if a given text string contains predominantly Latin characters
 * and no Persian/Arabic characters.
 */
export function isPureEnglish(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    if (!trimmed) return false;

    // Check if contains Persian or Arabic characters
    const hasPersian = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(trimmed);
    if (hasPersian) return false;

    // Check if contains Latin letters
    const hasLatin = /[a-zA-Z]/.test(trimmed);
    return hasLatin;
}

export function isArabicText(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    if (!trimmed) return false;

    // Check for explicit Arabic diacritics (Harakat / Tanwin / Shadda / Sukun)
    const hasArabicHarakat = /[\u064B-\u0652\u0670]/.test(trimmed);
    // Check for characters specific to Arabic (Ta Marbuta 'ة', Alef with Hamza Below 'إ', Arabic Kaf 'ك', Arabic Ya 'ي')
    const hasArabicChars = /[ةإكي]/.test(trimmed);

    return hasArabicHarakat || hasArabicChars;
}


/**
 * Determines text direction based on first strong directional character.
 */
export function getFirstCharDirection(text: string): 'ltr' | 'rtl' | 'auto' {
    if (!text) return 'auto';
    const match = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]|[a-zA-Z]/);
    if (!match) return 'auto';
    return /[a-zA-Z]/.test(match[0]) ? 'ltr' : 'rtl';
}


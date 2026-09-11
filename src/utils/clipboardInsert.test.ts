import {describe, expect, it} from 'vitest'
import {insertClipboardText} from './clipboardInsert'

describe('insertClipboardText', () => {
    it('inserts at the caret when selection is collapsed', () => {
        const result = insertClipboardText('سلام دنیا', '، خوبی', {start: 4, end: 4})
        expect(result.text).toBe('سلام، خوبی دنیا')
        expect(result.cursor).toBe(10)
    })

    it('inserts at the beginning', () => {
        expect(insertClipboardText('world', 'hello ', {start: 0, end: 0})).toEqual({
            text: 'hello world',
            cursor: 6,
        })
    })

    it('inserts in the middle', () => {
        expect(insertClipboardText('abef', 'cd', {start: 2, end: 2}).text).toBe('abcdef')
    })

    it('inserts at the end when caret is at the end', () => {
        expect(insertClipboardText('abc', 'X', {start: 3, end: 3})).toEqual({
            text: 'abcX',
            cursor: 4,
        })
    })

    it('replaces only the current selection, not the whole document', () => {
        const result = insertClipboardText('abcdef', 'X', {start: 2, end: 4})
        expect(result.text).toBe('abXef')
        expect(result.cursor).toBe(3)
    })

    it('preserves multiline clipboard content', () => {
        expect(insertClipboardText('a', 'b\nc', {start: 1, end: 1}).text).toBe('ab\nc')
    })

    it('handles Persian, English, and mixed RTL/LTR paste', () => {
        expect(insertClipboardText('', 'سلام Hello', {start: 0, end: 0}).text).toBe('سلام Hello')
        expect(insertClipboardText('x', 'سلام', {start: 0, end: 1}).text).toBe('سلام')
    })

    it('does not corrupt the document when clipboard is empty', () => {
        expect(insertClipboardText('سند', '', {start: 1, end: 1})).toEqual({
            text: 'سند',
            cursor: 1,
        })
    })

    it('when selection is unknown, inserts at end without inventing a newline', () => {
        const result = insertClipboardText('متن قبلی', 'جدید', null)
        expect(result.text).toBe('متن قبلیجدید')
        expect(result.cursor).toBe(result.text.length)
    })

    it('uses the clipboard as the document only when the current text is empty', () => {
        expect(insertClipboardText('', 'تازه', null)).toEqual({text: 'تازه', cursor: 4})
    })
})

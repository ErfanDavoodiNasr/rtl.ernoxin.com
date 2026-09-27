import {describe, expect, it} from 'vitest'
import {isImportableFile, readTextFile} from './fileImport'

describe('fileImport', () => {
    it('accepts markdown and text filenames', () => {
        expect(isImportableFile(new File(['a'], 'doc.md', {type: 'text/markdown'}))).toBe(true)
        expect(isImportableFile(new File(['a'], 'note.txt', {type: 'text/plain'}))).toBe(true)
        expect(isImportableFile(new File(['a'], 'x.bin', {type: 'application/octet-stream'}))).toBe(false)
    })

    it('reads UTF-8 Persian markdown', async () => {
        const file = new File(['سلام # عنوان\n'], 'fa.md', {type: 'text/markdown'})
        await expect(readTextFile(file)).resolves.toContain('سلام')
    })

    it('rejects null bytes', async () => {
        const file = new File(['a\0b'], 'x.md', {type: 'text/markdown'})
        await expect(readTextFile(file)).rejects.toThrow('binary')
    })
})

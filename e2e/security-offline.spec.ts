import {expect, test} from '@playwright/test'
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {execFileSync} from 'node:child_process'

test.describe('XSS regression in preview', () => {
    test('malicious markdown does not execute and drops dangerous URLs', async ({page}) => {
        await page.goto('/')
        await page.getByRole('tab', {name: /ویرایش/}).click()
        const editor = page.locator('textarea.textarea')

        const payload = [
            '<script>window.__xss=1</script>',
            '<img src=x onerror="window.__xss=1">',
            '<picture><source srcset="javascript:alert(1)"><img src="https://example.com/a.png" alt="a"></picture>',
            '[phish](//evil.example/phish)',
            '<div style="background-image:url(https://evil.example/pixel.gif)">beacon</div>',
            'سلام امن',
        ].join('\n\n')

        await editor.fill(payload)
        await page.getByRole('tab', {name: /پیش‌نمایش/}).click()
        await expect(page.locator('.markdown-body')).toContainText('سلام امن', {timeout: 15_000})

        const xss = await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)
        expect(xss).toBeUndefined()
        const html = await page.locator('.markdown-body').innerHTML()
        expect(html.toLowerCase()).not.toContain('javascript:')
        expect(html.toLowerCase()).not.toContain('srcset')
        expect(html.toLowerCase()).not.toContain('//evil.example')
        expect(html.toLowerCase()).not.toContain('evil.example/pixel.gif')
        expect(html.toLowerCase()).not.toContain('<script')
    })
})

test.describe('release zip layout', () => {
    test('rtl.zip extracts with index.html at root', async () => {
        test.skip(!existsSync('dist/index.html'), 'dist missing — run build first')

        const dir = mkdtempSync(join(tmpdir(), 'rtl-zip-'))
        const zipPath = join(process.cwd(), 'rtl-test.zip')
        try {
            execFileSync('zip', ['-qr', zipPath, '.'], {cwd: join(process.cwd(), 'dist')})
            execFileSync('unzip', ['-q', '-o', zipPath, '-d', dir])
            expect(existsSync(join(dir, 'index.html'))).toBe(true)
            expect(existsSync(join(dir, '.htaccess'))).toBe(true)
            const html = readFileSync(join(dir, 'index.html'), 'utf8')
            expect(html).toMatch(/src="\.\/assets\//)
            expect(html).not.toMatch(/connect-src[^"]*ws:/)
        } finally {
            rmSync(zipPath, {force: true})
            rmSync(dir, {recursive: true, force: true})
        }
    })
})

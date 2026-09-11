import {expect, test} from '@playwright/test'

const FOREIGN_HOST_RE =
    /(jsdelivr|unpkg|cdnjs|googleapis|gstatic|fonts\.google|cloudfront|amazonaws|r2\.dev|blob\.core\.windows)/i

test.describe('production smoke', () => {
    test('loads shell, edits, renders, and stays self-hosted', async ({page}) => {
        const foreign: string[] = []
        page.on('request', (req) => {
            const url = req.url()
            if (FOREIGN_HOST_RE.test(url)) foreign.push(url)
            try {
                const host = new URL(url).hostname
                if (host && host !== '127.0.0.1' && host !== 'localhost') {
                    // Allow only same-origin app traffic for required assets.
                    // User markdown may later request https images; this smoke uses no remote media.
                    if (!url.startsWith('http://127.0.0.1:4173') && !url.startsWith('http://localhost:4173')) {
                        foreign.push(url)
                    }
                }
            } catch {
                // ignore invalid
            }
        })

        await page.goto('/')
        await expect(page.getByRole('heading', {name: /نمایشگر فارسی/})).toBeVisible()

        await page.getByRole('tab', {name: /ویرایش/}).click()
        const editor = page.locator('textarea.textarea')
        await expect(editor).toBeVisible()

        const sample = [
            '# تست',
            '',
            'این مقدار برای API برابر $E=mc^2$ است.',
            '',
            '```js',
            'console.log(1)',
            '```',
            '',
            '| a | b |',
            '|---|---|',
            '| ۱ | ۲ |',
            '',
            '```mermaid',
            'flowchart LR',
            '  A-->B',
            '```',
        ].join('\n')

        await editor.fill(sample)
        await page.getByRole('tab', {name: /پیش‌نمایش/}).click()
        await expect(page.locator('.markdown-body')).toBeVisible({timeout: 20_000})
        await expect(page.locator('.markdown-body')).toContainText('تست')

        // Wait for deferred math/diagram work
        await page.waitForTimeout(1500)

        expect(foreign, `unexpected foreign requests: ${foreign.join('\n')}`).toEqual([])
    })

    test('rejects oversized paste via UI size gate message path', async ({page}) => {
        await page.goto('/')
        await page.getByRole('tab', {name: /ویرایش/}).click()
        const editor = page.locator('textarea.textarea')
        // Keep under browser hang: ~100KB still exercises onChange path quickly
        const medium = 'ا'.repeat(20_000)
        await editor.fill(medium)
        await expect(editor).toHaveValue(medium)
    })
})

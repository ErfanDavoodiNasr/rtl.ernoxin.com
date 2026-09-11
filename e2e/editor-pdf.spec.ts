import {expect, test} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = (name: string) =>
    readFileSync(join(__dirname, '../tests/fixtures/pdf', name), 'utf8')

const FOREIGN_HOST_RE =
    /(jsdelivr|unpkg|cdnjs|googleapis|gstatic|fonts\.google|cloudfront|amazonaws|r2\.dev|blob\.core\.windows)/i

async function prepareDocument(page: import('@playwright/test').Page, markdown: string) {
    await page.goto('/')
    await page.getByRole('tab', {name: /ویرایش/}).click()
    const editor = page.locator('textarea.textarea')
    await editor.fill(markdown)
    await page.getByRole('tab', {name: /پیش‌نمایش/}).click()
    await expect(page.locator('.markdown-body')).toBeVisible({timeout: 30_000})
    await page.waitForTimeout(1500)
}

test.describe('PDF export download', () => {
    test('downloads a .pdf file like other export formats', async ({page, browserName}) => {
        test.skip(browserName === 'webkit', 'download event flaky on webkit in this suite')
        test.setTimeout(120_000)

        await prepareDocument(page, fixture('text.md'))

        const downloadPromise = page.waitForEvent('download', {timeout: 90_000})
        await page.getByRole('button', {name: /خروجی/}).click()
        await page.getByRole('button', {name: /PDF/i}).click()
        const download = await downloadPromise

        expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
        const filePath = await download.path()
        expect(filePath).toBeTruthy()
        const bytes = readFileSync(filePath!)
        expect(Buffer.from(bytes.subarray(0, 5)).toString('utf8')).toBe('%PDF-')
        expect(bytes.byteLength).toBeGreaterThan(500)
        // JPEG-compressed raster pages must stay far below the old ~60MB PNG path.
        expect(bytes.byteLength).toBeLessThan(10_000_000)
    })
})

test.describe('editor actions', () => {
    test('paste inserts at caret and clear is recoverable from history', async ({page}) => {
        await page.goto('/')
        await page.getByRole('tab', {name: /ویرایش/}).click()
        const editor = page.locator('textarea.textarea')
        await editor.fill('ABCDEF')
        await editor.click()
        await editor.evaluate((el: HTMLTextAreaElement) => {
            el.focus()
            el.setSelectionRange(3, 3)
        })

        await page.evaluate(() => {
            const store = {text: 'XYZ'}
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: {
                    readText: async () => store.text,
                    writeText: async (value: string) => {
                        store.text = value
                    },
                },
            })
        })
        await page.getByRole('button', {name: /جایگذاری/}).click()
        await expect(editor).toHaveValue('ABCXYZDEF')

        page.once('dialog', (d) => d.accept())
        await page.getByRole('button', {name: /پاک کردن/}).click()
        await expect(editor).toHaveValue('')

        await page.getByRole('button', {name: /تاریخچه/}).click()
        const restore = page.locator('.history-item').first()
        await expect(restore).toBeVisible({timeout: 10_000})
        await restore.click()
        await expect(editor).toHaveValue('ABCXYZDEF')
    })

    test('history limit preference survives reload', async ({page}) => {
        await page.goto('/')
        await page.getByRole('button', {name: /تاریخچه/}).click()
        const input = page.locator('.history-popover input[type="number"]')
        await input.fill('200')
        await expect(page.locator('.settings-value')).toContainText('200')
        await page.reload()
        await page.getByRole('button', {name: /تاریخچه/}).click()
        await expect(page.locator('.history-popover input[type="number"]')).toHaveValue('200')
    })

    test('backup button is gone', async ({page}) => {
        await page.goto('/')
        await expect(page.getByRole('button', {name: /پشتیبان/})).toHaveCount(0)
        await expect(page.getByText('پشتیبان')).toHaveCount(0)
    })
})

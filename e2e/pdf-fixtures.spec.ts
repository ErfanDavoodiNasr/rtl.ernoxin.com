import {expect, test} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = (name: string) =>
    readFileSync(join(__dirname, '../tests/fixtures/pdf', name), 'utf8')

const FIXTURES = [
    {file: 'text.md', label: 'Text', maxBytes: 8_000_000},
    {file: 'tables.md', label: 'Tables', maxBytes: 10_000_000},
    {file: 'math.md', label: 'Math', maxBytes: 10_000_000},
    {file: 'mixed.md', label: 'Mixed', maxBytes: 12_000_000},
] as const

async function prepareDocument(page: import('@playwright/test').Page, markdown: string) {
    await page.goto('/')
    await page.getByRole('tab', {name: /ویرایش/}).click()
    await page.locator('textarea.textarea').fill(markdown)
    await page.getByRole('tab', {name: /پیش‌نمایش/}).click()
    await expect(page.locator('.markdown-body')).toBeVisible({timeout: 30_000})
    await expect(page.locator('[data-preview-pending]')).toHaveCount(0, {timeout: 30_000})
    await page.waitForTimeout(800)
}

test.describe('PDF fixture size gate', () => {
    for (const item of FIXTURES) {
        test(`${item.label} PDF is valid and under size budget`, async ({page, browserName}) => {
            test.skip(browserName !== 'chromium', 'PDF size gate measured on Chromium only')
            test.setTimeout(180_000)

            await prepareDocument(page, fixture(item.file))
            const downloadPromise = page.waitForEvent('download', {timeout: 120_000})
            await page.getByRole('button', {name: /خروجی/}).click()
            await page.getByRole('button', {name: /PDF/i}).click()
            const download = await downloadPromise
            const path = await download.path()
            expect(path).toBeTruthy()
            const bytes = readFileSync(path!)
            expect(Buffer.from(bytes.subarray(0, 5)).toString('utf8')).toBe('%PDF-')
            expect(bytes.byteLength).toBeGreaterThan(500)
            expect(bytes.byteLength).toBeLessThan(item.maxBytes)
            expect(bytes.byteLength).toBeLessThan(20_000_000)
            console.log(`PDF ${item.label}: ${bytes.byteLength} bytes`)
        })
    }
})

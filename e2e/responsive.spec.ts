import {expect, test} from '@playwright/test'

const VIEWPORTS = [
    {name: '320x568', width: 320, height: 568},
    {name: '390x844', width: 390, height: 844},
    {name: '768x1024', width: 768, height: 1024},
    {name: '1366x768', width: 1366, height: 768},
    {name: '1920x1080', width: 1920, height: 1080},
] as const

test.describe('responsive shell', () => {
    for (const vp of VIEWPORTS) {
        test(`usable chrome at ${vp.name}`, async ({page}) => {
            await page.setViewportSize({width: vp.width, height: vp.height})
            await page.goto('/')

            await expect(page.getByRole('heading', {level: 1})).toBeVisible()
            await expect(page.getByRole('tab', {name: /پیش‌نمایش/})).toBeVisible()
            await expect(page.getByRole('button', {name: /جایگذاری/})).toBeVisible()

            const overflowX = await page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            )
            expect(overflowX).toBeLessThanOrEqual(1)

            // History works on empty docs; export is intentionally disabled until content exists.
            await page.getByRole('button', {name: /تاریخچه/}).click()
            const popover = page.locator('.history-popover')
            await expect(popover).toBeVisible()
            const box = await popover.boundingBox()
            expect(box).toBeTruthy()
            expect(box!.x).toBeGreaterThanOrEqual(-2)
            expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 2)
            expect(box!.y).toBeGreaterThanOrEqual(-2)
            await page.keyboard.press('Escape')
            await expect(popover).toHaveCount(0)

            await page.getByRole('tab', {name: /ویرایش/}).click()
            await page.locator('textarea.textarea').fill('متن آزمایشی برای خروجی')
            await page.getByRole('button', {name: /خروجی/}).click()
            await expect(page.getByRole('menu')).toBeVisible()
            const menuBox = await page.getByRole('menu').boundingBox()
            expect(menuBox).toBeTruthy()
            expect(menuBox!.x).toBeGreaterThanOrEqual(-2)
            expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(vp.width + 2)
            await page.keyboard.press('Escape')
            await expect(page.getByRole('menu')).toHaveCount(0)
        })
    }
})

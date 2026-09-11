import {expect, test} from '@playwright/test'

const longDoc = Array.from(
    {length: 50},
    (_, i) => `## عنوان ${i + 1}\n\nپاراگراف فارسی برای تست اسکرول شماره ${i + 1}. English mixed line.\n`,
).join('\n')

async function loadLongDocument(page: import('@playwright/test').Page) {
    await page.goto('/')
    await page.getByRole('tab', {name: /ویرایش/}).click()
    const editor = page.locator('textarea.textarea')
    await editor.fill(longDoc)
    await expect(editor).toHaveValue(longDoc)
}

async function openReadyPreview(page: import('@playwright/test').Page) {
    await page.getByRole('tab', {name: /پیش‌نمایش/}).click()
    await expect(page.getByRole('heading', {name: 'عنوان 1', exact: true})).toBeVisible({
        timeout: 30_000,
    })
    await expect(page.getByRole('heading', {name: 'عنوان 50', exact: true})).toBeVisible({
        timeout: 30_000,
    })
    await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = 'auto'
        window.scrollTo(0, 0)
    })
}

test.describe('scroll over document text', () => {
    test('pointer or touch over preview markdown scrolls the page', async ({page, isMobile}) => {
        await loadLongDocument(page)
        await openReadyPreview(page)

        const metrics = await page.evaluate(() => ({
            docCan: document.documentElement.scrollHeight > document.documentElement.clientHeight + 40,
            overflowY: getComputedStyle(document.querySelector('.preview-content')!).overflowY,
            overscroll: getComputedStyle(document.querySelector('.preview-content')!).overscrollBehavior,
        }))
        expect(metrics.docCan).toBe(true)
        expect(metrics.overflowY).toBe('visible')
        expect(metrics.overscroll).not.toBe('contain')

        const before = await page.evaluate(
            () => document.documentElement.scrollTop || document.body.scrollTop,
        )
        const box = await page.locator('.markdown-body').boundingBox()
        expect(box).toBeTruthy()
        const x = box!.x + box!.width / 2
        const y = box!.y + Math.min(160, box!.height / 4)

        if (isMobile) {
            const session = await page.context().newCDPSession(page)
            await session.send('Input.dispatchTouchEvent', {
                type: 'touchStart',
                touchPoints: [{x, y}],
            })
            for (let i = 1; i <= 10; i++) {
                await session.send('Input.dispatchTouchEvent', {
                    type: 'touchMove',
                    touchPoints: [{x, y: y - i * 40}],
                })
            }
            await session.send('Input.dispatchTouchEvent', {
                type: 'touchEnd',
                touchPoints: [],
            })
            await session.detach()
        } else {
            await page.mouse.move(x, y)
            for (let i = 0; i < 8; i++) {
                await page.mouse.wheel(0, 400)
            }
        }

        await expect
            .poll(async () => page.evaluate(() => document.documentElement.scrollTop || document.body.scrollTop), {
                timeout: 10_000,
            })
            .toBeGreaterThan(before + 120)
    })

    test('mouse wheel over textarea scrolls the editor', async ({page}) => {
        await loadLongDocument(page)
        const ta = page.locator('textarea.textarea')
        await ta.evaluate((el: HTMLTextAreaElement) => {
            el.scrollTop = 0
        })
        await expect.poll(async () => ta.evaluate((el) => el.scrollTop)).toBe(0)
        await expect
            .poll(async () =>
                ta.evaluate((el) => el.scrollHeight > el.clientHeight + 40),
            )
            .toBe(true)

        const box = await ta.boundingBox()
        expect(box).toBeTruthy()
        await page.mouse.move(box!.x + box!.width / 2, box!.y + 80)
        await page.mouse.wheel(0, 600)
        await expect.poll(async () => ta.evaluate((el) => el.scrollTop)).toBeGreaterThan(100)
    })

    test('split preview pane scrolls internally under the pointer', async ({page}) => {
        await loadLongDocument(page)
        await page.getByRole('tab', {name: /دو پنجره/}).click()
        await expect(page.getByRole('heading', {name: 'عنوان 1', exact: true})).toBeVisible({
            timeout: 30_000,
        })

        const preview = page.locator('.preview-content')
        await expect
            .poll(async () =>
                preview.evaluate((el) => ({
                    can: el.scrollHeight > el.clientHeight + 40,
                    overflowY: getComputedStyle(el).overflowY,
                })),
            )
            .toMatchObject({can: true, overflowY: 'auto'})

        await preview.evaluate((el) => {
            el.scrollTop = 0
        })
        const box = await preview.boundingBox()
        expect(box).toBeTruthy()
        await page.mouse.move(box!.x + box!.width / 2, box!.y + 60)
        await page.mouse.wheel(0, 500)
        await expect.poll(async () => preview.evaluate((el) => el.scrollTop)).toBeGreaterThan(100)
    })

    test('keyboard PageDown scrolls when editor is focused', async ({page}) => {
        await loadLongDocument(page)
        const ta = page.locator('textarea.textarea')
        await ta.evaluate((el: HTMLTextAreaElement) => {
            el.focus()
            el.setSelectionRange(0, 0)
            el.scrollTop = 0
        })
        await expect.poll(async () => ta.evaluate((el) => el.scrollTop)).toBe(0)
        await ta.focus()
        await page.keyboard.press('PageDown')
        await expect.poll(async () => ta.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
    })
})

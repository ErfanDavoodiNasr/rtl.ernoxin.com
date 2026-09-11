import {describe, expect, it, vi} from 'vitest'
import {
    countMermaidBlocks,
    isPreviewReady,
    markdownNeedsKatex,
    waitForExportPreview,
    waitForMermaidReady,
    waitForPreviewSync
} from './previewReady'
import {
    buildHtmlDocument,
    chooseCaptureScale,
    createCaptureRoot,
    MAX_CANVAS_DIMENSION,
    planPdfSlices
} from './exportUtils'

vi.mock('./exportAssets', () => ({
    loadOfflineExportCss: async () => ({fontCss: '', katexCss: ''}),
}))

describe('countMermaidBlocks', () => {
    it('returns 0 when no mermaid blocks', () => {
        expect(countMermaidBlocks('# Hello')).toBe(0)
        expect(countMermaidBlocks('```js\nconsole.log(1)\n```')).toBe(0)
    })

    it('counts mermaid fenced blocks', () => {
        const md = [
            '```mermaid',
            'graph TD; A-->B',
            '```',
            '',
            '```mermaid',
            'sequenceDiagram',
            '```',
        ].join('\n')
        expect(countMermaidBlocks(md)).toBe(2)
    })
})

describe('markdownNeedsKatex', () => {
    it('detects common math/chem markers', () => {
        expect(markdownNeedsKatex('hello $x$')).toBe(true)
        expect(markdownNeedsKatex('\\(a\\)')).toBe(true)
        expect(markdownNeedsKatex('\\ce{H2O}')).toBe(true)
        expect(markdownNeedsKatex('# فقط متن')).toBe(false)
    })
})

describe('waitForPreviewSync', () => {
    it('resolves when sync function returns true', async () => {
        let synced = false
        setTimeout(() => {
            synced = true
        }, 30)
        await expect(waitForPreviewSync(() => synced, 1000)).resolves.toBeUndefined()
    })

    it('rejects on timeout', async () => {
        await expect(waitForPreviewSync(() => false, 50)).rejects.toThrow('Preview sync timeout')
    })
})

describe('waitForMermaidReady', () => {
    it('returns immediately when expected count is 0', async () => {
        const container = document.createElement('div')
        await expect(waitForMermaidReady(container, 0)).resolves.toBeUndefined()
    })

    it('waits until mermaid SVG nodes appear', async () => {
        const container = document.createElement('div')
        setTimeout(() => {
            const wrapper = document.createElement('div')
            wrapper.className = 'mermaid-svg-container'
            wrapper.innerHTML = '<svg></svg>'
            container.appendChild(wrapper)
        }, 30)
        await expect(waitForMermaidReady(container, 1, 1000)).resolves.toBeUndefined()
    })

    it('rejects on timeout', async () => {
        const container = document.createElement('div')
        const loading = document.createElement('div')
        loading.className = 'mermaid-loading'
        container.appendChild(loading)
        await expect(waitForMermaidReady(container, 1, 50)).rejects.toThrow('Mermaid render timeout')
    })
})

describe('waitForExportPreview', () => {
    it('resolves when the preview is fully ready', async () => {
        const container = document.createElement('div')
        const body = document.createElement('article')
        body.className = 'markdown-body'
        const katex = document.createElement('div')
        katex.setAttribute('data-katex-status', 'ready')
        body.appendChild(katex)
        container.appendChild(body)

        await expect(waitForExportPreview(() => container, '# سلام', 500)).resolves.toBe(container)
    })

    it('rejects when the preview stays pending', async () => {
        const container = document.createElement('div')
        const loading = document.createElement('p')
        loading.className = 'preview-loading'
        loading.setAttribute('data-preview-pending', 'true')
        container.appendChild(loading)
        await expect(waitForExportPreview(() => container, '# سلام', 80)).rejects.toThrow('Preview not ready')
    })

    it('detects incomplete katex or mermaid states', () => {
        const container = document.createElement('div')
        const body = document.createElement('article')
        body.className = 'markdown-body'
        const katex = document.createElement('div')
        katex.setAttribute('data-katex-status', 'pending')
        body.appendChild(katex)
        container.appendChild(body)
        expect(isPreviewReady(container, '$x$')).toBe(false)

        katex.setAttribute('data-katex-status', 'ready')
        const loading = document.createElement('div')
        loading.className = 'mermaid-loading'
        body.appendChild(loading)
        expect(isPreviewReady(container, '```mermaid\ngraph TD;A-->B\n```')).toBe(false)
    })
})

describe('buildHtmlDocument', () => {
    it('does not evaluate template expressions or backticks from user HTML', () => {
        const payload = '`${globalThis.__templateHit = true}` and `backtick`'
        ;(globalThis as { __templateHit?: boolean }).__templateHit = undefined

        const html = buildHtmlDocument({
            theme: 'dark"><script>alert(1)</script>',
            katexCss: '.katex { content: "`${1}`"; }',
            bodyHtml: `<p>${payload}</p>`,
        })

        expect((globalThis as { __templateHit?: boolean }).__templateHit).toBeUndefined()
        expect(html).toContain(payload)
        expect(html).toContain('data-theme="dark"')
        expect(html).not.toContain('<script>alert(1)</script>')
        expect(html).not.toContain('cdn.jsdelivr.net')
        expect(html).toContain('Content-Security-Policy')
        expect(html).toContain('--preview-font-size: 17px')
        expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
        expect(html.endsWith('</html>')).toBe(true)
    })

    it('embeds typography settings from the reader', () => {
        const html = buildHtmlDocument({
            theme: 'light',
            katexCss: '',
            fontCss: "@font-face{font-family:'Vazirmatn';src:url('data:font/woff2;base64,AA==')}",
            bodyHtml: '<p>سلام</p>',
            typography: {
                fontKey: 'Shabnam',
                fontFamily: "'Shabnam', sans-serif",
                fontFamilyEn: "'Inter', sans-serif",
                fontFamilyAr: "'Amiri', serif",
                fontSize: 21,
                lineHeight: 2.2,
            },
        })
        expect(html).toContain("--preview-font-family: 'Shabnam', sans-serif")
        expect(html).toContain('--preview-font-size: 21px')
        expect(html).toContain("src:url('data:font/woff2;base64,AA==')")
        expect(html).not.toContain('jsdelivr')
    })

    it('strips scriptable mermaid SVG before writing the file', () => {
        const html = buildHtmlDocument({
            theme: 'light',
            katexCss: '',
            bodyHtml: [
                '<div class="mermaid-svg-container">',
                '<svg xmlns="http://www.w3.org/2000/svg">',
                '<script>alert(1)</script>',
                '<a href="javascript:alert(1)"><rect width="10" height="10"></rect></a>',
                '<foreignObject><div onclick="alert(1)">x</div></foreignObject>',
                '</svg>',
                '</div>',
            ].join(''),
        })

        expect(html.toLowerCase()).not.toContain('<script')
        expect(html.toLowerCase()).not.toContain('javascript:')
        expect(html.toLowerCase()).not.toContain('foreignobject')
        expect(html.toLowerCase()).not.toContain('onclick')
        expect(html).toContain('<svg')
        expect(html).toContain('<rect')
    })
})

describe('capture planning', () => {
    it('keeps a readable scale when the document fits', () => {
        expect(chooseCaptureScale(800, 1200)).toEqual({
            scale: 1.5,
            truncated: false,
            captureHeight: 1200,
        })
    })

    it('marks documents taller than the canvas limit as truncated', () => {
        const plan = chooseCaptureScale(800, 40_000)
        expect(plan.truncated).toBe(true)
        expect(plan.scale).toBe(1)
        expect(plan.captureHeight).toBeLessThan(40_000)
        expect(plan.captureHeight).toBeLessThanOrEqual(MAX_CANVAS_DIMENSION)
    })

    it('slices PDF pages with overlap and does not loop past the canvas', () => {
        const slices = planPdfSlices(1000, 400, 40)
        expect(slices).toEqual([
            {srcY: 0, srcHeight: 400},
            {srcY: 360, srcHeight: 400},
            {srcY: 720, srcHeight: 280},
        ])
        expect(slices[slices.length - 1].srcY + slices[slices.length - 1].srcHeight).toBe(1000)
    })

    it('clones the markdown body outside the scroll container', () => {
        const source = document.createElement('div')
        source.style.overflow = 'auto'
        source.style.width = '640px'
        source.style.height = '200px'
        const body = document.createElement('article')
        body.className = 'markdown-body'
        body.textContent = 'متن بلند'
        source.appendChild(body)

        const {host, target} = createCaptureRoot(source, '#ffffff')
        expect(host.style.overflow).toBe('visible')
        expect(target.classList.contains('markdown-body')).toBe(true)
        expect(target.textContent).toBe('متن بلند')
        expect(target).not.toBe(source)
    })
})

describe('exportAsPdf', () => {
    it('exposes a downloadable PDF API (not a print/blob tab helper)', async () => {
        const mod = await import('./exportUtils')
        expect(typeof mod.exportAsPdf).toBe('function')
        expect(mod).not.toHaveProperty('openPrintableHtml')
        const {readFileSync} = await import('node:fs')
        const source = readFileSync('src/utils/exportUtils.ts', 'utf8')
        expect(source).toContain("toDataURL('image/jpeg'")
        expect(source).toContain("output('blob')")
        expect(source).toContain('downloadBlob(blob, filename)')
        expect(source).not.toContain('window.open')
    })
})


describe('exportAsMarkdown', () => {
    it('creates a downloadable markdown blob', async () => {
        const {exportAsMarkdown} = await import('./exportUtils')
        const createObjectURL = vi.fn(() => 'blob:mock')
        const revokeObjectURL = vi.fn()
        vi.stubGlobal('URL', {createObjectURL, revokeObjectURL})

        const appendChild = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node)
        const removeChild = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node)
        const click = vi.fn()
        vi.spyOn(document, 'createElement').mockReturnValue({
            click,
            href: '',
            download: '',
        } as unknown as HTMLAnchorElement)

        exportAsMarkdown('# processed\n\n| a | b |')

        expect(createObjectURL).toHaveBeenCalled()
        expect(click).toHaveBeenCalled()
        appendChild.mockRestore()
        removeChild.mockRestore()
        vi.unstubAllGlobals()
    })
})

describe('legacy raster PDF root cause', () => {
    it('documents that PNG page images dominate size vs print text PDFs', () => {
        // Synthetic accounting for the old pipeline: scale≈2 full-doc canvas → PNG slices.
        const width = 1600
        const height = 16000
        const rgbaBytes = width * height * 4
        const estimatedPngPayload = rgbaBytes * 0.35
        expect(estimatedPngPayload).toBeGreaterThan(30_000_000)
    })
})


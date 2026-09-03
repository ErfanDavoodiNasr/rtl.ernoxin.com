import {describe, expect, it, vi} from 'vitest'
import {countMermaidBlocks, markdownNeedsKatex, waitForMermaidReady, waitForPreviewSync} from './previewReady'

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
            download: ''
        } as unknown as HTMLAnchorElement)

        exportAsMarkdown('# processed\n\n| a | b |')

        expect(createObjectURL).toHaveBeenCalled()
        expect(click).toHaveBeenCalled()
        appendChild.mockRestore()
        removeChild.mockRestore()
        vi.unstubAllGlobals()
    })
})

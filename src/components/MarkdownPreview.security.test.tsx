import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {createRoot, type Root} from 'react-dom/client'
import {act} from 'react'
import MarkdownPreview from '../components/MarkdownPreview'

async function flush(ms = 0) {
    await act(async () => {
        await new Promise((r) => setTimeout(r, ms))
    })
}

describe('MarkdownPreview security', () => {
    let host: HTMLDivElement
    let root: Root

    beforeEach(() => {
        host = document.createElement('div')
        document.body.appendChild(host)
        root = createRoot(host)
    })

    afterEach(() => {
        act(() => root.unmount())
        host.remove()
    })

    it('strips scriptable raw HTML and javascript links', async () => {
        const markdown = [
            '<script>window.__xss=1</script>',
            '<img src=x onerror="window.__xss=1">',
            '[x](javascript:alert(1))',
            '<a href="javascript:alert(1)">bad</a>',
            'سلام دنیا',
        ].join('\n\n')

        await act(async () => {
            root.render(<MarkdownPreview markdown={markdown} theme="dark"/>)
        })
        await flush(50)

        expect(host.querySelector('script')).toBeNull()
        expect(host.innerHTML.toLowerCase()).not.toContain('onerror')
        expect(host.innerHTML.toLowerCase()).not.toContain('javascript:')
        expect((window as unknown as { __xss?: number }).__xss).toBeUndefined()
        expect(host.textContent).toContain('سلام دنیا')
    })

    it('renders persian prose and inline math without crashing', async () => {
        const markdown = 'این مقدار $E=mc^2$ است.'
        await act(async () => {
            root.render(<MarkdownPreview markdown={markdown} theme="light"/>)
        })
        await flush(300)
        expect(host.textContent).toContain('این مقدار')
        expect(host.querySelector('[data-katex-status]')).toBeTruthy()
    })

    it('contains malformed mermaid without crashing the document', async () => {
        const markdown = ['متن قبل', '```mermaid', 'flowchart TD', 'A-->', '```', 'متن بعد'].join('\n')
        await act(async () => {
            root.render(<MarkdownPreview markdown={markdown} theme="dark"/>)
        })
        await flush(800)
        expect(host.textContent).toMatch(/متن قبل|متن بعد|Mermaid|نمودار/)
    })
})

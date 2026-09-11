const MERMAID_BLOCK_RE = /```mermaid[\s\S]*?```/g

export function countMermaidBlocks(markdown: string): number {
    return (markdown.match(MERMAID_BLOCK_RE) || []).length
}

/** Wait until all Mermaid diagrams in the preview container have finished rendering. */
export async function waitForMermaidReady(
    container: HTMLElement,
    expectedCount: number,
    timeoutMs = 15000,
): Promise<void> {
    if (expectedCount === 0) return

    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        const rendered = container.querySelectorAll('.mermaid-svg-container svg, .mermaid-error-wrapper').length
        const loading = container.querySelectorAll('.mermaid-loading').length
        if (rendered >= expectedCount && loading === 0) return
        await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error('Mermaid render timeout')
}

/** Wait until deferred preview text catches up with the editor. */
export async function waitForPreviewSync(
    isSynced: () => boolean,
    timeoutMs = 5000,
): Promise<void> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        if (isSynced()) {
            await new Promise<void>((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            })
            return
        }
        await new Promise((resolve) => setTimeout(resolve, 16))
    }
    throw new Error('Preview sync timeout')
}

export function isPreviewReady(container: HTMLElement, markdown: string): boolean {
    if (container.querySelector('.preview-loading, [data-preview-pending="true"], [aria-busy="true"]')) {
        return false
    }
    if (container.querySelector('[data-katex-status="error"]')) return false
    if (!container.querySelector('.markdown-body')) return false

    if (markdownNeedsKatex(markdown)) {
        const status = container.querySelector('[data-katex-status]')?.getAttribute('data-katex-status')
        if (status !== 'ready') return false
    }

    const expected = countMermaidBlocks(markdown)
    if (expected > 0) {
        const rendered = container.querySelectorAll('.mermaid-svg-container svg, .mermaid-error-wrapper').length
        const loading = container.querySelectorAll('.mermaid-loading').length
        if (rendered < expected || loading > 0) return false
    }

    return true
}

/** Wait until lazy preview, KaTeX, and Mermaid have finished. Throws if they do not. */
export async function waitForExportPreview(
    getContainer: () => HTMLElement | null,
    markdown: string,
    timeoutMs = 15000,
): Promise<HTMLElement> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        const container = getContainer()
        if (container?.querySelector('[data-katex-status="error"]')) {
            throw new Error('Preview not ready')
        }
        if (container && isPreviewReady(container, markdown)) {
            await new Promise<void>((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            })
            if (isPreviewReady(container, markdown)) return container
        }
        await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error('Preview not ready')
}

/** Detect math/chem that needs KaTeX (cheap heuristic for lazy-loading). */
export function markdownNeedsKatex(markdown: string): boolean {
    return /\$\$|\$[^$\n]+\$|\\\[|\\\(|\\ce\{|\\begin\{/.test(markdown)
}

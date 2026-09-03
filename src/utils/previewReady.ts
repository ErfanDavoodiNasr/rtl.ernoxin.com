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

/** Detect math/chem that needs KaTeX (cheap heuristic for lazy-loading). */
export function markdownNeedsKatex(markdown: string): boolean {
    return /\$\$|\$[^$\n]+\$|\\\[|\\\(|\\ce\{|\\begin\{/.test(markdown)
}

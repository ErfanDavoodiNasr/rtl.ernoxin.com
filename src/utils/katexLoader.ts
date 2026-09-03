/** Lazy-load KaTeX CSS + mhchem + rehype plugin only when math/chem is present. */

type RehypePlugin = unknown

let loading: Promise<RehypePlugin> | null = null
let cached: RehypePlugin | null = null

export async function loadKatexPlugin(): Promise<RehypePlugin> {
    if (cached) return cached
    if (!loading) {
        loading = (async () => {
            await Promise.all([
                import('katex/dist/katex.min.css'),
                import('katex/contrib/mhchem'),
            ])
            const mod = await import('rehype-katex')
            cached = mod.default
            return cached
        })()
    }
    return loading
}

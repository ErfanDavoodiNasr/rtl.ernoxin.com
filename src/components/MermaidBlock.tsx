import {useEffect, useId, useState} from 'react'
import {sanitizeSvg} from '../utils/svgSanitize'

interface MermaidBlockProps {
    chart: string
    theme: 'dark' | 'light'
}

type MermaidApi = typeof import('mermaid').default

let mermaidModule: Promise<MermaidApi> | null = null
let initChain: Promise<void> = Promise.resolve()
let lastTheme: 'dark' | 'light' | null = null

function loadMermaid(): Promise<MermaidApi> {
    if (!mermaidModule) {
        mermaidModule = import('mermaid').then((mod) => mod.default)
    }
    return mermaidModule
}

async function getMermaid(theme: 'dark' | 'light'): Promise<MermaidApi> {
    const mermaid = await loadMermaid()
    const run = initChain.then(async () => {
        if (lastTheme === theme) return
        mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
            fontFamily: 'Vazirmatn, sans-serif',
            securityLevel: 'strict',
            htmlLabels: false,
            maxTextSize: 50_000,
            maxEdges: 500,
        })
        lastTheme = theme
    })
    // Keep the chain alive after a failed initialize so later renders can retry.
    initChain = run.catch(() => {
        lastTheme = null
    })
    await run
    return mermaid
}

function makeRenderId(reactId: string): string {
    const random = Math.random().toString(36).slice(2, 10)
    return `mermaid-${reactId}-${Date.now().toString(36)}-${random}`
}

function cleanupMermaidDom(uniqueId: string) {
    document.getElementById(uniqueId)?.remove()
    document.getElementById(`d${uniqueId}`)?.remove()
}

export default function MermaidBlock({chart, theme}: MermaidBlockProps) {
    const reactId = useId().replace(/:/g, '')
    const [svgContent, setSvgContent] = useState('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        const uniqueId = makeRenderId(reactId)

        const renderChart = async () => {
            try {
                if (!chart.trim()) {
                    if (!cancelled) {
                        setSvgContent('')
                        setError(null)
                    }
                    return
                }

                const mermaid = await getMermaid(theme)
                const {svg} = await mermaid.render(uniqueId, chart)
                if (cancelled) return
                setSvgContent(sanitizeSvg(svg))
                setError(null)
            } catch (err: unknown) {
                if (!cancelled) {
                    const message = err instanceof Error ? err.message : 'خطا در رندر نمودار Mermaid'
                    setError(message)
                    setSvgContent('')
                }
            } finally {
                cleanupMermaidDom(uniqueId)
            }
        }

        void renderChart()

        return () => {
            cancelled = true
            cleanupMermaidDom(uniqueId)
        }
    }, [chart, theme, reactId])

    if (error) {
        return (
            <div className="mermaid-error-wrapper" dir="rtl">
                <div className="mermaid-error-header">
                    <span>خطا در فرمت یا سنتکس نمودار Mermaid</span>
                </div>
                <pre className="mermaid-error-text" dir="ltr">{chart}</pre>
            </div>
        )
    }

    if (!svgContent) {
        return (
            <div
                className="mermaid-block-wrapper mermaid-loading"
                dir="ltr"
                aria-busy="true"
                data-preview-pending="true"
            >
                <span className="mermaid-loading-text">در حال رسم نمودار…</span>
            </div>
        )
    }

    return (
        <div className="mermaid-block-wrapper" dir="ltr">
            <div
                className="mermaid-svg-container"
                dangerouslySetInnerHTML={{__html: svgContent}}
            />
        </div>
    )
}

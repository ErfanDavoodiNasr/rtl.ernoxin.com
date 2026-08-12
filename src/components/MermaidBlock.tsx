import {useEffect, useId, useState} from 'react'

interface MermaidBlockProps {
    chart: string
    theme: 'dark' | 'light'
}

let mermaidReady: Promise<typeof import('mermaid').default> | null = null
let lastTheme: 'dark' | 'light' | null = null

async function getMermaid(theme: 'dark' | 'light') {
    if (!mermaidReady) {
        mermaidReady = import('mermaid').then((mod) => mod.default)
    }
    const mermaid = await mermaidReady
    if (lastTheme !== theme) {
        mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
            fontFamily: 'Vazirmatn, sans-serif',
            securityLevel: 'strict',
        })
        lastTheme = theme
    }
    return mermaid
}

export default function MermaidBlock({chart, theme}: MermaidBlockProps) {
    const reactId = useId().replace(/:/g, '')
    const [svgContent, setSvgContent] = useState('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        const uniqueId = `mermaid-${reactId}-${Date.now()}`

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
                if (!cancelled) {
                    setSvgContent(svg)
                    setError(null)
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    const message = err instanceof Error ? err.message : 'خطا در رندر نمودار Mermaid'
                    setError(message)
                    setSvgContent('')
                }
                // Mermaid may leave temporary error DOM nodes
                document.getElementById(uniqueId)?.remove()
                document.getElementById(`d${uniqueId}`)?.remove()
            }
        }

        void renderChart()

        return () => {
            cancelled = true
            document.getElementById(uniqueId)?.remove()
            document.getElementById(`d${uniqueId}`)?.remove()
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
            <div className="mermaid-block-wrapper mermaid-loading" dir="ltr" aria-busy="true">
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

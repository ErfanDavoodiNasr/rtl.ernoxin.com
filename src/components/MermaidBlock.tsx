import {useEffect, useRef, useState} from 'react'
import mermaid from 'mermaid'

interface MermaidBlockProps {
    chart: string
    theme: 'dark' | 'light'
}

let mermaidIdCounter = 0

export default function MermaidBlock({chart, theme}: MermaidBlockProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [svgContent, setSvgContent] = useState<string>('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true
        const uniqueId = `mermaid-svg-${Date.now()}-${++mermaidIdCounter}`

        mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
            fontFamily: 'Vazirmatn, sans-serif',
            securityLevel: 'loose',
        })

        const renderChart = async () => {
            try {
                if (!chart.trim()) return

                const {svg} = await mermaid.render(uniqueId, chart)
                if (isMounted) {
                    setSvgContent(svg)
                    setError(null)
                }
            } catch (err: any) {
                if (isMounted) {
                    console.error('Mermaid Render Error:', err)
                    setError(err?.message || 'خطا در رندر نمودار Mermaid')
                }
            }
        }

        renderChart()

        return () => {
            isMounted = false
            const tempEl = document.getElementById(uniqueId)
            if (tempEl) tempEl.remove()
            const errEl = document.getElementById(`d${uniqueId}`)
            if (errEl) errEl.remove()
        }
    }, [chart, theme])

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

    return (
        <div className="mermaid-block-wrapper" dir="ltr">
            <div
                ref={containerRef}
                className="mermaid-svg-container"
                dangerouslySetInnerHTML={{__html: svgContent}}
            />
        </div>
    )
}

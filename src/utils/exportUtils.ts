/** Strip @font-face so exported HTML stays fully offline (no broken relative font URLs). */
function katexCssOffline(css: string): string {
    return css.replace(/@font-face\s*\{[\s\S]*?\}/g, '')
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export function exportAsMarkdown(content: string, filename = 'document.md') {
    const blob = new Blob([content], {type: 'text/markdown;charset=utf-8'})
    downloadBlob(blob, filename)
}

export async function exportAsHtml(element: HTMLElement, theme: string, filename = 'document.html') {
    const [{default: katexCss}] = await Promise.all([
        import('katex/dist/katex.min.css?raw'),
    ])

    const isDark = theme === 'dark'
    const textColor = isDark ? '#f0f2f7' : '#1a1f2e'
    const bgColor = isDark ? '#0c0e14' : '#f4f6fb'
    const bgSurface = isDark ? '#13161f' : '#ffffff'
    const bgElevated = isDark ? '#1a1e2a' : '#eef1f8'
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
    const accentColor = isDark ? '#3b9eff' : '#2563eb'

    const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>سند فارسی ارنوکسین</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/vazirmatn@33.0.3/Vazirmatn-font-face.css">
    <style>
        ${katexCssOffline(katexCss)}

        :root, [data-theme='dark'] {
            --bg-base: #0c0e14;
            --bg-surface: #13161f;
            --bg-elevated: #1a1e2a;
            --border: rgba(255, 255, 255, 0.08);
            --text-primary: #f0f2f7;
            --text-secondary: #8b93a8;
            --accent: #3b9eff;
            color-scheme: dark;
        }
        [data-theme='light'] {
            --bg-base: #f4f6fb;
            --bg-surface: #ffffff;
            --bg-elevated: #eef1f8;
            --border: rgba(0, 0, 0, 0.08);
            --text-primary: #1a1f2e;
            --text-secondary: #5a6478;
            --accent: #2563eb;
            color-scheme: light;
        }
        body {
            font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, Tahoma, sans-serif;
            background: ${bgColor};
            color: ${textColor};
            direction: rtl;
            padding: 40px 20px;
            margin: 0;
            line-height: 1.8;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: ${bgSurface};
            border: 1px solid ${borderColor};
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        table { width: 100%; border-collapse: collapse; margin: 1em 0; }
        th, td { padding: 8px 12px; border: 1px solid ${borderColor}; text-align: center; }
        th { background: ${bgElevated}; font-weight: bold; }
        pre { background: ${bgElevated}; padding: 16px; border-radius: 8px; overflow-x: auto; direction: ltr; text-align: left; }
        code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: rgba(128,128,128,0.15); padding: 2px 6px; border-radius: 4px; }
        blockquote { border-right: 4px solid ${accentColor}; margin: 1em 0; padding: 8px 16px; background: rgba(59,158,255,0.08); }
        img { max-width: 100%; height: auto; border-radius: 8px; }
        .katex, .katex-display { direction: ltr; unicode-bidi: isolate; }
        .code-block-wrapper { margin: 1em 0; border: 1px solid ${borderColor}; border-radius: 8px; overflow: hidden; direction: ltr; }
        .code-block-header { display: flex; justify-content: space-between; padding: 8px 12px; background: ${bgElevated}; font-size: 0.75rem; }
        .mermaid-block-wrapper { margin: 1.2em 0; text-align: center; }
        .mermaid-svg-container svg { max-width: 100%; height: auto; }
        [dir="ltr"], .bidi-ltr { direction: ltr; text-align: left; }
        [dir="rtl"] { direction: rtl; text-align: right; }
    </style>
</head>
<body>
    <div class="container markdown-body">
        ${element.innerHTML}
    </div>
</body>
</html>`

    downloadBlob(new Blob([htmlContent], {type: 'text/html;charset=utf-8'}), filename)
}

export async function exportAsPng(element: HTMLElement, theme: string, filename = 'document.png') {
    const {default: html2canvas} = await import('html2canvas')
    const bgColor = theme === 'dark' ? '#13161f' : '#ffffff'
    const canvas = await html2canvas(element, {
        backgroundColor: bgColor,
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
    })

    const dataUrl = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

export async function exportAsPdf(element: HTMLElement, theme: string, filename = 'document.pdf') {
    const [{default: html2canvas}, {jsPDF}] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
    ])

    const bgColor = theme === 'dark' ? '#13161f' : '#ffffff'
    const canvas = await html2canvas(element, {
        backgroundColor: bgColor,
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
    })

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Failed to capture content for PDF')
    }

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'})
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10
    const contentWidth = pageWidth - margin * 2
    const contentHeight = pageHeight - margin * 2
    const imgHeight = (canvas.height * contentWidth) / canvas.width

    let heightLeft = imgHeight
    let position = margin

    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight)
    heightLeft -= contentHeight

    while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft)
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight)
        heightLeft -= contentHeight
    }

    pdf.save(filename)
}

import {compactUrl} from './urlCompact'
import {styleLooksSafe} from './styleSafety'

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

export type ExportTheme = 'dark' | 'light'

export function safeExportTheme(theme: string): ExportTheme {
    return theme === 'light' ? 'light' : 'dark'
}

const DROPPED_EXPORT_TAGS = new Set([
    'script',
    'iframe',
    'object',
    'embed',
    'foreignobject',
    'link',
    'meta',
    'base',
    'form',
    'animate',
    'animatetransform',
    'set',
    'use',
    'image',
    'picture',
    'source',
    'video',
    'audio',
    'track',
])

function isSafeExportUrl(value: string): boolean {
    const compact = compactUrl(value.trim())
    if (!compact) return false
    if (compact.startsWith('//')) return false
    if (compact.startsWith('#') || compact.startsWith('/') || compact.startsWith('./') || compact.startsWith('../')) {
        return true
    }
    const lower = compact.toLowerCase()
    if (
        lower.startsWith('javascript:') ||
        lower.startsWith('vbscript:') ||
        lower.startsWith('data:') ||
        lower.startsWith('blob:') ||
        lower.startsWith('file:')
    ) {
        return false
    }
    return /^(https?:|mailto:)/i.test(compact)
}

/** Validate each candidate URL in a srcset attribute. */
function isSafeSrcSet(value: string): boolean {
    const parts = value.split(',').map((part) => part.trim()).filter(Boolean)
    if (parts.length === 0) return false
    for (const part of parts) {
        const url = part.split(/\s+/)[0] || ''
        if (!isSafeExportUrl(url) || !/^https?:/i.test(compactUrl(url.trim()))) {
            return false
        }
    }
    return true
}

/** Remove scriptable SVG/HTML before it is written into an exported file. */
export function sanitizeExportedMarkup(html: string): string {
    const template = document.createElement('template')
    template.innerHTML = html
    const root = template.content

    const toRemove: Element[] = []
    root.querySelectorAll('*').forEach((el) => {
        if (DROPPED_EXPORT_TAGS.has(el.tagName.toLowerCase())) {
            toRemove.push(el)
            return
        }

        const attrNames = Array.from(el.attributes, (attr) => attr.name)
        for (const name of attrNames) {
            const lower = name.toLowerCase()
            if (lower.startsWith('on') || lower === 'srcdoc' || lower === 'formaction') {
                el.removeAttribute(name)
                continue
            }
            if (lower === 'href' || lower === 'xlink:href' || lower === 'src' || lower === 'action') {
                const value = el.getAttribute(name) ?? ''
                if (!isSafeExportUrl(value)) el.removeAttribute(name)
                continue
            }
            if (lower === 'srcset') {
                const value = el.getAttribute(name) ?? ''
                if (!isSafeSrcSet(value)) el.removeAttribute(name)
                continue
            }
            if (lower === 'style') {
                const style = el.getAttribute(name) ?? ''
                if (!styleLooksSafe(style)) el.removeAttribute(name)
            }
        }
    })

    toRemove.forEach((el) => el.remove())
    const wrapper = document.createElement('div')
    wrapper.appendChild(root.cloneNode(true))
    return wrapper.innerHTML
}

export function buildHtmlDocument(options: {
    theme: string
    katexCss: string
    fontCss?: string
    bodyHtml: string
    typography?: {
        fontKey?: string
        fontFamily: string
        fontFamilyEn: string
        fontFamilyAr: string
        fontSize: number
        lineHeight: number
    }
}): string {
    const theme = safeExportTheme(options.theme)
    const isDark = theme === 'dark'
    const textColor = isDark ? '#f0f2f7' : '#1a1f2e'
    const bgColor = isDark ? '#0c0e14' : '#f4f6fb'
    const bgSurface = isDark ? '#13161f' : '#ffffff'
    const bgElevated = isDark ? '#1a1e2a' : '#eef1f8'
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
    const accentColor = isDark ? '#3b9eff' : '#2563eb'
    const safeBody = sanitizeExportedMarkup(options.bodyHtml)
    const typography = options.typography || {
        fontKey: 'Vazirmatn',
        fontFamily: "'Vazirmatn', 'Vazir', sans-serif",
        fontFamilyEn: "'Inter', sans-serif",
        fontFamilyAr: "'Amiri', serif",
        fontSize: 17,
        lineHeight: 2,
    }
    const fontCss = options.fontCss || ''

    // Concatenate only. User HTML and CSS must never be interpolated into a template literal.
    return [
        '<!DOCTYPE html>\n',
        '<html lang="fa" dir="rtl" data-theme="',
        theme,
        '">\n<head>\n',
        '    <meta charset="UTF-8">\n',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n',
        '    <meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: https:; style-src \'unsafe-inline\'; font-src data:; base-uri \'none\'; form-action \'none\'; frame-ancestors \'none\'">\n',
        '    <title>سند فارسی ارنوکسین</title>\n',
        '    <style>\n',
        fontCss,
        '\n',
        options.katexCss,
        '\n        :root, [data-theme=\'dark\'] {\n',
        '            --bg-base: #0c0e14;\n',
        '            --bg-surface: #13161f;\n',
        '            --bg-elevated: #1a1e2a;\n',
        '            --border: rgba(255, 255, 255, 0.08);\n',
        '            --text-primary: #f0f2f7;\n',
        '            --text-secondary: #8b93a8;\n',
        '            --accent: #3b9eff;\n',
        '            --preview-font-family: ',
        typography.fontFamily,
        ';\n',
        '            --preview-font-en: ',
        typography.fontFamilyEn,
        ';\n',
        '            --preview-font-ar: ',
        typography.fontFamilyAr,
        ';\n',
        '            --preview-font-size: ',
        String(typography.fontSize),
        'px;\n',
        '            --preview-line-height: ',
        String(typography.lineHeight),
        ';\n',
        '            color-scheme: dark;\n',
        '        }\n',
        '        [data-theme=\'light\'] {\n',
        '            --bg-base: #f4f6fb;\n',
        '            --bg-surface: #ffffff;\n',
        '            --bg-elevated: #eef1f8;\n',
        '            --border: rgba(0, 0, 0, 0.08);\n',
        '            --text-primary: #1a1f2e;\n',
        '            --text-secondary: #5a6478;\n',
        '            --accent: #2563eb;\n',
        '            color-scheme: light;\n',
        '        }\n',
        '        body {\n',
        '            font-family: var(--preview-font-family);\n',
        '            font-size: var(--preview-font-size);\n',
        '            line-height: var(--preview-line-height);\n',
        '            background: ',
        bgColor,
        ';\n',
        '            color: ',
        textColor,
        ';\n',
        '            direction: rtl;\n',
        '            padding: 40px 20px;\n',
        '            margin: 0;\n',
        '        }\n',
        '        .container {\n',
        '            max-width: 900px;\n',
        '            margin: 0 auto;\n',
        '            background: ',
        bgSurface,
        ';\n',
        '            border: 1px solid ',
        borderColor,
        ';\n',
        '            border-radius: 16px;\n',
        '            padding: 32px;\n',
        '            box-shadow: 0 8px 32px rgba(0,0,0,0.1);\n',
        '        }\n',
        '        .markdown-body { font-family: var(--preview-font-family); font-size: var(--preview-font-size); line-height: var(--preview-line-height); }\n',
        '        .is-english { font-family: var(--preview-font-en); }\n',
        '        .is-arabic { font-family: var(--preview-font-ar); }\n',
        '        table { width: 100%; border-collapse: collapse; margin: 1em 0; }\n',
        '        th, td { padding: 8px 12px; border: 1px solid ',
        borderColor,
        '; text-align: center; }\n',
        '        th { background: ',
        bgElevated,
        '; font-weight: bold; }\n',
        '        pre { background: ',
        bgElevated,
        '; padding: 16px; border-radius: 8px; overflow-x: auto; direction: ltr; text-align: left; }\n',
        '        code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: rgba(128,128,128,0.15); padding: 2px 6px; border-radius: 4px; }\n',
        '        blockquote { border-right: 4px solid ',
        accentColor,
        '; margin: 1em 0; padding: 8px 16px; background: rgba(59,158,255,0.08); }\n',
        '        img { max-width: 100%; height: auto; border-radius: 8px; }\n',
        '        .katex, .katex-display { direction: ltr; unicode-bidi: isolate; }\n',
        '        .code-block-wrapper { margin: 1em 0; border: 1px solid ',
        borderColor,
        '; border-radius: 8px; overflow: hidden; direction: ltr; }\n',
        '        .code-block-header { display: flex; justify-content: space-between; padding: 8px 12px; background: ',
        bgElevated,
        '; font-size: 0.75rem; }\n',
        '        .mermaid-block-wrapper { margin: 1.2em 0; text-align: center; }\n',
        '        .mermaid-svg-container svg { max-width: 100%; height: auto; }\n',
        '        [dir="ltr"], .bidi-ltr { direction: ltr; text-align: left; }\n',
        '        [dir="rtl"] { direction: rtl; text-align: right; }\n',
        '        a[target="_blank"]::after { content: ""; }\n',
        '        @media print {\n',
        '            body { background: white !important; color: black !important; padding: 0; }\n',
        '            .container {\n',
        '                max-width: none; border: none; box-shadow: none; border-radius: 0;\n',
        '                background: white !important; color: black !important; padding: 0;\n',
        '            }\n',
        '            h1, h2, h3, h4 { break-after: avoid-page; page-break-after: avoid; }\n',
        '            table, pre, .mermaid-block-wrapper, .katex-display, blockquote {\n',
        '                break-inside: avoid; page-break-inside: avoid;\n',
        '            }\n',
        '            tr { break-inside: avoid; page-break-inside: avoid; }\n',
        '            img, svg { max-width: 100% !important; height: auto !important; }\n',
        '        }\n',
        '    </style>\n',
        '</head>\n<body>\n',
        '    <div class="container markdown-body">\n',
        safeBody,
        '\n    </div>\n</body>\n</html>',
    ].join('')
}

export type ExportTypography = {
    fontKey: string
    fontKeyEn?: string
    fontKeyAr?: string
    fontFamily: string
    fontFamilyEn: string
    fontFamilyAr: string
    fontSize: number
    lineHeight: number
}

const DEFAULT_EXPORT_TYPOGRAPHY: ExportTypography = {
    fontKey: 'Vazirmatn',
    fontKeyEn: 'Inter',
    fontKeyAr: 'Amiri',
    fontFamily: "'Vazirmatn', 'Vazir', sans-serif",
    fontFamilyEn: "'Inter', sans-serif",
    fontFamilyAr: "'Amiri', serif",
    fontSize: 17,
    lineHeight: 2,
}

/** Shared offline HTML used by HTML download and print-based PDF. */
export async function buildOfflineExportHtml(
    element: HTMLElement,
    theme: string,
    typography?: ExportTypography,
): Promise<string> {
    const resolvedTypography = typography || DEFAULT_EXPORT_TYPOGRAPHY
    const {loadOfflineExportCss} = await import('./exportAssets')
    const {fontCss, katexCss} = await loadOfflineExportCss(resolvedTypography)
    const body = element.querySelector('.markdown-body')
    const source = body instanceof HTMLElement ? body : element
    return buildHtmlDocument({
        theme,
        katexCss,
        fontCss,
        bodyHtml: source.innerHTML,
        typography: resolvedTypography,
    })
}

export async function exportAsHtml(
    element: HTMLElement,
    theme: string,
    filename = 'document.html',
    typography?: ExportTypography,
) {
    const htmlContent = await buildOfflineExportHtml(element, theme, typography)
    downloadBlob(new Blob([htmlContent], {type: 'text/html;charset=utf-8'}), filename)
}

export const MAX_CANVAS_DIMENSION = 16384
export const MAX_CANVAS_AREA = 128_000_000

export interface CapturePlan {
    scale: number
    truncated: boolean
    captureHeight: number
}

export function chooseCaptureScale(cssWidth: number, cssHeight: number): CapturePlan {
    const width = Math.max(1, Math.ceil(cssWidth))
    const height = Math.max(1, Math.ceil(cssHeight))

    // Prefer 1.5x for PNG sharpness without the old scale=2 / PNG / full-page bloat path used by PDF.
    for (const scale of [1.5, 1]) {
        const canvasWidth = width * scale
        const canvasHeight = height * scale
        if (
            canvasWidth <= MAX_CANVAS_DIMENSION &&
            canvasHeight <= MAX_CANVAS_DIMENSION &&
            canvasWidth * canvasHeight <= MAX_CANVAS_AREA
        ) {
            return {scale, truncated: false, captureHeight: height}
        }
    }

    const maxHeight = Math.max(1, Math.min(MAX_CANVAS_DIMENSION, Math.floor(MAX_CANVAS_AREA / width)))
    const captureHeight = Math.min(height, maxHeight)
    return {scale: 1, truncated: captureHeight < height, captureHeight}
}

export interface PdfSlice {
    srcY: number
    srcHeight: number
}

/** Page slices with a small overlap so text is not cut flush against the page edge. */
export function planPdfSlices(
    canvasHeightPx: number,
    pageContentHeightPx: number,
    overlapPx: number,
): PdfSlice[] {
    if (canvasHeightPx <= 0 || pageContentHeightPx <= 0) return []

    const page = Math.max(1, Math.floor(pageContentHeightPx))
    const overlap = Math.min(Math.max(0, Math.floor(overlapPx)), Math.floor(page / 4))
    const step = Math.max(1, page - overlap)
    const slices: PdfSlice[] = []
    let srcY = 0

    while (srcY < canvasHeightPx) {
        const srcHeight = Math.min(page, canvasHeightPx - srcY)
        slices.push({srcY, srcHeight})
        if (srcY + srcHeight >= canvasHeightPx) break
        srcY += step
    }

    return slices
}

export function createCaptureRoot(source: HTMLElement, background = '#ffffff'): {
    host: HTMLElement
    target: HTMLElement
} {
    const body = source.querySelector('.markdown-body')
    const targetSource = body instanceof HTMLElement ? body : source
    const computed = getComputedStyle(source)
    // Standard A4 document content width (~794px = 210mm at 96 DPI).
    // Clamping width ensures readable line lengths on A4 and prevents huge canvas bloat on ultra-wide screens.
    const width = Math.min(Math.max(targetSource.scrollWidth, 794), 850)

    const host = document.createElement('div')
    host.setAttribute('data-export-capture', 'true')
    host.setAttribute('data-theme', 'light')
    host.style.position = 'fixed'
    host.style.left = `-${width + 120}px`
    host.style.top = '0'
    host.style.zIndex = '-1'
    host.style.pointerEvents = 'none'
    host.style.overflow = 'visible'
    host.style.maxHeight = 'none'
    host.style.height = 'auto'
    host.style.width = `${width}px`
    host.style.boxSizing = 'border-box'
    host.style.padding = '24px'
    host.style.background = background
    host.style.color = '#1a1f2e'
    host.style.colorScheme = 'light'
    host.style.fontFamily = computed.getPropertyValue('--preview-font-family').trim() || computed.fontFamily
    host.style.fontSize = computed.getPropertyValue('--preview-font-size').trim() || computed.fontSize
    host.style.lineHeight = computed.getPropertyValue('--preview-line-height').trim() || computed.lineHeight

    // Explicitly inject light theme tokens so any var(--...) uses clean light colors
    host.style.setProperty('--bg-base', '#f4f6fb')
    host.style.setProperty('--bg-surface', '#ffffff')
    host.style.setProperty('--bg-elevated', '#eef1f8')
    host.style.setProperty('--border', 'rgba(0, 0, 0, 0.08)')
    host.style.setProperty('--border-hover', 'rgba(0, 0, 0, 0.14)')
    host.style.setProperty('--text-primary', '#1a1f2e')
    host.style.setProperty('--text-secondary', '#5a6478')
    host.style.setProperty('--text-muted', '#7e879c')
    host.style.setProperty('--accent', '#2563eb')
    host.style.setProperty('--bg-code-inline', 'rgba(0, 0, 0, 0.06)')
    host.style.setProperty('--bg-table-stripe', 'rgba(0, 0, 0, 0.02)')

    host.style.setProperty('--preview-font-family', computed.getPropertyValue('--preview-font-family'))
    host.style.setProperty('--preview-font-en', computed.getPropertyValue('--preview-font-en'))
    host.style.setProperty('--preview-font-ar', computed.getPropertyValue('--preview-font-ar'))
    host.style.setProperty('--preview-font-size', computed.getPropertyValue('--preview-font-size'))
    host.style.setProperty('--preview-line-height', computed.getPropertyValue('--preview-line-height'))
    host.style.direction = 'rtl'
    host.style.textAlign = 'right'

    const target = targetSource.cloneNode(true) as HTMLElement
    target.style.overflow = 'visible'
    target.style.maxHeight = 'none'
    target.style.height = 'auto'
    target.style.width = '100%'
    target.style.background = 'transparent'
    target.style.color = '#1a1f2e'
    host.appendChild(target)
    return {host, target}
}

export type RasterExportResult = { truncated: boolean }

async function captureElement(
    element: HTMLElement,
): Promise<{ canvas: HTMLCanvasElement; truncated: boolean; background: string }> {
    const {default: html2canvas} = await import('html2canvas')
    const background = '#ffffff'
    const {host, target} = createCaptureRoot(element, background)
    document.body.appendChild(host)

    try {
        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })

        const width = Math.max(host.scrollWidth, target.scrollWidth, 1)
        const fullHeight = Math.max(host.scrollHeight, target.scrollHeight, 1)
        const plan = chooseCaptureScale(width, fullHeight)
        if (plan.truncated) {
            host.style.maxHeight = `${plan.captureHeight}px`
            host.style.overflow = 'hidden'
            target.style.maxHeight = `${plan.captureHeight}px`
            target.style.overflow = 'hidden'
        }

        const canvas = await html2canvas(host, {
            backgroundColor: background,
            scale: plan.scale,
            useCORS: true,
            logging: false,
            allowTaint: false,
            scrollX: 0,
            scrollY: 0,
            windowWidth: width,
            windowHeight: plan.captureHeight,
            width,
            height: plan.captureHeight,
        })

        if (!canvas || canvas.width === 0 || canvas.height === 0) {
            throw new Error('Failed to capture content')
        }

        return {canvas, truncated: plan.truncated, background}
    } finally {
        host.remove()
    }
}

export async function exportAsPng(
    element: HTMLElement,
    _theme = 'light',
    filename = 'document.png',
): Promise<RasterExportResult> {
    const {canvas, truncated} = await captureElement(element)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Failed to encode PNG')
    downloadBlob(blob, filename)
    return {truncated}
}

export type PdfExportResult = RasterExportResult & {
    engine: 'raster-jpeg'
}

const PDF_JPEG_QUALITY = 0.80

function canvasToJpegDataUrl(canvas: HTMLCanvasElement, quality = PDF_JPEG_QUALITY): string {
    return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Direct PDF download (same UX as MD/HTML/PNG).
 * Always exports in clean, crisp white theme at optimized document dimensions.
 */
export async function exportAsPdf(
    element: HTMLElement,
    _theme = 'light',
    filename = 'document.pdf',
): Promise<PdfExportResult> {
    const {jsPDF} = await import('jspdf')
    const {canvas, truncated} = await captureElement(element)
    const background = '#ffffff'

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        putOnlyUsedFonts: true,
    })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10
    const contentWidth = pageWidth - margin * 2
    const contentHeight = pageHeight - margin * 2
    const imgHeightMm = (canvas.height * contentWidth) / canvas.width
    const pxPerMm = canvas.height / imgHeightMm
    const pageContentPx = contentHeight * pxPerMm
    const overlapPx = 4 * pxPerMm
    const slices = planPdfSlices(canvas.height, pageContentPx, overlapPx)

    if (slices.length === 0) {
        throw new Error('Failed to capture content for PDF')
    }

    for (let index = 0; index < slices.length; index++) {
        const slice = slices[index]
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = Math.max(1, slice.srcHeight)
        const ctx = sliceCanvas.getContext('2d')
        if (!ctx) throw new Error('Failed to capture content for PDF')
        ctx.fillStyle = background
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
        ctx.drawImage(
            canvas,
            0,
            slice.srcY,
            canvas.width,
            slice.srcHeight,
            0,
            0,
            canvas.width,
            slice.srcHeight,
        )

        if (index > 0) pdf.addPage()
        const sliceHeightMm = (slice.srcHeight * contentWidth) / canvas.width
        const jpeg = canvasToJpegDataUrl(sliceCanvas)
        pdf.addImage(
            jpeg,
            'JPEG',
            margin,
            margin,
            contentWidth,
            sliceHeightMm,
            undefined,
            'FAST',
        )
        // Release slice canvas backing store promptly on memory-constrained devices.
        sliceCanvas.width = 0
        sliceCanvas.height = 0
    }

    // Prefer blob download (same pattern as MD/HTML) over jsPDF's save() quirks.
    const blob = pdf.output('blob')
    if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error('Failed to build PDF blob')
    }
    downloadBlob(blob, filename)
    // Drop the full-page canvas reference as soon as slicing is done.
    canvas.width = 0
    canvas.height = 0
    return {truncated, engine: 'raster-jpeg'}
}


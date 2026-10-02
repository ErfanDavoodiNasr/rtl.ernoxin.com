async function blobToDataUrl(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`
}

async function fetchAsDataUrl(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to load asset: ${url}`)
    return blobToDataUrl(await response.blob())
}

async function fontFace(
    family: string,
    weight: number,
    style: string,
    url: string,
    format: string,
    unicodeRange?: string,
): Promise<string> {
    const dataUrl = await fetchAsDataUrl(url)
    return [
        '@font-face{',
        `font-family:'${family}';`,
        `font-style:${style};`,
        `font-weight:${weight};`,
        'font-display:swap;',
        `src:url('${dataUrl}') format('${format}');`,
        unicodeRange ? `unicode-range:${unicodeRange};` : '',
        '}',
    ].join('')
}

export interface ReaderTypography {
    fontKey: string
    fontKeyEn?: string
    fontKeyAr?: string
    fontFamily: string
    fontFamilyEn: string
    fontFamilyAr: string
    fontSize: number
    lineHeight: number
}

const ARABIC_RANGE =
    'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC'
const LATIN_RANGE =
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2212,U+2215,U+FEFF,U+FFFD'

const KATEX_WOFF2 = [
    'KaTeX_AMS-Regular.woff2',
    'KaTeX_Caligraphic-Bold.woff2',
    'KaTeX_Caligraphic-Regular.woff2',
    'KaTeX_Fraktur-Bold.woff2',
    'KaTeX_Fraktur-Regular.woff2',
    'KaTeX_Main-Bold.woff2',
    'KaTeX_Main-BoldItalic.woff2',
    'KaTeX_Main-Italic.woff2',
    'KaTeX_Main-Regular.woff2',
    'KaTeX_Math-BoldItalic.woff2',
    'KaTeX_Math-Italic.woff2',
    'KaTeX_SansSerif-Bold.woff2',
    'KaTeX_SansSerif-Italic.woff2',
    'KaTeX_SansSerif-Regular.woff2',
    'KaTeX_Script-Regular.woff2',
    'KaTeX_Size1-Regular.woff2',
    'KaTeX_Size2-Regular.woff2',
    'KaTeX_Size3-Regular.woff2',
    'KaTeX_Size4-Regular.woff2',
    'KaTeX_Typewriter-Regular.woff2',
]

async function loadVazirmatnCss(): Promise<string> {
    const arabic400 = new URL(
        '../../node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-400-normal.woff2',
        import.meta.url,
    ).href
    const latin400 = new URL(
        '../../node_modules/@fontsource/vazirmatn/files/vazirmatn-latin-400-normal.woff2',
        import.meta.url,
    ).href
    const arabic700 = new URL(
        '../../node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-700-normal.woff2',
        import.meta.url,
    ).href
    const latin700 = new URL(
        '../../node_modules/@fontsource/vazirmatn/files/vazirmatn-latin-700-normal.woff2',
        import.meta.url,
    ).href

    return (
        await Promise.all([
            fontFace('Vazirmatn', 400, 'normal', arabic400, 'woff2', ARABIC_RANGE),
            fontFace('Vazirmatn', 400, 'normal', latin400, 'woff2', LATIN_RANGE),
            fontFace('Vazirmatn', 700, 'normal', arabic700, 'woff2', ARABIC_RANGE),
            fontFace('Vazirmatn', 700, 'normal', latin700, 'woff2', LATIN_RANGE),
        ])
    ).join('')
}

async function loadOptionalLocalFont(
    name: string,
    files: Array<{ weight: number; url: string; format: string }>,
): Promise<string> {
    const parts: string[] = []
    for (const file of files) {
        parts.push(await fontFace(name, file.weight, 'normal', file.url, file.format))
    }
    return parts.join('')
}

async function loadFontsourceFamily(
    family: string,
    pkg: string,
    scripts: Array<'latin' | 'arabic'>,
): Promise<string> {
    const faces: string[] = []
    for (const weight of [400, 700] as const) {
        for (const script of scripts) {
            const file = `${pkg}-${script}-${weight}-normal.woff2`
            const url = new URL(
                `../../node_modules/@fontsource/${pkg}/files/${file}`,
                import.meta.url,
            ).href
            faces.push(
                await fontFace(
                    family,
                    weight,
                    'normal',
                    url,
                    'woff2',
                    script === 'arabic' ? ARABIC_RANGE : LATIN_RANGE,
                ),
            )
        }
    }
    return faces.join('')
}

async function loadSecondaryFontCss(name: string): Promise<string> {
    switch (name) {
        case 'Inter':
            return loadFontsourceFamily('Inter', 'inter', ['latin'])
        case 'Roboto':
            return loadFontsourceFamily('Roboto', 'roboto', ['latin'])
        case 'JetBrains Mono':
            return loadFontsourceFamily('JetBrains Mono', 'jetbrains-mono', ['latin'])
        case 'Fira Code':
            return loadFontsourceFamily('Fira Code', 'fira-code', ['latin'])
        case 'Outfit':
            return loadFontsourceFamily('Outfit', 'outfit', ['latin'])
        case 'Amiri':
            return loadFontsourceFamily('Amiri', 'amiri', ['arabic', 'latin'])
        case 'Cairo':
            return loadFontsourceFamily('Cairo', 'cairo', ['arabic', 'latin'])
        case 'Scheherazade New':
            return loadFontsourceFamily('Scheherazade New', 'scheherazade-new', ['arabic', 'latin'])
        case 'Poppins':
            return loadFontsourceFamily('Poppins', 'poppins', ['latin'])
        case 'Plus Jakarta Sans':
            return loadFontsourceFamily('Plus Jakarta Sans', 'plus-jakarta-sans', ['latin'])
        case 'Almarai':
            return loadFontsourceFamily('Almarai', 'almarai', ['arabic'])
        case 'Readex Pro':
            return loadFontsourceFamily('Readex Pro', 'readex-pro', ['arabic', 'latin'])
        case 'Noto Sans Arabic':
            return loadFontsourceFamily('Noto Sans Arabic', 'noto-sans-arabic', ['arabic'])
        case 'Noto Naskh Arabic':
            return loadFontsourceFamily('Noto Naskh Arabic', 'noto-naskh-arabic', ['arabic'])
        default:
            return ''
    }
}

async function loadReaderFontCss(typography: ReaderTypography): Promise<string> {
    const chunks: string[] = [
        await loadVazirmatnCss(),
        await loadSecondaryFontCss(typography.fontKeyEn ?? 'Inter'),
        await loadSecondaryFontCss(typography.fontKeyAr ?? 'Amiri'),
    ]

    switch (typography.fontKey) {
        case 'Shabnam':
            chunks.push(
                await loadOptionalLocalFont('Shabnam', [
                    {
                        weight: 400,
                        url: new URL('../assets/fonts/Shabnam.woff2', import.meta.url).href,
                        format: 'woff2',
                    },
                    {
                        weight: 700,
                        url: new URL('../assets/fonts/Shabnam-Bold.woff2', import.meta.url).href,
                        format: 'woff2',
                    },
                ]),
            )
            break
        case 'Samim':
            chunks.push(
                await loadOptionalLocalFont('Samim', [
                    {
                        weight: 400,
                        url: new URL('../assets/fonts/Samim.woff2', import.meta.url).href,
                        format: 'woff2',
                    },
                    {
                        weight: 700,
                        url: new URL('../assets/fonts/Samim-Bold.woff2', import.meta.url).href,
                        format: 'woff2',
                    },
                ]),
            )
            break
        case 'Sahel':
            chunks.push(
                await loadOptionalLocalFont('Sahel', [
                    {
                        weight: 400,
                        url: new URL('../assets/fonts/Sahel.woff2', import.meta.url).href,
                        format: 'woff2',
                    },
                    {
                        weight: 700,
                        url: new URL('../assets/fonts/Sahel-Bold.woff2', import.meta.url).href,
                        format: 'woff2',
                    },
                ]),
            )
            break
        case 'Lalezar':
            chunks.push(
                await loadOptionalLocalFont('Lalezar', [
                    {
                        weight: 400,
                        url: new URL('../assets/fonts/Lalezar.ttf', import.meta.url).href,
                        format: 'truetype',
                    },
                ]),
            )
            break
        case 'Noto Sans Arabic':
            chunks.push(await loadSecondaryFontCss('Noto Sans Arabic'))
            break
        case 'Noto Naskh Arabic':
            chunks.push(await loadSecondaryFontCss('Noto Naskh Arabic'))
            break
        default:
            break
    }

    return chunks.join('')
}

async function loadKatexCssOffline(): Promise<string> {
    const [{default: katexCssRaw}, fontEntries] = await Promise.all([
        import('katex/dist/katex.min.css?raw'),
        Promise.all(
            KATEX_WOFF2.map(async (file) => {
                const url = new URL(`../../node_modules/katex/dist/fonts/${file}`, import.meta.url).href
                return [file, await fetchAsDataUrl(url)] as const
            }),
        ),
    ])
    const dataUrls = Object.fromEntries(fontEntries)

    return katexCssRaw.replace(/url\((['"]?)([^)'"]+)\1\)/g, (_full, _q: string, raw: string) => {
        const file = raw.replace(/^\.\//, '').split('/').pop() || raw
        const dataUrl = dataUrls[file]
        // Drop unresolved font URLs so export CSP (font-src data:) is not violated by leftovers.
        return dataUrl ? `url('${dataUrl}')` : 'local(none)'
    })
}

export async function loadOfflineExportCss(typography: ReaderTypography): Promise<{
    fontCss: string
    katexCss: string
}> {
    const [fontCss, katexCss] = await Promise.all([
        loadReaderFontCss(typography),
        loadKatexCssOffline(),
    ])
    return {fontCss, katexCss}
}

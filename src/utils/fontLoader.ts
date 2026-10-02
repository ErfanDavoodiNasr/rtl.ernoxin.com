/** Lazy-load font CSS only when the user selects a non-default family. */

const inflight = new Map<string, Promise<void>>()

async function loadOnce(key: string, loader: () => Promise<unknown>): Promise<void> {
    const existing = inflight.get(key)
    if (existing) return existing

    const promise = loader()
        .then(() => undefined)
        .catch((err: unknown) => {
            inflight.delete(key)
            throw err
        })
    inflight.set(key, promise)
    return promise
}

export async function loadFontFamily(name: string): Promise<void> {
    switch (name) {
        case 'System':
        case 'VazirCode':
            return
        case 'Vazirmatn':
            // Already in the critical CSS bundle
            inflight.set('Vazirmatn', Promise.resolve())
            return
        case 'Shabnam':
            await loadOnce('Shabnam', () => import('../assets/fonts/shabnam.css'))
            break
        case 'Samim':
            await loadOnce('Samim', () => import('../assets/fonts/samim.css'))
            break
        case 'Sahel':
            await loadOnce('Sahel', () => import('../assets/fonts/sahel.css'))
            break
        case 'Lalezar':
            await loadOnce('Lalezar', () => import('../assets/fonts/lalezar.css'))
            break
        case 'Inter':
            await loadOnce('Inter', async () => {
                await import('@fontsource/inter/400.css')
                await import('@fontsource/inter/700.css')
            })
            break
        case 'Roboto':
            await loadOnce('Roboto', async () => {
                await import('@fontsource/roboto/400.css')
                await import('@fontsource/roboto/700.css')
            })
            break
        case 'JetBrains Mono':
            await loadOnce('JetBrains Mono', async () => {
                await import('@fontsource/jetbrains-mono/400.css')
                await import('@fontsource/jetbrains-mono/700.css')
            })
            break
        case 'Fira Code':
            await loadOnce('Fira Code', async () => {
                await import('@fontsource/fira-code/400.css')
                await import('@fontsource/fira-code/700.css')
            })
            break
        case 'Outfit':
            await loadOnce('Outfit', async () => {
                await import('@fontsource/outfit/400.css')
                await import('@fontsource/outfit/700.css')
            })
            break
        case 'Amiri':
            await loadOnce('Amiri', async () => {
                await import('@fontsource/amiri/400.css')
                await import('@fontsource/amiri/700.css')
            })
            break
        case 'Cairo':
            await loadOnce('Cairo', async () => {
                await import('@fontsource/cairo/400.css')
                await import('@fontsource/cairo/700.css')
            })
            break
        case 'Scheherazade New':
            await loadOnce('Scheherazade New', async () => {
                await import('@fontsource/scheherazade-new/400.css')
                await import('@fontsource/scheherazade-new/700.css')
            })
            break
        case 'Noto Sans Arabic':
            await loadOnce('Noto Sans Arabic', async () => {
                await import('@fontsource/noto-sans-arabic/400.css')
                await import('@fontsource/noto-sans-arabic/700.css')
            })
            break
        case 'Noto Naskh Arabic':
            await loadOnce('Noto Naskh Arabic', async () => {
                await import('@fontsource/noto-naskh-arabic/400.css')
                await import('@fontsource/noto-naskh-arabic/700.css')
            })
            break
        case 'Poppins':
            await loadOnce('Poppins', async () => {
                await import('@fontsource/poppins/400.css')
                await import('@fontsource/poppins/700.css')
            })
            break
        case 'Plus Jakarta Sans':
            await loadOnce('Plus Jakarta Sans', async () => {
                await import('@fontsource/plus-jakarta-sans/400.css')
                await import('@fontsource/plus-jakarta-sans/700.css')
            })
            break
        case 'Almarai':
            await loadOnce('Almarai', async () => {
                await import('@fontsource/almarai/400.css')
                await import('@fontsource/almarai/700.css')
            })
            break
        case 'Readex Pro':
            await loadOnce('Readex Pro', async () => {
                await import('@fontsource/readex-pro/400.css')
                await import('@fontsource/readex-pro/700.css')
            })
            break
    }
}

export interface FontSettings {
    fontFamily: string
    fontFamilyEn: string
    fontFamilyAr: string
}

export async function loadFontsForSettings(settings: FontSettings): Promise<void> {
    const run = () =>
        Promise.all([
            loadFontFamily(settings.fontFamily),
            loadFontFamily(settings.fontFamilyEn),
            loadFontFamily(settings.fontFamilyAr),
        ])

    // Defer secondary fonts so first paint isn't blocked
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => {
            void run()
        }, {timeout: 1500})
    } else {
        setTimeout(() => {
            void run()
        }, 50)
    }
}

export async function ensureFontsReady(settings: FontSettings): Promise<void> {
    await Promise.all([
        loadFontFamily(settings.fontFamily),
        loadFontFamily(settings.fontFamilyEn),
        loadFontFamily(settings.fontFamilyAr),
    ])
    if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready
    }
}

export function ensureMonoFont(): void {
    void loadFontFamily('JetBrains Mono')
}

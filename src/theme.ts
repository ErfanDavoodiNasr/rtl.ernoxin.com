export function initTheme() {
    const saved = localStorage.getItem('arnooxine-theme')
    const theme =
        saved === 'light' || saved === 'dark'
            ? saved
            : window.matchMedia('(prefers-color-scheme: light)').matches
                ? 'light'
                : 'dark'
    document.documentElement.setAttribute('data-theme', theme)
}

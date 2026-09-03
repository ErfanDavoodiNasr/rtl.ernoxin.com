import {loadTheme} from './utils/storageUtils'

export function initTheme() {
    document.documentElement.setAttribute('data-theme', loadTheme())
}

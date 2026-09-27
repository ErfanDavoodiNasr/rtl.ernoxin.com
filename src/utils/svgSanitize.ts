import {compactUrl} from './urlCompact'
import {styleLooksSafe} from './styleSafety'

const DROPPED_SVG_TAGS = new Set([
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
])

/** Mermaid SVGs may keep in-document fragment refs; never keep absolute URLs. */
function isSafeSvgUrl(value: string): boolean {
    const compact = compactUrl(value.trim())
    return Boolean(compact) && compact.startsWith('#')
}

/** Second-pass filter for Mermaid SVG before it is inserted into the page. */
export function sanitizeSvg(svg: string): string {
    const template = document.createElement('template')
    template.innerHTML = svg

    const toRemove: Element[] = []
    template.content.querySelectorAll('*').forEach((el) => {
        if (DROPPED_SVG_TAGS.has(el.tagName.toLowerCase())) {
            toRemove.push(el)
            return
        }

        for (const name of Array.from(el.attributes, (attr) => attr.name)) {
            const lower = name.toLowerCase()
            if (lower.startsWith('on') || lower === 'srcdoc') {
                el.removeAttribute(name)
                continue
            }
            if (lower === 'href' || lower === 'xlink:href' || lower === 'src') {
                const value = el.getAttribute(name) ?? ''
                if (!isSafeSvgUrl(value)) el.removeAttribute(name)
            }
            if (lower === 'style') {
                const style = el.getAttribute(name) ?? ''
                if (!styleLooksSafe(style)) el.removeAttribute(name)
            }
        }
    })

    toRemove.forEach((el) => el.remove())
    const wrapper = document.createElement('div')
    wrapper.appendChild(template.content)
    return wrapper.innerHTML
}

import {createElement, type HTMLAttributes, lazy, type ReactNode, Suspense, useEffect, useMemo, useState,} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, {defaultSchema} from 'rehype-sanitize'
import remarkMath from 'remark-math'
import {getBidiTextProps} from '../utils/bidiUtils'
import {loadKatexPlugin} from '../utils/katexLoader'
import {markdownNeedsKatex} from '../utils/previewReady'
import {styleLooksSafe} from '../utils/styleSafety'
import {isExternalHttpUrl, safeMarkdownUrl} from '../utils/urlSafety'

const MermaidBlock = lazy(() => import('./MermaidBlock'))
const CodeBlock = lazy(() => import('./CodeBlock'))

const remarkPlugins = [remarkGfm, remarkBreaks, remarkMath]

type AttrItem = string | [string, ...Array<string | number | boolean | RegExp | null | undefined>]
type AttrList = AttrItem[]

function withoutStyle(list: AttrList | undefined): AttrList {
    return (list || []).filter((item: AttrItem) => {
        const name = typeof item === 'string' ? item : item[0]
        return name !== 'style'
    })
}

const DROPPED_DEFAULT_TAGS = new Set(['picture', 'source', 'video', 'audio', 'track', 'input', 'textarea', 'select', 'option'])

const sanitizeSchema = {
    ...defaultSchema,
    tagNames: [
        ...(defaultSchema.tagNames || []).filter((tag) => !DROPPED_DEFAULT_TAGS.has(tag)),
        'math',
        'semantics',
        'mrow',
        'mi',
        'mo',
        'mn',
        'msup',
        'msub',
        'msubsup',
        'mfrac',
        'msqrt',
        'mroot',
        'mtable',
        'mtr',
        'mtd',
        'mspace',
        'mstyle',
        'mtext',
        'menclose',
        'annotation',
        'span',
        'div',
        'svg',
        'path',
        'rect',
        'circle',
        'polyline',
        'line',
        'details',
        'summary',
        'kbd',
        'mark',
        'sub',
        'sup',
    ],
    attributes: {
        ...defaultSchema.attributes,
        '*': [
            ...withoutStyle(defaultSchema.attributes?.['*'] as AttrList | undefined).filter((item: AttrItem) => {
                const name = typeof item === 'string' ? item : item[0]
                // Drop class/className globally (re-add per-tag). Drop action (no forms allowed).
                return name !== 'className' && name !== 'class' && name !== 'action'
            }),
            'dir',
            'ariaHidden',
            'aria-hidden',
            'title',
            'role',
        ],
        code: [...withoutStyle(defaultSchema.attributes?.code as AttrList | undefined), 'className', 'class', ['className', /^language-/] as AttrItem],
        // style kept for KaTeX layout; values scrubbed by rehypeSafeStyles after sanitize.
        span: [...withoutStyle(defaultSchema.attributes?.span as AttrList | undefined), 'className', 'class', 'style'],
        div: [...withoutStyle(defaultSchema.attributes?.div as AttrList | undefined), 'className', 'class', 'style'],
        math: ['xmlns', 'display'],
        annotation: ['encoding'],
        mi: ['mathvariant'],
        mo: ['stretchy', 'fence', 'separator', 'lspace', 'rspace'],
        mspace: ['width', 'height', 'depth'],
        mstyle: ['mathcolor', 'mathbackground', 'displaystyle', 'scriptlevel'],
        mtable: ['align', 'columnalign', 'rowalign', 'columnspacing', 'rowspacing'],
        mtd: ['columnalign', 'rowalign'],
        semantics: [],
        table: [...withoutStyle(defaultSchema.attributes?.table as AttrList | undefined), 'className', 'class', 'align'],
        th: [...withoutStyle(defaultSchema.attributes?.th as AttrList | undefined), 'align'],
        td: [...withoutStyle(defaultSchema.attributes?.td as AttrList | undefined), 'align'],
        svg: ['viewBox', 'width', 'height', 'xmlns', 'fill', 'stroke', 'role', 'aria-hidden', 'focusable'],
        path: ['d', 'fill', 'stroke'],
        rect: ['x', 'y', 'width', 'height', 'fill', 'stroke'],
        circle: ['cx', 'cy', 'r', 'fill', 'stroke'],
        polyline: ['points', 'fill', 'stroke'],
        line: ['x1', 'y1', 'x2', 'y2', 'stroke'],
        a: [...withoutStyle(defaultSchema.attributes?.a as AttrList | undefined).filter((item: AttrItem) => {
            const name = typeof item === 'string' ? item : item[0]
            return name !== 'target' && name !== 'className' && name !== 'class'
        }), 'href', 'title', 'rel'],
        img: [...withoutStyle(defaultSchema.attributes?.img as AttrList | undefined), 'src', 'alt', 'title', 'width', 'height'],
        // Explicit empty list so inherited srcSet cannot sneak back in.
        source: [],
    },
    protocols: {
        ...(defaultSchema.protocols || {}),
        href: ['http', 'https', 'mailto'],
        src: ['https'],
        // Defense in depth if source/srcSet is ever re-enabled.
        srcSet: ['https'],
        cite: ['http', 'https'],
    },
}

type HastNode = {
    type?: string
    tagName?: string
    properties?: Record<string, unknown>
    children?: HastNode[]
}

/** Drop style attributes that contain network/data paint servers (CSS beacons). */
function rehypeSafeStyles() {
    return (tree: HastNode) => {
        const walk = (node: HastNode) => {
            if (node.type === 'element' && node.properties && 'style' in node.properties) {
                const style = String(node.properties.style ?? '')
                if (!style || !styleLooksSafe(style)) {
                    delete node.properties.style
                }
            }
            node.children?.forEach(walk)
        }
        walk(tree)
    }
}

function extractPlainText(node: ReactNode): string {
    if (!node) return ''
    if (typeof node === 'string' || typeof node === 'number') return String(node)
    if (Array.isArray(node)) return node.map(extractPlainText).join('')
    if (typeof node === 'object' && node !== null && 'props' in node) {
        const el = node as {
            type?: string | { name?: string }
            props?: { children?: ReactNode; className?: string | string[] }
        }
        const rawClass = el.props?.className
        const cls = Array.isArray(rawClass)
            ? rawClass.join(' ')
            : typeof rawClass === 'string'
                ? rawClass
                : ''
        if (/\b(katex|katex-display|math|mermaid|code-block|code-block-wrapper)\b/.test(cls)) {
            return ''
        }
        const typeName = typeof el.type === 'string' ? el.type : el.type?.name
        if (typeName === 'code' || typeName === 'pre') return ''
        return extractPlainText(el.props?.children)
    }
    return ''
}

function createBidiBlockComponent(
    tag: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote' | 'td' | 'th',
) {
    return ({children, className, ...props}: HTMLAttributes<HTMLElement> & { children?: ReactNode }) =>
        createElement(
            tag,
            {
                ...props,
                ...getBidiTextProps(extractPlainText(children), className),
            },
            children,
        )
}

function BidiListItem({
                          children,
                          className,
                          ...props
                      }: HTMLAttributes<HTMLLIElement> & { children?: ReactNode }) {
    const bidi = getBidiTextProps(extractPlainText(children), className)
    const liClass = [className, bidi.className?.replace(/\bbidi-ltr\b/g, '').trim()]
        .filter(Boolean)
        .join(' ')
        .trim()
    return (
        <li {...props} className={liClass || undefined} style={bidi.style}>
            <span dir={bidi.dir} className="bidi-item-text">
                {children}
            </span>
        </li>
    )
}

export interface MarkdownPreviewProps {
    markdown: string
    theme: 'dark' | 'light'
}

export default function MarkdownPreview({markdown, theme}: MarkdownPreviewProps) {
    const needsKatex = useMemo(() => markdownNeedsKatex(markdown), [markdown])
    const [rehypeKatexPlugin, setRehypeKatexPlugin] = useState<((...args: unknown[]) => unknown) | null>(
        null,
    )
    const [katexStatus, setKatexStatus] = useState<'pending' | 'ready' | 'error'>(
        needsKatex ? 'pending' : 'ready',
    )

    useEffect(() => {
        if (!needsKatex) {
            setKatexStatus('ready')
            return
        }
        if (rehypeKatexPlugin) {
            const frame = requestAnimationFrame(() => setKatexStatus('ready'))
            return () => cancelAnimationFrame(frame)
        }

        let cancelled = false
        setKatexStatus('pending')
        void loadKatexPlugin()
            .then((plugin) => {
                if (!cancelled) {
                    setRehypeKatexPlugin(() => plugin as (...args: unknown[]) => unknown)
                }
            })
            .catch(() => {
                if (!cancelled) setKatexStatus('error')
            })
        return () => {
            cancelled = true
        }
    }, [needsKatex, rehypeKatexPlugin])

    const rehypePlugins = useMemo(() => {
        // Sanitize must run after KaTeX so generated MathML/HTML cannot bypass the allow-list.
        const plugins: unknown[] = [rehypeRaw]
        if (rehypeKatexPlugin) {
            plugins.push([
                rehypeKatexPlugin,
                {strict: 'ignore', throwOnError: false, trust: false},
            ])
        }
        plugins.push([rehypeSanitize, sanitizeSchema])
        plugins.push(rehypeSafeStyles)
        return plugins
    }, [rehypeKatexPlugin])

    const components = useMemo(
        () => ({
            pre: ({children}: { children?: ReactNode }) => <>{children}</>,
            table: ({
                        children,
                        ...props
                    }: HTMLAttributes<HTMLTableElement> & { children?: ReactNode }) => (
                <div className="table-responsive">
                    <table {...props}>{children}</table>
                </div>
            ),
            a: ({
                    children,
                    href,
                    ...props
                }: HTMLAttributes<HTMLAnchorElement> & { children?: ReactNode; href?: string }) => {
                const safeHref = href && href.length > 0 ? href : undefined
                const external = isExternalHttpUrl(safeHref)
                return (
                    <a
                        {...props}
                        href={safeHref}
                        target={external ? '_blank' : undefined}
                        rel={external ? 'noopener noreferrer' : undefined}
                    >
                        {children}
                    </a>
                )
            },
            img: ({
                      src,
                      alt,
                      ...props
                  }: HTMLAttributes<HTMLImageElement> & { src?: string; alt?: string }) => {
                if (!src) return null
                return <img {...props} src={src} alt={alt ?? ''}/>
            },
            p: createBidiBlockComponent('p'),
            li: BidiListItem,
            h1: createBidiBlockComponent('h1'),
            h2: createBidiBlockComponent('h2'),
            h3: createBidiBlockComponent('h3'),
            h4: createBidiBlockComponent('h4'),
            blockquote: createBidiBlockComponent('blockquote'),
            td: createBidiBlockComponent('td'),
            th: createBidiBlockComponent('th'),
            code({
                     children,
                     className,
                     ...rest
                 }: HTMLAttributes<HTMLElement> & { children?: ReactNode; className?: string }) {
                const match = /(?:^|\s)language-([^\s]+)/.exec(className || '')
                const language = match ? match[1] : ''
                const content = String(children ?? '').replace(/\n$/, '')

                // Math nodes can appear as language-math before/without KaTeX; never treat as code.
                if (language === 'math' || language === 'latex' || language === 'katex') {
                    return (
                        <code {...rest} className={className}>
                            {children}
                        </code>
                    )
                }

                if (language === 'mermaid') {
                    return (
                        <Suspense
                            fallback={
                                <div
                                    className="mermaid-block-wrapper mermaid-loading"
                                    dir="ltr"
                                    aria-busy="true"
                                    data-preview-pending="true"
                                >
                                    <span className="mermaid-loading-text">در حال رسم نمودار…</span>
                                </div>
                            }
                        >
                            <MermaidBlock chart={content} theme={theme}/>
                        </Suspense>
                    )
                }

                if (match) {
                    return (
                        <Suspense
                            fallback={
                                <pre className="code-block-fallback" dir="ltr" data-preview-pending="true"
                                     aria-busy="true">
                                    <code>{content}</code>
                                </pre>
                            }
                        >
                            <CodeBlock language={language || 'text'} value={content} theme={theme}/>
                        </Suspense>
                    )
                }

                return (
                    <code {...rest} className={className}>
                        {children}
                    </code>
                )
            },
        }),
        [theme],
    )

    return (
        <div data-katex-status={katexStatus}>
            <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins as never}
                urlTransform={safeMarkdownUrl}
                components={components}
            >
                {markdown}
            </ReactMarkdown>
        </div>
    )
}

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

const MermaidBlock = lazy(() => import('./MermaidBlock'))
const CodeBlock = lazy(() => import('./CodeBlock'))

const remarkPlugins = [remarkGfm, remarkBreaks, remarkMath]

const sanitizeSchema = {
    ...defaultSchema,
    tagNames: [
        ...(defaultSchema.tagNames || []),
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
            ...(defaultSchema.attributes?.['*'] || []),
            'className',
            'class',
            'dir',
            'ariaHidden',
            'aria-hidden',
            'title',
            'role',
        ],
        code: [...(defaultSchema.attributes?.code || []), 'className', 'class', 'language*'],
        span: [...(defaultSchema.attributes?.span || []), 'className', 'class', 'style'],
        div: [...(defaultSchema.attributes?.div || []), 'className', 'class'],
        table: [...(defaultSchema.attributes?.table || []), 'className', 'class', 'align'],
        th: [...(defaultSchema.attributes?.th || []), 'align'],
        td: [...(defaultSchema.attributes?.td || []), 'align'],
        svg: ['viewBox', 'width', 'height', 'xmlns', 'className', 'class', 'fill', 'stroke', 'role'],
        path: ['d', 'fill', 'stroke', 'className', 'class'],
        rect: ['x', 'y', 'width', 'height', 'fill', 'stroke', 'className', 'class'],
        circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'className', 'class'],
        polyline: ['points', 'fill', 'stroke', 'className', 'class'],
        line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'className', 'class'],
        a: [...(defaultSchema.attributes?.a || []), 'href', 'title', 'rel'],
        img: [...(defaultSchema.attributes?.img || []), 'src', 'alt', 'title', 'width', 'height'],
    },
    protocols: {
        ...(defaultSchema.protocols || {}),
        href: ['http', 'https', 'mailto'],
        src: ['http', 'https'],
        cite: ['http', 'https'],
    },
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

    useEffect(() => {
        if (!needsKatex || rehypeKatexPlugin) return
        let cancelled = false
        void loadKatexPlugin().then((plugin) => {
            if (!cancelled) {
                setRehypeKatexPlugin(() => plugin as (...args: unknown[]) => unknown)
            }
        })
        return () => {
            cancelled = true
        }
    }, [needsKatex, rehypeKatexPlugin])

    const rehypePlugins = useMemo(() => {
        const plugins: unknown[] = [rehypeRaw, [rehypeSanitize, sanitizeSchema]]
        if (rehypeKatexPlugin) {
            plugins.push([rehypeKatexPlugin, {strict: false, throwOnError: false}])
        }
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

                if (language === 'mermaid') {
                    return (
                        <Suspense
                            fallback={
                                <div
                                    className="mermaid-block-wrapper mermaid-loading"
                                    dir="ltr"
                                    aria-busy="true"
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
                                <pre className="code-block-fallback" dir="ltr">
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
        <ReactMarkdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins as never}
            components={components}
        >
            {markdown}
        </ReactMarkdown>
    )
}

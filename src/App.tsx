import {useCallback, useEffect, useRef, useState} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import Logo from './components/Logo'
import CodeBlock from './components/CodeBlock'
import './App.css'

type ViewMode = 'preview' | 'raw'
type Theme = 'dark' | 'light'

const THEME_KEY = 'arnooxine-theme'

function getInitialTheme(): Theme {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function preprocessAsciiTables(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let inTable = false;
    let inCodeBlock = false;
    let tableLines: string[] = [];

    const isBorder = (line: string) => /(?=.*[\-\_])^[\+\-\_\|\s\=]+$/.test(line.trim());
    const isData = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed.includes('|')) return false;
        if (isBorder(line)) return false;
        const pipes = (trimmed.match(/\|/g) || []).length;
        return pipes >= 2 || (trimmed.startsWith('|') && trimmed.endsWith('|'));
    };

    const processTable = (lines: string[]): string[] => {
        const dataLines = lines.filter(line => !isBorder(line));
        if (dataLines.length === 0) return lines;

        const res: string[] = [];
        let header = dataLines[0].trim();
        if (!header.startsWith('|')) header = '| ' + header;
        if (!header.endsWith('|')) header = header + ' |';
        res.push(header);

        const colCount = (header.match(/\|/g) || []).length - 1;
        const separator = '|' + Array(Math.max(1, colCount)).fill('---').join('|') + '|';
        res.push(separator);

        for (let i = 1; i < dataLines.length; i++) {
            let row = dataLines[i].trim();
            if (!row.startsWith('|')) row = '| ' + row;
            if (!row.endsWith('|')) row = row + ' |';
            res.push(row);
        }
        return res;
    };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
            inCodeBlock = !inCodeBlock;
            if (inTable) {
                result.push(...processTable(tableLines));
                tableLines = [];
                inTable = false;
            }
            result.push(line);
            continue;
        }

        if (inCodeBlock) {
            result.push(line);
            continue;
        }

        // Fix for ChatGPT/Claude math delimiters
        line = line.split('\\[').join('$$');
        line = line.split('\\]').join('$$');
        line = line.split('\\(').join('$');
        line = line.split('\\)').join('$');
        
        if (!inTable) {
            if (isBorder(line) && i + 1 < lines.length && isData(lines[i+1])) {
                inTable = true;
                tableLines.push(line);
            } else if (isData(line) && i + 1 < lines.length && isBorder(lines[i+1])) {
                inTable = true;
                tableLines.push(line);
            } else {
                result.push(line);
            }
        } else {
            if (isBorder(line) || isData(line)) {
                tableLines.push(line);
            } else {
                result.push(...processTable(tableLines));
                tableLines = [];
                inTable = false;
                result.push(line);
            }
        }
    }

    if (tableLines.length > 0) {
        result.push(...processTable(tableLines));
    }

    return result.join('\n');
}

export default function App() {
    const [text, setText] = useState('')
    const [viewMode, setViewMode] = useState<ViewMode>('preview')
    const [theme, setTheme] = useState<Theme>(getInitialTheme)
    const [toast, setToast] = useState<string | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const showToast = useCallback((message: string) => {
        setToast(message)
        setTimeout(() => setToast(null), 2200)
    }, [])

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    }, [])

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem(THEME_KEY, theme)
    }, [theme])

    const handlePaste = useCallback(async () => {
        try {
            const clip = await navigator.clipboard.readText()
            if (clip) {
                setText(clip)
                showToast('متن از کلیپ‌بورد جایگذاری شد')
            }
        } catch {
            textareaRef.current?.focus()
            showToast('Ctrl+V را در کادر متن بزنید')
        }
    }, [showToast])

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                setViewMode('preview')
            }
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
                e.preventDefault()
                void handlePaste()
            }
        },
        [handlePaste],
    )

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    const isEmpty = !text.trim()

    return (
        <div className="app">
            <div className="bg-gradient" aria-hidden="true"/>
            <div className="bg-grid" aria-hidden="true"/>

            <header className="header">
                <div className="header-brand">
                    <Logo size={48}/>
                    <h1>نمایشگر فارسی ارنوکسین</h1>
                </div>

                <div className="header-actions">
                    <button
                        type="button"
                        className="btn btn-theme"
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'تم روشن' : 'تم تاریک'}
                        aria-label={theme === 'dark' ? 'تغییر به تم روشن' : 'تغییر به تم تاریک'}
                    >
                        {theme === 'dark' ? <SunIcon/> : <MoonIcon/>}
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => void handlePaste()}
                        title="جایگذاری از کلیپ‌بورد"
                    >
                        <PasteIcon/>
                        جایگذاری
                    </button>
                </div>
            </header>

            <div className="mode-toggle" role="tablist" aria-label="حالت نمایش">
                <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'preview'}
                    className={`mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
                    onClick={() => setViewMode('preview')}
                >
                    <EyeIcon/>
                    پیش‌نمایش
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'raw'}
                    className={`mode-btn ${viewMode === 'raw' ? 'active' : ''}`}
                    onClick={() => setViewMode('raw')}
                >
                    <EditIcon/>
                    ویرایش
                </button>
            </div>

            <main className="workspace">
                {viewMode === 'raw' ? (
                    <section className="panel panel-input" aria-label="ورودی متن">
                        <div className="panel-header">
                            <span className="panel-title">متن خود را اینجا بچسبانید</span>
                            <span className="panel-hint">Ctrl+V یا دکمه جایگذاری</span>
                        </div>
                        <textarea
                            ref={textareaRef}
                            className="textarea"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="متن فارسی خود را اینجا بنویسید یا جایگذاری کنید…"
                            dir="auto"
                            spellCheck={false}
                        />
                    </section>
                ) : (
                    <section className="panel panel-preview" aria-label="پیش‌نمایش">
                        <div className="panel-header">
                            <span className="panel-title">پیش‌نمایش راست‌چین</span>
                        </div>
                        <div className={`preview-content ${isEmpty ? 'empty' : ''}`} dir="rtl">
                            {isEmpty ? (
                                <div className="empty-state">
                                    <div className="empty-icon" aria-hidden="true">
                                        <DocumentIcon/>
                                    </div>
                                    <p>هنوز متنی وارد نشده</p>
                                    <span>متن را در حالت ویرایش جایگذاری کنید یا دکمه جایگذاری را بزنید</span>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => setViewMode('raw')}
                                    >
                                        رفتن به ویرایش
                                    </button>
                                </div>
                            ) : (
                                <article className="markdown-body">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                                        components={{
                                            table: ({node, ...props}) => (
                                                <div className="table-responsive">
                                                    <table {...props} />
                                                </div>
                                            ),
                                            code(props) {
                                                const {children, className, node, ref, ...rest} = props
                                                const match = /language-(\w+)/.exec(className || '')
                                                return match ? (
                                                    <CodeBlock
                                                        language={match[1]}
                                                        value={String(children).replace(/\n$/, '')}
                                                        theme={theme}
                                                    />
                                                ) : (
                                                    <code {...rest} className={className} ref={ref}>
                                                        {children}
                                                    </code>
                                                )
                                            }
                                        }}
                                    >
                                        {preprocessAsciiTables(text)}
                                    </ReactMarkdown>
                                </article>
                            )}
                        </div>
                    </section>
                )}
            </main>

            {toast && (
                <div className="toast" role="status" aria-live="polite">
                    {toast}
                </div>
            )}
        </div>
    )
}

function SunIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
    )
}

function MoonIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
    )
}

function PasteIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        </svg>
    )
}

function EyeIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
    )
}

function EditIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
    )
}

function DocumentIcon() {
    return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
        </svg>
    )
}

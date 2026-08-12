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
import MermaidBlock from './components/MermaidBlock'
import {exportAsHtml, exportAsMarkdown, exportAsPdf, exportAsPng} from './utils/exportUtils'
import {isArabicText, isPureEnglish} from './utils/bidiUtils'
import './App.css'

type ViewMode = 'preview' | 'raw' | 'split'
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
            if (isBorder(line) && i + 1 < lines.length && isData(lines[i + 1])) {
                inTable = true;
                tableLines.push(line);
            } else if (isData(line) && i + 1 < lines.length && isBorder(lines[i + 1])) {
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

interface ReaderSettings {
    fontFamily: string
    fontFamilyEn: string
    fontFamilyAr: string
    fontSize: number
    lineHeight: number
}

const READER_SETTINGS_KEY = 'arnooxine-reader-settings'

const DEFAULT_SETTINGS: ReaderSettings = {
    fontFamily: 'Vazirmatn',
    fontFamilyEn: 'Inter',
    fontFamilyAr: 'Amiri',
    fontSize: 17,
    lineHeight: 2.0,
}

function getFontStack(font: string): string {
    switch (font) {
        case 'Shabnam':
            return "'Shabnam', 'Vazirmatn', sans-serif"
        case 'Samim':
            return "'Samim', 'Vazirmatn', sans-serif"
        case 'Sahel':
            return "'Sahel', 'Vazirmatn', sans-serif"
        case 'Lalezar':
            return "'Lalezar', cursive, sans-serif"
        case 'Yekan':
            return "'B Yekan', 'Yekan', 'Vazirmatn', sans-serif"
        case 'VazirCode':
            return "'Vazirmatn', monospace"
        case 'System':
            return "system-ui, -apple-system, sans-serif"
        case 'Vazirmatn':
        default:
            return "'Vazirmatn', 'Vazir', sans-serif"
    }
}

function getFontStackEn(font: string): string {
    switch (font) {
        case 'Roboto':
            return "'Roboto', sans-serif"
        case 'JetBrains Mono':
            return "'JetBrains Mono', monospace"
        case 'Fira Code':
            return "'Fira Code', monospace"
        case 'Outfit':
            return "'Outfit', sans-serif"
        case 'Inter':
        default:
            return "'Inter', sans-serif"
    }
}

function getFontStackAr(font: string): string {
    switch (font) {
        case 'Cairo':
            return "'Cairo', sans-serif"
        case 'Scheherazade New':
            return "'Scheherazade New', serif"
        case 'Amiri':
        default:
            return "'Amiri', serif"
    }
}

function getInitialReaderSettings(): ReaderSettings {
    try {
        const saved = localStorage.getItem(READER_SETTINGS_KEY)
        if (saved) return {...DEFAULT_SETTINGS, ...JSON.parse(saved)}
    } catch {
        // ignore
    }
    return DEFAULT_SETTINGS
}

export default function App() {
    const [text, setText] = useState('')
    const [viewMode, setViewMode] = useState<ViewMode>('preview')
    const [theme, setTheme] = useState<Theme>(getInitialTheme)
    const [toast, setToast] = useState<string | null>(null)
    const [isExportOpen, setIsExportOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [readerSettings, setReaderSettings] = useState<ReaderSettings>(getInitialReaderSettings)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const previewContentRef = useRef<HTMLDivElement>(null)
    const exportMenuRef = useRef<HTMLDivElement>(null)
    const settingsPopoverRef = useRef<HTMLDivElement>(null)
    const activeScrollRef = useRef<'textarea' | 'preview' | null>(null)
    const scrollTimeoutRef = useRef<number | null>(null)

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

    useEffect(() => {
        document.documentElement.style.setProperty('--preview-font-family', getFontStack(readerSettings.fontFamily))
        document.documentElement.style.setProperty('--preview-font-en', getFontStackEn(readerSettings.fontFamilyEn))
        document.documentElement.style.setProperty('--preview-font-ar', getFontStackAr(readerSettings.fontFamilyAr))
        document.documentElement.style.setProperty('--preview-font-size', `${readerSettings.fontSize}px`)
        document.documentElement.style.setProperty('--preview-line-height', `${readerSettings.lineHeight}`)
        localStorage.setItem(READER_SETTINGS_KEY, JSON.stringify(readerSettings))
    }, [readerSettings])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportOpen(false)
            }
            if (settingsPopoverRef.current && !settingsPopoverRef.current.contains(event.target as Node)) {
                setIsSettingsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleTextareaScroll = useCallback(() => {
        if (viewMode !== 'split' || !textareaRef.current || !previewContentRef.current) return
        if (activeScrollRef.current && activeScrollRef.current !== 'textarea') return

        activeScrollRef.current = 'textarea'
        const textarea = textareaRef.current
        const preview = previewContentRef.current

        const maxTextareaScroll = textarea.scrollHeight - textarea.clientHeight
        const maxPreviewScroll = preview.scrollHeight - preview.clientHeight

        if (maxTextareaScroll > 0 && maxPreviewScroll > 0) {
            const percentage = textarea.scrollTop / maxTextareaScroll
            preview.scrollTop = percentage * maxPreviewScroll
        }

        if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = window.setTimeout(() => {
            activeScrollRef.current = null
        }, 100)
    }, [viewMode])

    const handlePreviewScroll = useCallback(() => {
        if (viewMode !== 'split' || !textareaRef.current || !previewContentRef.current) return
        if (activeScrollRef.current && activeScrollRef.current !== 'preview') return

        activeScrollRef.current = 'preview'
        const textarea = textareaRef.current
        const preview = previewContentRef.current

        const maxTextareaScroll = textarea.scrollHeight - textarea.clientHeight
        const maxPreviewScroll = preview.scrollHeight - preview.clientHeight

        if (maxTextareaScroll > 0 && maxPreviewScroll > 0) {
            const percentage = preview.scrollTop / maxPreviewScroll
            textarea.scrollTop = percentage * maxPreviewScroll
        }

        if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = window.setTimeout(() => {
            activeScrollRef.current = null
        }, 100)
    }, [viewMode])

    const handlePaste = useCallback(async () => {
        try {
            if (!navigator.clipboard) throw new Error('No clipboard API')
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

    const handleExport = useCallback(async (format: 'md' | 'html' | 'pdf' | 'png') => {
        setIsExportOpen(false)
        if (!text.trim()) {
            showToast('متنی برای خروجی گرفتن وجود ندارد')
            return
        }

        try {
            if (format === 'md') {
                exportAsMarkdown(text)
                showToast('فایل Markdown دانلود شد')
            } else if (format === 'html') {
                if (previewContentRef.current) {
                    exportAsHtml(previewContentRef.current, theme)
                    showToast('فایل HTML دانلود شد')
                }
            } else if (format === 'pdf') {
                if (previewContentRef.current) {
                    showToast('در حال ساخت PDF...')
                    await exportAsPdf(previewContentRef.current, theme)
                    showToast('فایل PDF دانلود شد')
                }
            } else if (format === 'png') {
                if (previewContentRef.current) {
                    showToast('در حال ساخت تصویر...')
                    await exportAsPng(previewContentRef.current, theme)
                    showToast('تصویر PNG دانلود شد')
                }
            }
        } catch (err) {
            console.error(err)
            showToast('خطا در دریافت خروجی')
        }
    }, [text, theme, showToast])

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                setViewMode((prev) => (prev === 'split' ? 'preview' : 'preview'))
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

    const renderInputPanel = (
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
                onScroll={handleTextareaScroll}
                placeholder="متن فارسی، فرمول هوش مصنوعی یا کدهای خود را اینجا بنویسید یا جایگذاری کنید…"
                dir="auto"
                spellCheck={false}
            />
        </section>
    )

    const renderPreviewPanel = (
        <section className="panel panel-preview" aria-label="پیش‌نمایش">
            <div className="panel-header">
                <span className="panel-title">پیش‌نمایش راست‌چین</span>
            </div>
            <div
                ref={previewContentRef}
                onScroll={handlePreviewScroll}
                className={`preview-content ${isEmpty ? 'empty' : ''}`}
                dir="rtl"
            >
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
                            onClick={() => setViewMode(viewMode === 'split' ? 'split' : 'raw')}
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
                                p: ({node, ...props}) => {
                                    const textStr = Array.isArray(props.children)
                                        ? props.children.map(c => typeof c === 'string' ? c : '').join('')
                                        : typeof props.children === 'string' ? props.children : ''
                                    const isEng = isPureEnglish(textStr)
                                    const isAr = isArabicText(textStr)
                                    let className = props.className || ''
                                    if (isEng) className += ' bidi-ltr is-english'
                                    else if (isAr) className += ' is-arabic'

                                    return (
                                        <p
                                            dir="auto"
                                            className={className.trim()}
                                            style={
                                                isAr
                                                    ? {fontFamily: 'var(--preview-font-ar)'}
                                                    : isEng
                                                        ? {fontFamily: 'var(--preview-font-en)'}
                                                        : undefined
                                            }
                                            {...props}
                                        />
                                    )
                                },
                                li: ({node, ...props}) => {
                                    const textStr = Array.isArray(props.children)
                                        ? props.children.map(c => typeof c === 'string' ? c : '').join('')
                                        : typeof props.children === 'string' ? props.children : ''
                                    const isEng = isPureEnglish(textStr)
                                    const isAr = isArabicText(textStr)
                                    let className = props.className || ''
                                    if (isEng) className += ' bidi-ltr is-english'
                                    else if (isAr) className += ' is-arabic'

                                    return (
                                        <li
                                            dir="auto"
                                            className={className.trim()}
                                            style={
                                                isAr
                                                    ? {fontFamily: 'var(--preview-font-ar)'}
                                                    : isEng
                                                        ? {fontFamily: 'var(--preview-font-en)'}
                                                        : undefined
                                            }
                                            {...props}
                                        />
                                    )
                                },
                                h1: ({node, ...props}) => <h1 dir="auto" {...props} />,
                                h2: ({node, ...props}) => <h2 dir="auto" {...props} />,
                                h3: ({node, ...props}) => <h3 dir="auto" {...props} />,
                                h4: ({node, ...props}) => <h4 dir="auto" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote dir="auto" {...props} />,
                                code(props) {
                                    const {children, className, node, ref, ...rest} = props
                                    const match = /language-(\w+)/.exec(className || '')
                                    const language = match ? match[1] : ''

                                    if (language === 'mermaid') {
                                        return (
                                            <MermaidBlock
                                                chart={String(children).replace(/\n$/, '')}
                                                theme={theme}
                                            />
                                        )
                                    }

                                    return match ? (
                                        <CodeBlock
                                            language={language}
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
    )

    return (
        <div className="app">
            <div className="bg-gradient" aria-hidden="true"/>
            <div className="bg-grid" aria-hidden="true"/>

            <header className="header">
                <div className="header-brand">
                    <Logo size={44}/>
                    <h1>نمایشگر فارسی ارنوکسین</h1>
                </div>

                <div className="header-actions">
                    <div className="dropdown" ref={settingsPopoverRef}>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setIsSettingsOpen(prev => !prev)}
                            title="تنظیمات ظاهر و تایپوگرافی"
                        >
                            <SlidersIcon/>
                            ظاهر
                        </button>
                        {isSettingsOpen && (
                            <div className="settings-popover" role="dialog" aria-label="تنظیمات تایپوگرافی">
                                <div className="settings-row">
                                    <div className="settings-label">
                                        <span>فونت متن فارسی</span>
                                    </div>
                                    <select
                                        className="settings-select"
                                        value={readerSettings.fontFamily}
                                        onChange={(e) => setReaderSettings(prev => ({
                                            ...prev,
                                            fontFamily: e.target.value
                                        }))}
                                    >
                                        <option value="Vazirmatn">وزیرمتن (پیش‌فرض)</option>
                                        <option value="Shabnam">شبنم</option>
                                        <option value="Samim">صمیم</option>
                                        <option value="Sahel">ساحل</option>
                                        <option value="Lalezar">لاله‌زار</option>
                                        <option value="Yekan">یکان</option>
                                        <option value="VazirCode">وزیر کد (کدنویسی)</option>
                                        <option value="System">فونت سیستم</option>
                                    </select>
                                </div>

                                <div className="settings-row">
                                    <div className="settings-label">
                                        <span>فونت انگلیسی</span>
                                    </div>
                                    <select
                                        className="settings-select"
                                        value={readerSettings.fontFamilyEn || 'Inter'}
                                        onChange={(e) => setReaderSettings(prev => ({
                                            ...prev,
                                            fontFamilyEn: e.target.value
                                        }))}
                                    >
                                        <option value="Inter">Inter (پیش‌فرض)</option>
                                        <option value="Roboto">Roboto</option>
                                        <option value="JetBrains Mono">JetBrains Mono (کد)</option>
                                        <option value="Fira Code">Fira Code (کد)</option>
                                        <option value="Outfit">Outfit</option>
                                    </select>
                                </div>

                                <div className="settings-row">
                                    <div className="settings-label">
                                        <span>فونت عربی</span>
                                    </div>
                                    <select
                                        className="settings-select"
                                        value={readerSettings.fontFamilyAr || 'Amiri'}
                                        onChange={(e) => setReaderSettings(prev => ({
                                            ...prev,
                                            fontFamilyAr: e.target.value
                                        }))}
                                    >
                                        <option value="Amiri">امیری - Amiri (پیش‌فرض)</option>
                                        <option value="Cairo">قاهره - Cairo</option>
                                        <option value="Scheherazade New">شهرزاد - Scheherazade</option>
                                    </select>
                                </div>

                                <div className="settings-row">
                                    <div className="settings-label">
                                        <span>اندازه قلم</span>
                                    </div>
                                    <select
                                        className="settings-select"
                                        value={readerSettings.fontSize}
                                        onChange={(e) => setReaderSettings(prev => ({
                                            ...prev,
                                            fontSize: Number(e.target.value)
                                        }))}
                                    >
                                        <option value={15}>۱۵px (کوچک)</option>
                                        <option value={17}>۱۷px (پیش‌فرض)</option>
                                        <option value={19}>۱۹px (متوسط)</option>
                                        <option value={21}>۲۱px (بزرگ)</option>
                                        <option value={24}>۲۴px (خیلی بزرگ)</option>
                                    </select>
                                </div>

                                <div className="settings-row">
                                    <div className="settings-label">
                                        <span>فاصله خطوط</span>
                                    </div>
                                    <select
                                        className="settings-select"
                                        value={readerSettings.lineHeight}
                                        onChange={(e) => setReaderSettings(prev => ({
                                            ...prev,
                                            lineHeight: Number(e.target.value)
                                        }))}
                                    >
                                        <option value={1.6}>۱.۶ (متراکم)</option>
                                        <option value={1.8}>۱.۸ (استاندارد)</option>
                                        <option value={2.0}>۲.۰ (پیش‌فرض)</option>
                                        <option value={2.2}>۲.۲ (باز)</option>
                                        <option value={2.4}>۲.۴ (خیلی باز)</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="dropdown" ref={exportMenuRef}>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setIsExportOpen(prev => !prev)}
                            disabled={isEmpty}
                            title="خروجی و دانلود"
                        >
                            <DownloadIcon/>
                            خروجی
                            <ChevronDownIcon/>
                        </button>
                        {isExportOpen && (
                            <div className="dropdown-menu" role="menu">
                                <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() => void handleExport('md')}
                                >
                                    <FileTextIcon/>
                                    <span>فایل Markdown (.md)</span>
                                </button>
                                <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() => void handleExport('html')}
                                >
                                    <CodeIcon/>
                                    <span>فایل وب (.html)</span>
                                </button>
                                <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() => void handleExport('pdf')}
                                >
                                    <PdfIcon/>
                                    <span>سند PDF (.pdf)</span>
                                </button>
                                <button
                                    type="button"
                                    className="dropdown-item"
                                    onClick={() => void handleExport('png')}
                                >
                                    <ImageIcon/>
                                    <span>تصویر PNG (.png)</span>
                                </button>
                            </div>
                        )}
                    </div>
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
                    aria-selected={viewMode === 'split'}
                    className={`mode-btn ${viewMode === 'split' ? 'active' : ''}`}
                    onClick={() => setViewMode('split')}
                >
                    <SplitIcon/>
                    دو پنجره
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

            <main className={`workspace mode-${viewMode}`}>
                {viewMode === 'raw' && renderInputPanel}
                {viewMode === 'preview' && renderPreviewPanel}
                {viewMode === 'split' && (
                    <>
                        {renderInputPanel}
                        {renderPreviewPanel}
                    </>
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

function DownloadIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
    )
}

function ChevronDownIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"/>
        </svg>
    )
}

function FileTextIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
        </svg>
    )
}

function CodeIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
        </svg>
    )
}

function PdfIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <path d="M14 2v6h6"/>
            <path d="M9 15h2a1.5 1.5 0 0 0 0-3H9v6"/>
        </svg>
    )
}

function ImageIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
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

function SplitIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="12" y1="3" x2="12" y2="21"/>
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

function SlidersIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="21" x2="4" y2="14"/>
            <line x1="4" y1="10" x2="4" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12" y2="3"/>
            <line x1="20" y1="21" x2="20" y2="16"/>
            <line x1="20" y1="12" x2="20" y2="3"/>
            <line x1="1" y1="14" x2="7" y2="14"/>
            <line x1="9" y1="8" x2="15" y2="8"/>
            <line x1="17" y1="16" x2="23" y2="16"/>
        </svg>
    )
}

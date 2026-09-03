import {useCallback, useEffect, useState} from 'react'
import {PrismLight as SyntaxHighlighter} from 'react-syntax-highlighter'
import {vs, vscDarkPlus} from 'react-syntax-highlighter/dist/esm/styles/prism'
import {ensureMonoFont} from '../utils/fontLoader'

import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c'
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp'
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff'
import docker from 'react-syntax-highlighter/dist/esm/languages/prism/docker'
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go'
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'
import kotlin from 'react-syntax-highlighter/dist/esm/languages/prism/kotlin'
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown'
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup'
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import ruby from 'react-syntax-highlighter/dist/esm/languages/prism/ruby'
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust'
import scss from 'react-syntax-highlighter/dist/esm/languages/prism/scss'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import swift from 'react-syntax-highlighter/dist/esm/languages/prism/swift'
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'

SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('sh', bash)
SyntaxHighlighter.registerLanguage('shell', bash)
SyntaxHighlighter.registerLanguage('zsh', bash)
SyntaxHighlighter.registerLanguage('c', c)
SyntaxHighlighter.registerLanguage('cpp', cpp)
SyntaxHighlighter.registerLanguage('csharp', csharp)
SyntaxHighlighter.registerLanguage('cs', csharp)
SyntaxHighlighter.registerLanguage('css', css)
SyntaxHighlighter.registerLanguage('diff', diff)
SyntaxHighlighter.registerLanguage('docker', docker)
SyntaxHighlighter.registerLanguage('dockerfile', docker)
SyntaxHighlighter.registerLanguage('go', go)
SyntaxHighlighter.registerLanguage('java', java)
SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('js', javascript)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('jsonc', json)
SyntaxHighlighter.registerLanguage('json5', json)
SyntaxHighlighter.registerLanguage('jsx', jsx)
SyntaxHighlighter.registerLanguage('kotlin', kotlin)
SyntaxHighlighter.registerLanguage('markdown', markdown)
SyntaxHighlighter.registerLanguage('md', markdown)
SyntaxHighlighter.registerLanguage('markup', markup)
SyntaxHighlighter.registerLanguage('html', markup)
SyntaxHighlighter.registerLanguage('xml', markup)
SyntaxHighlighter.registerLanguage('svg', markup)
SyntaxHighlighter.registerLanguage('php', php)
SyntaxHighlighter.registerLanguage('python', python)
SyntaxHighlighter.registerLanguage('py', python)
SyntaxHighlighter.registerLanguage('ruby', ruby)
SyntaxHighlighter.registerLanguage('rb', ruby)
SyntaxHighlighter.registerLanguage('rust', rust)
SyntaxHighlighter.registerLanguage('rs', rust)
SyntaxHighlighter.registerLanguage('scss', scss)
SyntaxHighlighter.registerLanguage('sql', sql)
SyntaxHighlighter.registerLanguage('swift', swift)
SyntaxHighlighter.registerLanguage('tsx', tsx)
SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('ts', typescript)
SyntaxHighlighter.registerLanguage('yaml', yaml)
SyntaxHighlighter.registerLanguage('yml', yaml)

interface CodeBlockProps {
    language: string
    value: string
    theme: 'dark' | 'light'
}

function CheckIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
        </svg>
    )
}

function CopyIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
    )
}

function normalizeLanguage(lang: string): string {
    if (!lang) return 'text'
    const l = lang.toLowerCase().trim()
    switch (l) {
        case 'yml':
        case 'yaml':
            return 'yaml'
        case 'json':
        case 'jsonc':
        case 'json5':
            return 'json'
        case 'py':
        case 'python':
            return 'python'
        case 'js':
        case 'javascript':
            return 'javascript'
        case 'ts':
        case 'typescript':
            return 'typescript'
        case 'tsx':
            return 'tsx'
        case 'jsx':
            return 'jsx'
        case 'sh':
        case 'bash':
        case 'zsh':
        case 'shell':
            return 'bash'
        case 'c++':
        case 'cpp':
            return 'cpp'
        case 'c#':
        case 'cs':
        case 'csharp':
            return 'csharp'
        case 'docker':
        case 'dockerfile':
            return 'docker'
        case 'html':
        case 'xml':
        case 'svg':
            return 'markup'
        case 'md':
        case 'markdown':
            return 'markdown'
        case 'rb':
            return 'ruby'
        case 'rs':
            return 'rust'
        default:
            return l
    }
}

export default function CodeBlock({language, value, theme}: CodeBlockProps) {
    const [copied, setCopied] = useState(false)
    const normalizedLang = normalizeLanguage(language)

    useEffect(() => {
        ensureMonoFont()
    }, [])

    const handleCopy = useCallback(() => {
        const copy = async () => {
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(value)
                } else {
                    const ta = document.createElement('textarea')
                    ta.value = value
                    ta.setAttribute('readonly', '')
                    ta.style.position = 'fixed'
                    ta.style.opacity = '0'
                    document.body.appendChild(ta)
                    ta.select()
                    document.execCommand('copy')
                    document.body.removeChild(ta)
                }
                setCopied(true)
                window.setTimeout(() => setCopied(false), 2000)
            } catch {
                // ignore clipboard failures
            }
        }
        void copy()
    }, [value])

    return (
        <div className="code-block-wrapper" dir="ltr">
            <div className="code-block-header">
                <span className="code-lang">{language || 'text'}</span>
                <button
                    type="button"
                    className={`code-copy-btn ${copied ? 'copied' : ''}`}
                    onClick={handleCopy}
                    aria-label="کپی کد"
                >
                    {copied ? (
                        <>
                            <CheckIcon/>
                            <span>کپی شد!</span>
                        </>
                    ) : (
                        <>
                            <CopyIcon/>
                            <span>کپی کد</span>
                        </>
                    )}
                </button>
            </div>
            <div className="code-block-body">
                <SyntaxHighlighter
                    language={normalizedLang}
                    style={theme === 'dark' ? vscDarkPlus : vs}
                    PreTag="div"
                    CodeTag="code"
                    dir="ltr"
                    wrapLines
                    lineProps={{
                        style: {
                            display: 'block',
                            direction: 'ltr',
                            unicodeBidi: 'isolate',
                            textAlign: 'left',
                        },
                    }}
                    customStyle={{
                        margin: 0,
                        padding: '14px 16px',
                        width: '100%',
                        maxWidth: '100%',
                        background: 'transparent',
                        borderRadius: 0,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.875rem',
                        lineHeight: 1.7,
                        direction: 'ltr',
                        textAlign: 'left',
                        unicodeBidi: 'isolate',
                        overflowX: 'auto',
                    }}
                    codeTagProps={{
                        style: {
                            fontFamily: 'inherit',
                            display: 'block',
                            width: '100%',
                            direction: 'ltr',
                            unicodeBidi: 'isolate',
                            textAlign: 'left',
                            whiteSpace: 'pre',
                        },
                    }}
                >
                    {value}
                </SyntaxHighlighter>
            </div>
        </div>
    )
}

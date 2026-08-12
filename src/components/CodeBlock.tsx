import {useCallback, useState} from 'react';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {vs, vscDarkPlus} from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
    language: string;
    value: string;
    theme: 'dark' | 'light';
}

function CheckIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
        </svg>
    );
}

function CopyIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
    );
}

export default function CodeBlock({language, value, theme}: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            // fallback if clipboard API fails
        });
    }, [value]);

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
                    language={language}
                    style={theme === 'dark' ? vscDarkPlus : vs}
                    PreTag="div"
                    dir="ltr"
                    customStyle={{
                        margin: 0,
                        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                        background: 'transparent'
                    }}
                >
                    {value}
                </SyntaxHighlighter>
            </div>
        </div>
    );
}

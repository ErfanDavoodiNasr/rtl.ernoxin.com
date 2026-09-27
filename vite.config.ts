import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({command}) => ({
    base: './',
    plugins: [
        react(),
        {
            name: 'dev-csp-ws',
            transformIndexHtml(html) {
                // Production zip must not allow ws/wss; Vite HMR needs them in dev only.
                if (command !== 'serve') return html
                return html.replace(
                    "connect-src 'self'",
                    "connect-src 'self' ws: wss:",
                )
            },
        },
    ],
    server: {
        port: 1000,
        open: true,
    },
    build: {
        target: 'es2022',
        sourcemap: false,
        cssCodeSplit: true,
        modulePreload: {
            resolveDependencies: (_filename, deps) =>
                deps.filter(
                    (dep) =>
                        !/(mermaid|katex|html2canvas|jspdf|CodeBlock|MarkdownPreview|exportUtils|syntax)/.test(
                            dep,
                        ),
                ),
        },
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // Only pin React. Other heavy libs must stay behind dynamic import()
                    // so Rollup never parks shared helpers inside katex/export/mermaid.
                    if (
                        id.includes('node_modules/react-dom') ||
                        id.includes('/node_modules/react/') ||
                        id.includes('node_modules/scheduler')
                    ) {
                        return 'react'
                    }
                },
            },
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-markdown', 'remark-gfm'],
    },
}))

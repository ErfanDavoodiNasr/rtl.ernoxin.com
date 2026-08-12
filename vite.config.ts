import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    base: './',
    plugins: [react()],
    server: {
        port: 1000,
        open: true,
    },
    build: {
        target: 'es2022',
        cssCodeSplit: true,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/mermaid') || id.includes('node_modules/cytoscape')) {
                        return 'mermaid'
                    }
                    if (id.includes('node_modules/katex')) {
                        return 'katex'
                    }
                    if (id.includes('node_modules/react-syntax-highlighter') || id.includes('node_modules/refractor') || id.includes('node_modules/prismjs')) {
                        return 'syntax'
                    }
                    if (id.includes('node_modules/html2canvas') || id.includes('node_modules/jspdf')) {
                        return 'export'
                    }
                },
            },
        },
    },
    optimizeDeps: {
        include: ['katex', 'rehype-katex', 'remark-math'],
    },
})

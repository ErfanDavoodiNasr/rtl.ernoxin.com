import {defineConfig} from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        exclude: ['**/node_modules/**', '**/dist/**', '**/._*', 'e2e/**'],
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: [
                'src/utils/urlSafety.ts',
                'src/utils/urlCompact.ts',
                'src/utils/svgSanitize.ts',
                'src/utils/storageUtils.ts',
                'src/utils/markdownUtils.ts',
                'src/utils/bidiUtils.ts',
                'src/utils/clipboardInsert.ts',
                'src/utils/historyStore.ts',
                'src/utils/previewReady.ts',
                'src/components/MarkdownPreview.tsx',
            ],
            thresholds: {
                statements: 80,
                branches: 70,
                functions: 80,
                lines: 80,
            },
        },
    },
})

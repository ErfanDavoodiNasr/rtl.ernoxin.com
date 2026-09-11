import {defineConfig, devices} from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    testMatch: /^(?!.*\/\._).*\.spec\.ts$/,
    testIgnore: ['**/._*', '**/._*.ts'],
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'npx vite preview --port 4173 --host 127.0.0.1',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
    projects: [
        {name: 'chromium', use: {...devices['Desktop Chrome']}},
        {name: 'firefox', use: {...devices['Desktop Firefox']}},
        {name: 'webkit', use: {...devices['Desktop Safari']}},
        {name: 'mobile', use: {...devices['Pixel 5']}},
    ],
})

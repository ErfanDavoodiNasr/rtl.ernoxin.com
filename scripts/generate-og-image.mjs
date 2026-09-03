#!/usr/bin/env node
/**
 * Generates public/og-image.png (1200×630) for Open Graph / Twitter cards.
 */
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../public/og-image.png')

const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0c0e14"/>
      <stop offset="1" stop-color="#13161f"/>
    </linearGradient>
    <linearGradient id="logo" x1="80" y1="80" x2="280" y2="280" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0ea5e9"/>
      <stop offset="0.5" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="80" y="175" width="120" height="120" rx="28" fill="url(#logo)"/>
  <g stroke="white" stroke-linecap="round" fill="none" stroke-width="3">
    <path d="M160 215 C140 215 125 225 110 235 C95 245 88 255 82 265" opacity="0.95"/>
    <path d="M150 250 C130 250 118 258 105 268" opacity="0.75"/>
    <path d="M140 285 C125 285 115 290 105 295" opacity="0.55"/>
    <path d="M95 235 L82 248 L95 261" stroke-linejoin="round"/>
  </g>
  <circle cx="175" cy="205" r="4" fill="white" opacity="0.85"/>
  <text x="240" y="260" fill="#f0f2f7" font-family="Tahoma, sans-serif" font-size="52" font-weight="700">نمایشگر فارسی ارنوکسین</text>
  <text x="240" y="330" fill="#8b93a8" font-family="Tahoma, sans-serif" font-size="28">راست‌چین‌سازی متن، KaTeX، Mermaid و خروجی PDF/HTML</text>
  <text x="240" y="390" fill="#3b9eff" font-family="Tahoma, sans-serif" font-size="24">rtl.ernoxin.com</text>
</svg>`

await sharp(Buffer.from(svg)).png().toFile(outPath)
console.log('Wrote', outPath)

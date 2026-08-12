# نمایشگر فارسی ارنوکسین

نمایش راست‌چین متن فارسی با فونت‌های محلی، رندر فرمول KaTeX، هایلایت کد، جدول و Mermaid — بدون CDN و بدون وابستگی به API
خارجی.

## توسعه

```bash
npm install
npm run dev:safe
```

→ [http://localhost:3000](http://localhost:3000)

## دیپلوی روی cPanel

1. برو [Releases](https://github.com/ErfanDavoodiNasr/rtl.ernoxin.com/releases) و **`rtl.zip`** آخرین نسخه را دانلود کن
2. در cPanel → **File Manager** → `public_html` → zip را آپلود و **Extract** کن
3. `index.html` باید مستقیم داخل `public_html` باشد

همه فونت‌ها، KaTeX، هایلایتر کد و اسکریپت‌ها داخل همین zip هستند و برای اجرا به اینترنت نیاز نیست.

## میانبرها

| میانبر                 | عملکرد    |
|------------------------|-----------|
| `Ctrl/Cmd + Enter`     | پیش‌نمایش |
| `Ctrl/Cmd + Shift + V` | جایگذاری  |

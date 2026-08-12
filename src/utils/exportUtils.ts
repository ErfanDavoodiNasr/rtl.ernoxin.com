import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export function exportAsMarkdown(content: string, filename = 'document.md') {
    const blob = new Blob([content], {type: 'text/markdown;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function exportAsHtml(element: HTMLElement, theme: string, filename = 'document.html') {
    const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>سند فارسی ارنوکسین</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.18.1/dist/katex.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/vazirmatn@5.2.8/index.min.css">
    <style>
        :root, [data-theme='dark'] {
            --bg-base: #0c0e14;
            --bg-surface: #13161f;
            --bg-elevated: #1a1e2a;
            --border: rgba(255, 255, 255, 0.08);
            --text-primary: #f0f2f7;
            --text-secondary: #8b93a8;
            --accent: #3b9eff;
            color-scheme: dark;
        }
        [data-theme='light'] {
            --bg-base: #f4f6fb;
            --bg-surface: #ffffff;
            --bg-elevated: #eef1f8;
            --border: rgba(0, 0, 0, 0.08);
            --text-primary: #1a1f2e;
            --text-secondary: #5a6478;
            --accent: #2563eb;
            color-scheme: light;
        }
        body {
            font-family: 'Vazirmatn', sans-serif;
            background: var(--bg-base);
            color: var(--text-primary);
            direction: rtl;
            padding: 40px 20px;
            margin: 0;
            line-height: 1.8;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        table { width: 100%; border-collapse: collapse; margin: 1em 0; }
        th, td { padding: 8px 12px; border: 1px solid var(--border); text-align: right; }
        th { background: var(--bg-elevated); }
        pre { background: var(--bg-elevated); padding: 16px; border-radius: 8px; overflow-x: auto; direction: ltr; text-align: left; }
        code { font-family: monospace; background: rgba(128,128,128,0.15); padding: 2px 6px; border-radius: 4px; }
        blockquote { border-right: 4px solid var(--accent); margin: 1em 0; padding: 8px 16px; background: rgba(59,158,255,0.1); }
        img { max-width: 100%; height: auto; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container markdown-body">
        ${element.innerHTML}
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], {type: 'text/html;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export async function exportAsPng(element: HTMLElement, theme: string, filename = 'document.png') {
    const bgColor = theme === 'dark' ? '#13161f' : '#ffffff';
    const canvas = await html2canvas(element, {
        backgroundColor: bgColor,
        scale: 2,
        useCORS: true,
        logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

export async function exportAsPdf(element: HTMLElement, theme: string, filename = 'document.pdf') {
    const bgColor = theme === 'dark' ? '#13161f' : '#ffffff';
    const canvas = await html2canvas(element, {
        backgroundColor: bgColor,
        scale: 2,
        useCORS: true,
        logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }

    pdf.save(filename);
}

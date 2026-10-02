#!/usr/bin/env bash
set -e

# Change directory to the project root
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "==============================================="
echo "  🚀 اجرای ویرایشگر و نمایشگر فارسی ارنوکسین  "
echo "  RTL Markdown Editor & Viewer (Ernoxin)       "
echo "==============================================="

# Ensure Node.js is installed
if ! command -v node >/dev/null 2>&1; then
    echo "❌ خطا: Node.js روی سیستم شما نصب نیست!"
    echo "لطفاً ابتدا Node.js را نصب کنید: https://nodejs.org"
    exit 1
fi

# Ensure npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 در حال نصب وابستگی‌های پروژه (npm install)..."
    npm install
fi

# Track server process ID
SERVER_PID=""

# Graceful cleanup on Ctrl+C (SIGINT) or SIGTERM
cleanup() {
    echo ""
    echo "🛑 در حال توقف برنامه..."
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        # Send SIGTERM to the process and its child processes
        kill -TERM "$SERVER_PID" 2>/dev/null || true
        # Wait up to 3 seconds for graceful shutdown
        for _ in {1..30}; do
            if ! kill -0 "$SERVER_PID" 2>/dev/null; then
                break
            fi
            sleep 0.1
        done
        # Force kill if still alive
        if kill -0 "$SERVER_PID" 2>/dev/null; then
            kill -KILL "$SERVER_PID" 2>/dev/null || true
        fi
    fi
    echo "✅ برنامه با موفقیت متوقف شد."
    exit 0
}

trap cleanup INT TERM EXIT

echo "🌐 سرور در حال راه‌اندازی است..."
echo "💡 برای توقف، کلید Ctrl+C را فشار دهید."
echo ""

# Start the Vite dev server
npm run dev &
SERVER_PID=$!

# Wait for server process to finish or be interrupted
wait "$SERVER_PID"

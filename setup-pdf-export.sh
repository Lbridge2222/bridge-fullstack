#!/bin/bash

echo "🚀 Setting up PDF export for Ivy OS Pitch Deck"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --package-lock-only --package-lock=package-pdf-export.json

# Install Playwright
echo "🎭 Installing Playwright browser..."
npx playwright install chromium

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Available commands:"
echo "  npm run export-pdf          - Export perfect pitch deck PDF"
echo "  npm run install-playwright   - Reinstall Playwright if needed"
echo ""
echo "🎯 To export your pitch deck to PDF:"
echo "  npm run export-pdf"
echo ""

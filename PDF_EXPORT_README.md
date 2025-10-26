# Ivy OS Pitch Deck PDF Export

This system converts your HTML pitch deck into a high-quality PDF suitable for investor presentations.

## Why PDF?

- **Consistent rendering** across all devices and operating systems
- **No font dependencies** - everything is embedded
- **Professional appearance** for investor meetings
- **Easy sharing** via email or file transfer
- **Print-ready** for physical handouts

## Quick Start

1. **Setup** (one-time):
   ```bash
   ./setup-pdf-export.sh
   ```

2. **Export to PDF**:
   ```bash
   npm run export-pdf
   ```

## Perfect Export Features

### Export Script (`export-pitch-deck-perfect-final.mjs`)
- **Perfect for investor presentations**
- Web version note as first slide with exciting background
- All 15 original slides captured normally
- 5 live screenshot examples included
- Satoshi fonts throughout
- Glass orbs and professional styling
- Landscape format optimized for presentations

## Output Files

- `Ivy-OS-Pitch-Deck-Perfect-Final.pdf` - Perfect export (recommended)

## Features

### Perfect Export Includes:
- ✅ Web version note as first slide with exciting background
- ✅ All 15 original slides captured normally
- ✅ 5 live screenshot examples included
- ✅ Satoshi fonts throughout
- ✅ Glass orbs and professional styling
- ✅ Landscape format optimized for presentations
- ✅ High DPI rendering (2x scale)
- ✅ Print-optimized colors
- ✅ Professional margins

### Technical Details:
- Uses Playwright for reliable rendering
- 1920x1080 viewport for crisp text
- 2x device scale factor for high DPI
- Print-optimized CSS injection
- Network idle wait for complete loading

## Troubleshooting

### Common Issues:

1. **"HTML file not found"**
   - Ensure `marketing-site/pitch-deck.html` exists
   - Check file permissions

2. **"Playwright not found"**
   - Run: `npm run install-playwright`

3. **Poor quality output**
   - Use the advanced export script
   - Check that all fonts are loading properly

4. **Missing slides**
   - Ensure all content is loaded before export
   - Check for JavaScript errors in browser console

### Performance Tips:

- Close other applications to free up memory
- Use the advanced export for best results
- The process takes 30-60 seconds depending on slide count

## Customization

### Modify PDF Settings:
Edit the `PDF_OPTIONS` object in the script:

```javascript
const PDF_OPTIONS = {
  format: 'A4',           // 'A4', 'Letter', 'Legal'
  printBackground: true,   // Include background colors/images
  margin: {
    top: '0.5in',         // Adjust margins
    right: '0.5in',
    bottom: '0.5in',
    left: '0.5in'
  }
};
```

### Change Output Filename:
Modify the `OUTPUT_PDF` variable in the script.

## File Structure

```
bridge-fullstack/
├── export-pitch-deck-pdf.mjs          # Basic export script
├── export-pitch-deck-advanced.mjs     # Advanced export script
├── package-pdf-export.json           # Dependencies
├── setup-pdf-export.sh               # Setup script
├── PDF_EXPORT_README.md              # This file
└── marketing-site/
    └── pitch-deck.html               # Source HTML file
```

## Dependencies

- Node.js 18+
- Playwright (Chromium browser)
- No additional dependencies required

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Ensure all dependencies are installed
3. Verify the HTML file renders correctly in a browser
4. Check console output for error messages

---

**Pro Tip**: Always use the advanced export for investor presentations. The basic export is fine for internal use, but the advanced version ensures professional appearance with proper page breaks and headers.

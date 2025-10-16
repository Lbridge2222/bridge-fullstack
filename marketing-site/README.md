# IvyOS Marketing Site

This is a standalone marketing site containing only the IvyOS homepage and pitch deck - perfect for funding applications and investor presentations.

## 🚀 Quick Deploy

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Option 2: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir .
```

### Option 3: GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Select source branch

## 📁 Structure

- `index.html` - IvyOS homepage with navigation
- `pitch-deck.html` - Investor pitch deck
- `Screenshots/` - Product screenshots
- `vite.svg` - Favicon
- `vercel.json` - Vercel configuration

## 🎯 URLs After Deployment

- **Homepage**: `https://your-domain.com/`
- **Pitch Deck**: `https://your-domain.com/pitch-deck.html`

## 🔧 Customization

### Update Contact Email
Search and replace `hello@ivy.so` with your actual email in both HTML files.

### Update Branding
Modify the CSS variables in `index.html`:
- `--brand-forest`: #0A1F1A
- `--brand-ivy`: #156B4A  
- `--brand-red`: #E11D1D

### Add Analytics
Add Google Analytics or other tracking scripts to the `<head>` section of both HTML files.

## 📱 Features

- ✅ Mobile responsive
- ✅ SEO optimized
- ✅ Fast loading (static HTML)
- ✅ Professional design
- ✅ Investor-ready pitch deck
- ✅ Contact forms (mailto links)
- ✅ Smooth scrolling navigation

## 🚀 Go Live Checklist

- [ ] Deploy to hosting platform
- [ ] Test all links and forms
- [ ] Verify mobile responsiveness
- [ ] Check page load speed
- [ ] Update contact information
- [ ] Add analytics tracking
- [ ] Test pitch deck presentation
- [ ] Share URLs with investors

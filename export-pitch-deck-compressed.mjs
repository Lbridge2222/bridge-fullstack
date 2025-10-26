import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PITCH_DECK_HTML = join(__dirname, 'marketing-site', 'pitch-deck.html');
const SCREENSHOTS_DIR = join(__dirname, 'marketing-site', 'Screenshots');
const OUTPUT_PDF = 'Ivy-OS-Pitch-Deck-Compressed.pdf';
const VIEWPORT = { width: 1920, height: 1080 };
const RENDER_WAIT_MS = 2000;

(async () => {
  console.log('🚀 Starting compressed pitch deck export (under 10MB)...');
  
  if (!existsSync(PITCH_DECK_HTML)) {
    console.error(`❌ HTML file not found: ${PITCH_DECK_HTML}`);
    process.exit(1);
  }

  if (!existsSync(SCREENSHOTS_DIR)) {
    console.error(`❌ Screenshots directory not found: ${SCREENSHOTS_DIR}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });
  
  const context = await browser.newContext({ 
    viewport: VIEWPORT,
    deviceScaleFactor: 1.5  // Reduced from 2x to 1.5x for smaller file size
  });
  
  const page = await context.newPage();

  try {
    console.log('📄 Loading pitch deck HTML...');
    await page.goto(`file://${PITCH_DECK_HTML}`, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });

    await page.waitForTimeout(RENDER_WAIT_MS);

    // Remove web version buttons and footers specifically
    await page.evaluate(() => {
      const webVersionNote = document.getElementById('webVersionNote');
      if (webVersionNote) {
        webVersionNote.remove();
      }
      
      const smartButtons = document.querySelectorAll('[id*="smartButton"], [class*="smart-button"]');
      smartButtons.forEach(btn => btn.remove());
      
      const webElements = document.querySelectorAll('[id*="web"], [class*="web-version"], [class*="view-web"]');
      webElements.forEach(el => el.remove());
      
      const footers = document.querySelectorAll('footer, .footer, [class*="footer"]');
      footers.forEach(footer => footer.remove());
    });

    // Add CSS to ensure clean presentation
    await page.addStyleTag({
      content: `
        #webVersionNote,
        [id*="webVersion"],
        [class*="web-version"],
        [class*="view-web"],
        footer,
        .footer,
        [class*="footer"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          overflow: hidden !important;
        }
        
        .slide {
          margin-bottom: 0 !important;
          padding-bottom: 0 !important;
        }
        
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      `
    });

    // Get slide information
    const slideInfo = await page.evaluate(() => {
      const slides = document.querySelectorAll('.slide');
      return {
        totalSlides: slides.length,
        slideTitles: Array.from(slides).map((slide, index) => {
          const title = slide.querySelector('h1, h2, h3, .slide-title');
          return {
            index: index + 1,
            title: title ? title.textContent.trim() : `Slide ${index + 1}`,
            element: slide
          };
        })
      };
    });

    console.log(`📊 Found ${slideInfo.totalSlides} slides`);

    // Create a new page for each slide to ensure perfect rendering
    const slideImages = [];
    
    for (let i = 0; i < slideInfo.totalSlides; i++) {
      console.log(`📸 Processing slide ${i + 1}/${slideInfo.totalSlides}...`);
      
      const slidePage = await context.newPage();
      await slidePage.goto(`file://${PITCH_DECK_HTML}`, { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      
      await slidePage.waitForTimeout(RENDER_WAIT_MS);
      
      // Remove web version elements on this page too
      await slidePage.evaluate(() => {
        const webVersionNote = document.getElementById('webVersionNote');
        if (webVersionNote) {
          webVersionNote.remove();
        }
        
        const smartButtons = document.querySelectorAll('[id*="smartButton"], [class*="smart-button"]');
        smartButtons.forEach(btn => btn.remove());
        
        const webElements = document.querySelectorAll('[id*="web"], [class*="web-version"], [class*="view-web"]');
        webElements.forEach(el => el.remove());
        
        const footers = document.querySelectorAll('footer, .footer, [class*="footer"]');
        footers.forEach(footer => footer.remove());
      });
      
      // Add clean CSS
      await slidePage.addStyleTag({
        content: `
          #webVersionNote,
          [id*="webVersion"],
          [class*="web-version"],
          [class*="view-web"],
          footer,
          .footer,
          [class*="footer"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        `
      });
      
      // Scroll to the specific slide
      await slidePage.evaluate((slideIndex) => {
        const slides = document.querySelectorAll('.slide');
        if (slides[slideIndex]) {
          slides[slideIndex].scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }, i);
      
      await slidePage.waitForTimeout(1000);
      
      // Capture slide normally
      const slideImage = `slide-${String(i + 1).padStart(2, '0')}.jpg`;
      
      // Get the full height of the slide content
      const slideHeight = await slidePage.evaluate((slideIndex) => {
        const slides = document.querySelectorAll('.slide');
        if (slides[slideIndex]) {
          return slides[slideIndex].scrollHeight;
        }
        return 1080;
      }, i);
      
      // Set viewport to capture full slide height
      await slidePage.setViewportSize({ 
        width: VIEWPORT.width, 
        height: Math.max(slideHeight, VIEWPORT.height) 
      });
      
      await slidePage.waitForTimeout(500);
      
      await slidePage.screenshot({
        path: slideImage,
        fullPage: false,
        type: 'jpeg',
        quality: 80  // Reduced quality for smaller file size
      });
      
      slideImages.push(slideImage);
      await slidePage.close();
    }

    // Get screenshot files
    const fs = await import('fs');
    const screenshotFiles = fs.readdirSync(SCREENSHOTS_DIR)
      .filter(file => file.endsWith('.webp'))
      .sort()
      .map(file => join(SCREENSHOTS_DIR, file));

    console.log(`📸 Found ${screenshotFiles.length} screenshot files`);

    // Create screenshot slides
    const screenshotSlides = screenshotFiles.map((screenshot, index) => {
      const slideNumber = 6 + index; // Start after slide 5
      return `
        <div style="page-break-after: ${index < screenshotFiles.length - 1 ? 'always' : 'auto'}; page-break-inside: avoid; margin: 0; padding: 0; height: 100vh; display: flex; align-items: center; justify-content: center; background: white;">
          <div style="text-align: center; width: 100%;">
            <h2 style="color: #111111; margin-bottom: 2rem; font-size: 2rem;">Ivy OS Live Example ${index + 1}</h2>
            <img src="file://${screenshot}" style="max-width: 90%; max-height: 80vh; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" alt="Ivy OS Live Example ${index + 1}" />
          </div>
        </div>
      `;
    }).join('\n');

    console.log('📄 Creating compressed PDF...');
    
    // Create web version note slide with exciting background
    const webVersionSlide = `
      <div style="page-break-after: auto; page-break-inside: avoid; margin: 0; padding: 0; height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); position: relative; overflow: hidden;">
        <!-- Glass orbs background -->
        <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(21, 107, 74, 0.1) 0%, rgba(21, 107, 74, 0.05) 50%, transparent 70%); border-radius: 50%; filter: blur(20px);"></div>
        <div style="position: absolute; bottom: -100px; left: -100px; width: 300px; height: 300px; background: radial-gradient(circle, rgba(10, 31, 26, 0.08) 0%, rgba(10, 31, 26, 0.04) 50%, transparent 70%); border-radius: 50%; filter: blur(30px);"></div>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 150px; height: 150px; background: radial-gradient(circle, rgba(21, 107, 74, 0.06) 0%, transparent 70%); border-radius: 50%; filter: blur(15px);"></div>
        
        <div style="text-align: center; width: 100%; max-width: 900px; padding: 4rem; position: relative; z-index: 2;">
          <h1 style="color: #111111; margin-bottom: 1.5rem; font-size: 3rem; font-weight: 700; font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Ivy OS — Interactive Pitch Deck</h1>
          <p style="color: #666; font-size: 1.5rem; margin-bottom: 3rem; line-height: 1.6; max-width: 75ch; margin-left: auto; margin-right: auto; font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            For the full experience with proper formatting, layouts, and slide transitions, please visit:
          </p>
          <div style="background: linear-gradient(135deg, #0A1F1A 0%, #156B4A 100%); color: white; padding: 1.5rem 3rem; border-radius: 12px; display: inline-block; margin-bottom: 2rem; box-shadow: 0 8px 32px rgba(0,0,0,0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);">
            <a href="https://www.ivy-os.io/pitch-deck.html" style="color: white; text-decoration: none; font-size: 1.8rem; font-weight: 600; font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              www.ivy-os.io/pitch-deck.html
            </a>
          </div>
          <p style="color: #999; font-size: 1.2rem; font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            This PDF is a static snapshot and may display some formatting issues on longer or interactive slides.
          </p>
        </div>
      </div>
    `;
    
    // Create HTML wrapper for the PDF with web version note first
    const allSlides = [];
    
    // Add web version note as first slide
    allSlides.push(webVersionSlide);
    
    // Add slides 1-5
    for (let i = 0; i < 5; i++) {
      allSlides.push(`
        <div style="page-break-after: always; page-break-inside: avoid; margin: 0; padding: 0; height: 100vh; display: flex; align-items: center; justify-content: center;">
          <img src="file://${join(__dirname, slideImages[i])}" style="max-width: 100%; max-height: 100vh; width: auto; height: auto; object-fit: contain; display: block;" alt="Slide ${i + 1}" />
        </div>
      `);
    }
    
    // Add screenshot slides
    allSlides.push(screenshotSlides);
    
    // Add remaining slides (6-15)
    for (let i = 5; i < slideImages.length; i++) {
      allSlides.push(`
        <div style="page-break-after: ${i < slideImages.length - 1 ? 'always' : 'auto'}; page-break-inside: avoid; margin: 0; padding: 0; height: 100vh; display: flex; align-items: center; justify-content: center;">
          <img src="file://${join(__dirname, slideImages[i])}" style="max-width: 100%; max-height: 100vh; width: auto; height: auto; object-fit: contain; display: block;" alt="Slide ${i + 1}" />
        </div>
      `);
    }

    const pdfHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Ivy OS - Pre-Seed Investor Deck</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        img {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        @media print {
            body {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            div {
                page-break-inside: avoid !important;
            }
            @page {
                size: A4 landscape;
                margin: 0.15in;
            }
        }
    </style>
</head>
<body>
    ${allSlides.join('\n')}
</body>
</html>
    `;

    // Write the HTML wrapper
    const htmlPath = join(__dirname, 'temp-compressed-pdf.html');
    fs.writeFileSync(htmlPath, pdfHtml);

    // Create final PDF with compression
    const finalPage = await context.newPage();
    await finalPage.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
    
    await finalPage.pdf({
      path: OUTPUT_PDF,
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '0.15in',
        right: '0.15in',
        bottom: '0.15in',
        left: '0.15in'
      },
      preferCSSPageSize: false,
      displayHeaderFooter: false
    });

    // Clean up temporary files
    slideImages.forEach(image => {
      if (existsSync(image)) {
        fs.unlinkSync(image);
      }
    });
    fs.unlinkSync(htmlPath);
    await finalPage.close();

    console.log(`✅ Compressed PDF exported successfully: ${OUTPUT_PDF}`);
    
    const stats = fs.statSync(OUTPUT_PDF);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`📁 File size: ${fileSizeMB} MB`);
    
    if (stats.size > 10 * 1024 * 1024) {
      console.log(`⚠️  File size (${fileSizeMB} MB) exceeds 10MB limit. Consider further compression.`);
    } else {
      console.log(`✅ File size (${fileSizeMB} MB) is under 10MB limit.`);
    }
    
    console.log(`📊 Total slides: ${slideInfo.totalSlides + screenshotFiles.length + 1} (1 web version note + ${slideInfo.totalSlides} original + ${screenshotFiles.length} screenshots)`);

  } catch (error) {
    console.error('❌ Error during export:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

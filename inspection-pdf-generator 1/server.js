const express = require('express');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.static(__dirname));
app.use(cors());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'app.html'));
});

// PDF Generation API
app.post('/api/generate-pdf', async (req, res) => {
    console.log('📄 PDF generation request received');

    try {
        const reportData = req.body;

        if (!reportData || !reportData.rooms) {
            return res.status(400).json({ error: 'Invalid report data' });
        }

        // Create pdfs directory
        const pdfsDir = path.join(__dirname, 'pdfs');
        if (!fs.existsSync(pdfsDir)) {
            fs.mkdirSync(pdfsDir, { recursive: true });
        }

        // Launch Playwright
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        // Inject data into page
        await page.addInitScript(data => {
            window.__REPORT_DATA__ = data;
        }, reportData);

        // Load report template
        const reportPath = `file://${path.join(__dirname, 'report-generator.html')}`;
        await page.goto(reportPath, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Generate PDF
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `inspection-${timestamp}.pdf`;
        const pdfPath = path.join(pdfsDir, filename);

        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });

        await browser.close();
        console.log('✅ PDF generated:', filename);

        res.download(pdfPath, filename);
    } catch (error) {
        console.error('❌ PDF Error:', error);
        res.status(500).json({ error: 'Failed to generate PDF', message: error.message });
    }
});

// List PDFs
app.get('/api/pdfs', (req, res) => {
    const pdfsDir = path.join(__dirname, 'pdfs');
    if (!fs.existsSync(pdfsDir)) return res.json({ pdfs: [] });

    const files = fs.readdirSync(pdfsDir)
        .filter(f => f.endsWith('.pdf'))
        .map(f => ({
            name: f,
            path: `/pdfs/${f}`,
            created: fs.statSync(path.join(pdfsDir, f)).mtime
        }))
        .sort((a, b) => b.created - a.created);

    res.json({ pdfs: files });
});

// Serve PDFs
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 PWA Server running at http://localhost:${PORT}\n`);
});

const express = require('express');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const http = require('http');

const app = express();

app.use(cors());

// 🔀 Proxy Middleware
app.use((req, res, next) => {
    // List of routes handled locally by this PWA server
    const localRoutes = ['/health', '/generate-pdf', '/pdfs'];
    const backendPrefixes = ['/api', '/uploads'];

    // Check if the request should be handled locally
    if (localRoutes.some(route => req.path.startsWith('/api' + route) || localRoutes.includes(req.path))) {
        // Special case for health, generate-pdf, pdfs which are under /api but local
        if (localRoutes.some(route => req.path === '/api' + route || req.path === route)) {
            return next();
        }
    }

    // If it doesn't start with a backend prefix, serve as static/local
    if (!backendPrefixes.some(prefix => req.path.startsWith(prefix))) {
        return next();
    }

    // Otherwise, proxy to the backend on Port 5001
    const options = {
        hostname: '127.0.0.1',
        port: 5001,
        path: req.originalUrl,
        method: req.method,
        headers: { ...req.headers }
    };

    delete options.headers.host;

    const proxyReq = http.request(options, (proxyRes) => {
        if (!res.headersSent) {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
        }
        proxyRes.pipe(res, { end: true });
    });

    // Handle incoming request errors/aborts
    req.on('error', (err) => {
        console.error('⚠️ Inbound Request Error:', err.message);
        proxyReq.destroy();
    });

    req.on('aborted', () => {
        proxyReq.destroy();
    });

    // Pipe the request body to the proxy
    req.pipe(proxyReq, { end: true });

    proxyReq.on('error', (err) => {
        // Suppress common errors like ECONNRESET if they happen after headers are sent or during aborts
        if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
            console.warn(`⚠️ Proxy Warning (${err.code}): Backend connection was reset.`);
        } else {
            console.error('❌ Proxy Error:', err);
        }

        if (!res.headersSent) {
            res.status(502).json({ error: 'Proxy Error', message: 'Could not connect to backend server on port 5001' });
        }
    });

    // Set a timeout for the proxy request
    proxyReq.setTimeout(30000, () => {
        proxyReq.destroy();
        if (!res.headersSent) {
            res.status(504).json({ error: 'Proxy Timeout', message: 'Backend did not respond in time' });
        }
    });
});

app.use(express.json({ limit: '100mb' }));
app.use(express.static(__dirname, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }
}));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'app.html'));
});

// 🚀 Optimized PDF Generation with Persistent Browser
let browser;

async function initBrowser() {
    try {
        if (browser) return;
        console.log('🚀 Launching persistent browser for PDF generation...');
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        console.log('✅ Browser launched successfully');
    } catch (error) {
        console.error('❌ Failed to launch browser:', error);
    }
}

// PDF Generation API
app.post('/api/generate-pdf', async (req, res) => {
    console.log('📄 PDF generation request received');

    if (!browser) {
        await initBrowser();
    }

    let page;
    try {
        const reportData = req.body;

        if (!reportData || !reportData.rooms) {
            return res.status(400).json({ error: 'Invalid report data' });
        }

        const pdfsDir = path.join(__dirname, 'pdfs');
        if (!fs.existsSync(pdfsDir)) {
            fs.mkdirSync(pdfsDir, { recursive: true });
        }

        page = await browser.newPage();

        await page.addInitScript(data => {
            window.__REPORT_DATA__ = data;
        }, reportData);

        const reportPath = `http://localhost:${process.env.PORT || 3000}/report-generator.html`;
        await page.goto(reportPath, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for the custom "PDF_READY" signal from the template
        await page.waitForFunction(() => window.PDF_READY === true, { timeout: 15000 });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `inspection-${timestamp}.pdf`;
        const pdfPath = path.join(pdfsDir, filename);

        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });

        console.log('✅ PDF generated:', filename);
        res.download(pdfPath, filename);

    } catch (error) {
        console.error('❌ PDF Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate PDF', message: error.message });
        }
    } finally {
        if (page) await page.close();
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

// Start HTTP server on port 3000 ONLY
const PORT = process.env.PORT || 3000;
http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Node app running on http://0.0.0.0:${PORT}`);
    console.log(`✓ Access via https://trinetra.onthewifi.com (Nginx proxies to this app)`);
});

// Initialize browser on startup
initBrowser();

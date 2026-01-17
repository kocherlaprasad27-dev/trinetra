const express = require('express');
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const http = require('http');

const app = express();

app.use(cors());

// 🔀 Proxy Middleware (MUST come before express.json() to preserve request body stream)
app.use('/api', (req, res, next) => {
    // List of routes handled locally by this PWA server
    const localRoutes = ['/health', '/generate-pdf', '/pdfs'];

    // If it's a local route, pass to next handlers (express.json, etc.)
    if (localRoutes.includes(req.path)) {
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
app.use(express.static(__dirname));

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

// Start HTTP server on port 3000 ONLY
const PORT = process.env.PORT || 3000;
http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Node app running on http://0.0.0.0:${PORT}`);
    console.log(`✓ Access via https://trinetra.onthewifi.com (Nginx proxies to this app)`);
});

const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));
// Logo files: always revalidate (prevents stale cache after upload)
app.use('/uploads/logo', express.static('uploads/logo', {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

// Icon files: always revalidate
app.use('/uploads/icon', express.static('uploads/icon', {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));
app.use('/uploads', express.static('uploads'));
// Serve Frontend Static Files
const clientPath = path.resolve(__dirname, '../../inspection-pdf-generator 1');
app.use(express.static(clientPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }
}));

// API Routes
app.use('/api/auth', require('./auth/auth.routes'));
app.use('/api/inspectors', require('./inspectors/inspector.routes'));
app.use('/api/tasks', require('./tasks/task.routes'));
app.use('/api/inspections', require('./inspections/inspection.workflow'));
app.use('/api/pdf', require('./pdf/pdf.routes'));
app.use('/api/users', require('./users/user.routes'));
app.use('/api/settings', require('./settings/settings.routes'));
// Removed: /api/metadata, /api/upload (ERI workflow uses JSON-only, no file uploads)

// Fallback to app.html for SPA-like experience or root access
app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'app.html'));
});

module.exports = app;
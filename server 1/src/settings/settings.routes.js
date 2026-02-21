const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../utils/authMiddleware');
const requireRole = require('../utils/requireRole');

// ── Directory Setup ──────────────────────────────────────────────
const LOGO_DIR = path.resolve(__dirname, '../../uploads/logo');
const ICON_DIR = path.resolve(__dirname, '../../uploads/icon');

[LOGO_DIR, ICON_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ── Multer Configuration (Logo) ──────────────────────────────────
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_ICON_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/x-icon', 'image/vnd.microsoft.icon'];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

const storageLogo = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, LOGO_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `custom-logo${ext}`);
    }
});

const storageIcon = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ICON_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `custom-icon${ext}`);
    }
});

const uploadLogo = multer({
    storage: storageLogo,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PNG and JPG are allowed.'));
        }
    }
});

const uploadIcon = multer({
    storage: storageIcon,
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_ICON_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PNG, JPG, and ICO are allowed.'));
        }
    }
});

// ── Helper: find the current custom file ─────────────────────────
function findCustomFile(dir, prefix) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    const file = files.find(f => f.startsWith(prefix));
    return file || null;
}

// ── GET /api/settings/logo  (Public) ─────────────────────────────
router.get('/logo', (_req, res) => {
    const logo = findCustomFile(LOGO_DIR, 'custom-logo');
    const cacheBust = `?v=${Date.now()}`;
    if (logo) {
        return res.json({ logoUrl: `/uploads/logo/${logo}${cacheBust}` });
    }
    res.json({ logoUrl: `/assets/images/Trinetra.png${cacheBust}` });
});

// ── GET /api/settings/icon  (Public) ─────────────────────────────
router.get('/icon', (_req, res) => {
    const icon = findCustomFile(ICON_DIR, 'custom-icon');
    const cacheBust = `?v=${Date.now()}`;
    if (icon) {
        return res.json({ iconUrl: `/uploads/icon/${icon}${cacheBust}` });
    }
    res.json({ iconUrl: `/assets/images/icon-192.png${cacheBust}` });
});

// ── POST /api/settings/logo  (ADMIN only) ────────────────────────
router.post(
    '/logo',
    authMiddleware,
    requireRole('ADMIN'),
    (req, res, next) => {
        const oldLogo = findCustomFile(LOGO_DIR, 'custom-logo');
        if (oldLogo) {
            try { fs.unlinkSync(path.join(LOGO_DIR, oldLogo)); } catch (_) { /* ignore */ }
        }
        next();
    },
    uploadLogo.single('logo'),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }
        console.log(`[Settings] Custom logo uploaded: ${req.file.filename}`);
        res.json({ success: true, logoUrl: `/uploads/logo/${req.file.filename}` });
    }
);

// ── POST /api/settings/icon  (ADMIN only) ────────────────────────
router.post(
    '/icon',
    authMiddleware,
    requireRole('ADMIN'),
    (req, res, next) => {
        const oldIcon = findCustomFile(ICON_DIR, 'custom-icon');
        if (oldIcon) {
            try { fs.unlinkSync(path.join(ICON_DIR, oldIcon)); } catch (_) { /* ignore */ }
        }
        next();
    },
    uploadIcon.single('icon'),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }
        console.log(`[Settings] Custom icon uploaded: ${req.file.filename}`);
        res.json({ success: true, iconUrl: `/uploads/icon/${req.file.filename}` });
    }
);

// ── DELETE /api/settings/logo  (ADMIN only) ──────────────────────
router.delete(
    '/logo',
    authMiddleware,
    requireRole('ADMIN'),
    (_req, res) => {
        const logo = findCustomFile(LOGO_DIR, 'custom-logo');
        if (logo) {
            try { fs.unlinkSync(path.join(LOGO_DIR, logo)); } catch (_) { /* ignore */ }
            console.log('[Settings] Custom logo deleted, reverted to default.');
        }
        res.json({ success: true, logoUrl: '/assets/images/Trinetra.png' });
    }
);

// ── DELETE /api/settings/icon  (ADMIN only) ──────────────────────
router.delete(
    '/icon',
    authMiddleware,
    requireRole('ADMIN'),
    (_req, res) => {
        const icon = findCustomFile(ICON_DIR, 'custom-icon');
        if (icon) {
            try { fs.unlinkSync(path.join(ICON_DIR, icon)); } catch (_) { /* ignore */ }
            console.log('[Settings] Custom icon deleted, reverted to default.');
        }
        res.json({ success: true, iconUrl: '/assets/images/icon-192.png' });
    }
);

// ── Multer error handler ─────────────────────────────────────────
router.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 2 MB.' });
        }
        return res.status(400).json({ message: err.message });
    }
    if (err) {
        return res.status(400).json({ message: err.message });
    }
});

// ── ROOM TEMPLATES CRUD ──────────────────────────────────────────
const ROOM_TEMPLATES_FILE = path.resolve(__dirname, '../../data/room-templates.json');

// Helper to read templates
function getRoomTemplates() {
    if (!fs.existsSync(ROOM_TEMPLATES_FILE)) return [];
    try {
        const data = fs.readFileSync(ROOM_TEMPLATES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

// Helper to save templates
function saveRoomTemplates(templates) {
    fs.writeFileSync(ROOM_TEMPLATES_FILE, JSON.stringify(templates, null, 2));
}

// GET /api/settings/room-templates
router.get('/room-templates', (_req, res) => {
    res.json(getRoomTemplates());
});

// POST /api/settings/room-templates (Create or Update)
router.post('/room-templates', authMiddleware, requireRole('ADMIN'), (req, res) => {
    // 2026-02-19: Refactored to support "Property Templates" (collections of rooms)
    // Legacy fields (ceilingHeight, etc.) are kept for backward compatibility if needed, 
    // but the primary data structure is now `rooms` array.
    const { id, name, description, rooms } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Template name is required' });
    }

    let templates = getRoomTemplates();

    const newTemplateData = {
        name,
        description: description || '',
        rooms: Array.isArray(rooms) ? rooms : [], // Array of room objects
        updatedAt: new Date()
    };

    if (id) {
        // Update existing
        const index = templates.findIndex(t => t.id === id);
        if (index !== -1) {
            templates[index] = { ...templates[index], ...newTemplateData };
        } else {
            return res.status(404).json({ message: 'Template not found' });
        }
    } else {
        // Create new
        const newTemplate = {
            id: Date.now().toString(),
            ...newTemplateData,
            createdAt: new Date()
        };
        templates.push(newTemplate);
    }

    saveRoomTemplates(templates);
    res.json({ success: true, templates });
});

// DELETE /api/settings/room-templates/:id
router.delete('/room-templates/:id', authMiddleware, requireRole('ADMIN'), (req, res) => {
    const { id } = req.params;
    let templates = getRoomTemplates();
    const initialLength = templates.length;
    templates = templates.filter(t => t.id !== id);

    if (templates.length === initialLength) {
        return res.status(404).json({ message: 'Template not found' });
    }

    saveRoomTemplates(templates);
    res.json({ success: true, templates });
});

module.exports = router;

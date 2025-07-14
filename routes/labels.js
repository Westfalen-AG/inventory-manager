const express = require('express');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { authenticateToken, requireManager } = require('../middleware/auth');
const db = require('../database/database');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'labels');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Label dimensions in points (1 inch = 72 points)
const LABEL_SIZES = {
  '12mm': {
    width: 144, // 2 inches = 144 points
    height: 34, // ~12mm = 34 points
    fontSize: 6,
    qrSize: 25
  },
  '24mm': {
    width: 144, // 2 inches = 144 points
    height: 68, // ~24mm = 68 points
    fontSize: 8,
    qrSize: 50
  }
};

// Generate label PDF for Brother PT-P950NW
router.post('/generate/:item_id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { item_id } = req.params;
    const { label_size = '24mm' } = req.body;

    if (!LABEL_SIZES[label_size]) {
      return res.status(400).json({ error: 'Ungültige Label-Größe. Verfügbar: 12mm, 24mm' });
    }

    const item = await db.get('SELECT * FROM items WHERE id = ?', [item_id]);
    if (!item) {
      return res.status(404).json({ error: 'Item nicht gefunden.' });
    }

    const labelConfig = LABEL_SIZES[label_size];
    const filename = `label-${item.qr_code}-${Date.now()}.pdf`;
    const filepath = path.join(uploadsDir, filename);

    // Generate QR code as base64
    const qrCodeDataURL = await QRCode.toDataURL(item.qr_code, {
      width: labelConfig.qrSize * 4, // Higher resolution for PDF
      margin: 0,
      errorCorrectionLevel: 'M'
    });

    // Create PDF document
    const doc = new PDFDocument({
      size: [labelConfig.width, labelConfig.height],
      margins: { top: 2, bottom: 2, left: 2, right: 2 }
    });

    doc.pipe(fs.createWriteStream(filepath));

    // Add QR code
    const qrBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
    doc.image(qrBuffer, 2, 2, { width: labelConfig.qrSize, height: labelConfig.qrSize });

    // Calculate text area
    const textStartX = labelConfig.qrSize + 6;
    const availableWidth = labelConfig.width - textStartX - 4;

    // Add item name
    doc.fontSize(labelConfig.fontSize + 1)
       .font('Helvetica-Bold')
       .text(item.name, textStartX, 3, { 
         width: availableWidth, 
         height: labelConfig.fontSize + 2,
         ellipsis: true
       });

    // Add item details for cables
    if (item.type === 'rj45' && item.category === 'cable') {
      let details = [];
      
      if (item.length) details.push(`${item.length}m`);
      if (item.cat_version) details.push(item.cat_version);
      if (item.color) details.push(item.color);
      if (item.indoor_outdoor) details.push(item.indoor_outdoor);

      if (details.length > 0) {
        doc.fontSize(labelConfig.fontSize - 1)
           .font('Helvetica')
           .text(details.join(' • '), textStartX, labelConfig.fontSize + 5, {
             width: availableWidth,
             height: labelConfig.fontSize,
             ellipsis: true
           });
      }
    }

    // Add QR code text at bottom
    doc.fontSize(labelConfig.fontSize - 2)
       .font('Helvetica')
       .text(item.qr_code, textStartX, labelConfig.height - labelConfig.fontSize - 1, {
         width: availableWidth,
         height: labelConfig.fontSize - 1
       });

    // Add company logo if space allows (24mm labels only)
    if (label_size === '24mm') {
      try {
        // You can download and save the logo locally, for now we'll add text
        doc.fontSize(4)
           .font('Helvetica')
           .text('Inventory', labelConfig.width - 30, labelConfig.height - 8, {
             width: 28,
             align: 'right'
           });
      } catch (error) {
        console.log('Could not add logo:', error.message);
      }
    }

    doc.end();

    // Wait for PDF to be written
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
    });

    // Save label record to database
    await db.run(`
      INSERT INTO labels (item_id, label_size, pdf_path)
      VALUES (?, ?, ?)
    `, [item_id, label_size, `/uploads/labels/${filename}`]);

    res.json({
      message: 'Label erfolgreich generiert.',
      label: {
        item_id,
        label_size,
        filename,
        pdf_url: `/uploads/labels/${filename}`,
        qr_code: item.qr_code
      }
    });

  } catch (error) {
    console.error('Generate label error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Generieren des Labels.' });
  }
});

// Get all labels for an item
router.get('/item/:item_id', authenticateToken, async (req, res) => {
  try {
    const { item_id } = req.params;

    const labels = await db.all(`
      SELECT l.*, i.name as item_name, i.qr_code
      FROM labels l
      LEFT JOIN items i ON l.item_id = i.id
      WHERE l.item_id = ?
      ORDER BY l.created_at DESC
    `, [item_id]);

    res.json({ labels });
  } catch (error) {
    console.error('Get item labels error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Labels.' });
  }
});

// Get all labels with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const [labels, countResult] = await Promise.all([
      db.all(`
        SELECT l.*, i.name as item_name, i.qr_code
        FROM labels l
        LEFT JOIN items i ON l.item_id = i.id
        ORDER BY l.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]),
      db.get('SELECT COUNT(*) as total FROM labels')
    ]);

    res.json({
      labels,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get labels error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Labels.' });
  }
});

// Download label PDF
router.get('/download/:filename', authenticateToken, (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Label-Datei nicht gefunden.' });
    }

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Fehler beim Herunterladen des Labels.' });
      }
    });
  } catch (error) {
    console.error('Download label error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Herunterladen.' });
  }
});

// Delete label (Manager only)
router.delete('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;

    const label = await db.get('SELECT * FROM labels WHERE id = ?', [id]);
    if (!label) {
      return res.status(404).json({ error: 'Label nicht gefunden.' });
    }

    // Delete PDF file
    const filepath = path.join(__dirname, '..', label.pdf_path);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    // Delete database record
    await db.run('DELETE FROM labels WHERE id = ?', [id]);

    res.json({ message: 'Label erfolgreich gelöscht.' });
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Löschen des Labels.' });
  }
});

// Preview QR code for testing
router.get('/qr-preview/:qr_code', authenticateToken, async (req, res) => {
  try {
    const { qr_code } = req.params;
    
    const qrCodeDataURL = await QRCode.toDataURL(qr_code, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'M'
    });

    // Convert to buffer and send as image
    const buffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (error) {
    console.error('QR preview error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Generieren der QR-Code Vorschau.' });
  }
});

module.exports = router; 
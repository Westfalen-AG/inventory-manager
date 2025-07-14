const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireManager } = require('../middleware/auth');
const db = require('../database/database');

const router = express.Router();

// Get all items with pagination and search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = `
      SELECT i.*, u.username as created_by_username,
             (SELECT COUNT(*) FROM transactions t WHERE t.item_id = i.id AND t.type = 'checkout') as total_checkouts
      FROM items i
      LEFT JOIN users u ON i.created_by = u.id
    `;
    
    let countQuery = 'SELECT COUNT(*) as total FROM items i';
    let params = [];

    if (search) {
      const searchCondition = ` WHERE (i.name LIKE ? OR i.qr_code LIKE ? OR i.color LIKE ? OR i.location LIKE ?)`;
      query += searchCondition;
      countQuery += searchCondition;
      const searchParam = `%${search}%`;
      params = [searchParam, searchParam, searchParam, searchParam];
    }

    query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [items, countResult] = await Promise.all([
      db.all(query, params),
      db.get(countQuery, search ? params.slice(0, 4) : [])
    ]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Items.' });
  }
});

// Get single item by ID or QR code
router.get('/:identifier', authenticateToken, async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by ID first, then by QR code
    let item = await db.get('SELECT * FROM items WHERE id = ?', [identifier]);
    
    if (!item) {
      item = await db.get('SELECT * FROM items WHERE qr_code = ?', [identifier]);
    }

    if (!item) {
      return res.status(404).json({ error: 'Item nicht gefunden.' });
    }

    // Get recent transactions for this item
    const transactions = await db.all(`
      SELECT t.*, u.username 
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.item_id = ?
      ORDER BY t.timestamp DESC
      LIMIT 10
    `, [item.id]);

    res.json({ ...item, recent_transactions: transactions });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen des Items.' });
  }
});

// Create new item (Manager only)
router.post('/', authenticateToken, requireManager, async (req, res) => {
  try {
    const {
      name,
      type = 'rj45',
      category = 'cable',
      length,
      color,
      cat_version,
      indoor_outdoor,
      location,
      manufacturer,
      quantity_total = 1,
      description
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name ist erforderlich.' });
    }

    // Generate unique QR code
    const qr_code = `INV-${uuidv4().substring(0, 8).toUpperCase()}`;

    const result = await db.run(`
      INSERT INTO items (
        name, qr_code, type, category, length, color, cat_version,
        indoor_outdoor, location, manufacturer, quantity_total,
        quantity_available, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, qr_code, type, category, length, color, cat_version,
      indoor_outdoor, location, manufacturer, quantity_total,
      quantity_total, description, req.user.id
    ]);

    const newItem = await db.get('SELECT * FROM items WHERE id = ?', [result.id]);

    res.status(201).json({
      message: 'Item erfolgreich erstellt.',
      item: newItem
    });
  } catch (error) {
    console.error('Create item error:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({ error: 'QR-Code bereits vorhanden.' });
    } else {
      res.status(500).json({ error: 'Server-Fehler beim Erstellen des Items.' });
    }
  }
});

// Update item (Manager only)
router.put('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      category,
      length,
      color,
      cat_version,
      indoor_outdoor,
      location,
      manufacturer,
      quantity_total,
      description
    } = req.body;

    const existingItem = await db.get('SELECT * FROM items WHERE id = ?', [id]);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item nicht gefunden.' });
    }

    await db.run(`
      UPDATE items SET
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        category = COALESCE(?, category),
        length = COALESCE(?, length),
        color = COALESCE(?, color),
        cat_version = COALESCE(?, cat_version),
        indoor_outdoor = COALESCE(?, indoor_outdoor),
        location = COALESCE(?, location),
        manufacturer = COALESCE(?, manufacturer),
        quantity_total = COALESCE(?, quantity_total),
        description = COALESCE(?, description)
      WHERE id = ?
    `, [
      name, type, category, length, color, cat_version,
      indoor_outdoor, location, manufacturer, quantity_total,
      description, id
    ]);

    const updatedItem = await db.get('SELECT * FROM items WHERE id = ?', [id]);

    res.json({
      message: 'Item erfolgreich aktualisiert.',
      item: updatedItem
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Aktualisieren des Items.' });
  }
});

// Delete item (Manager only)
router.delete('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;

    const existingItem = await db.get('SELECT * FROM items WHERE id = ?', [id]);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item nicht gefunden.' });
    }

    // Check if item has any transactions
    const transactionCount = await db.get('SELECT COUNT(*) as count FROM transactions WHERE item_id = ?', [id]);
    
    if (transactionCount.count > 0) {
      return res.status(409).json({ 
        error: 'Item kann nicht gelöscht werden, da Transaktionen vorhanden sind.' 
      });
    }

    await db.run('DELETE FROM items WHERE id = ?', [id]);

    res.json({ message: 'Item erfolgreich gelöscht.' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Löschen des Items.' });
  }
});

// Get inventory overview
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const [totalItems, availableItems, checkedOutItems, categories] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM items'),
      db.get('SELECT SUM(quantity_available) as count FROM items'),
      db.get('SELECT SUM(quantity_total - quantity_available) as count FROM items'),
      db.all(`
        SELECT category, COUNT(*) as count, SUM(quantity_available) as available 
        FROM items 
        GROUP BY category
        ORDER BY count DESC
      `)
    ]);

    const recentActivity = await db.all(`
      SELECT t.*, i.name as item_name, u.username
      FROM transactions t
      LEFT JOIN items i ON t.item_id = i.id
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.timestamp DESC
      LIMIT 10
    `);

    res.json({
      totals: {
        items: totalItems.count,
        available: availableItems.count || 0,
        checked_out: checkedOutItems.count || 0
      },
      categories,
      recent_activity: recentActivity
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Statistiken.' });
  }
});

module.exports = router; 
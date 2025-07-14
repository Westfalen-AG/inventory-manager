const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/database');

const router = express.Router();

// Check out item
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const { item_id, qr_code, quantity = 1, notes } = req.body;

    if (!item_id && !qr_code) {
      return res.status(400).json({ error: 'Item-ID oder QR-Code ist erforderlich.' });
    }

    // Find item by ID or QR code
    let item;
    if (item_id) {
      item = await db.get('SELECT * FROM items WHERE id = ?', [item_id]);
    } else {
      item = await db.get('SELECT * FROM items WHERE qr_code = ?', [qr_code]);
    }

    if (!item) {
      return res.status(404).json({ error: 'Item nicht gefunden.' });
    }

    if (item.quantity_available < quantity) {
      return res.status(409).json({ 
        error: `Nicht genügend verfügbare Items. Verfügbar: ${item.quantity_available}` 
      });
    }

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create checkout transaction
      await db.run(`
        INSERT INTO transactions (item_id, user_id, type, quantity, notes)
        VALUES (?, ?, 'checkout', ?, ?)
      `, [item.id, req.user.id, quantity, notes]);

      // Update item availability
      await db.run(`
        UPDATE items SET quantity_available = quantity_available - ?
        WHERE id = ?
      `, [quantity, item.id]);

      await db.run('COMMIT');

      // Get updated item
      const updatedItem = await db.get('SELECT * FROM items WHERE id = ?', [item.id]);

      res.json({
        message: `${quantity} ${item.name} erfolgreich ausgecheckt.`,
        item: updatedItem,
        transaction: {
          type: 'checkout',
          quantity,
          timestamp: new Date().toISOString(),
          user: req.user.username
        }
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Auschecken.' });
  }
});

// Check in item
router.post('/checkin', authenticateToken, async (req, res) => {
  try {
    const { item_id, qr_code, quantity = 1, notes } = req.body;

    if (!item_id && !qr_code) {
      return res.status(400).json({ error: 'Item-ID oder QR-Code ist erforderlich.' });
    }

    // Find item by ID or QR code
    let item;
    if (item_id) {
      item = await db.get('SELECT * FROM items WHERE id = ?', [item_id]);
    } else {
      item = await db.get('SELECT * FROM items WHERE qr_code = ?', [qr_code]);
    }

    if (!item) {
      return res.status(404).json({ error: 'Item nicht gefunden.' });
    }

    const newAvailable = item.quantity_available + quantity;
    if (newAvailable > item.quantity_total) {
      return res.status(409).json({ 
        error: `Zu viele Items. Maximal ${item.quantity_total - item.quantity_available} können eingecheckt werden.` 
      });
    }

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create checkin transaction
      await db.run(`
        INSERT INTO transactions (item_id, user_id, type, quantity, notes)
        VALUES (?, ?, 'checkin', ?, ?)
      `, [item.id, req.user.id, quantity, notes]);

      // Update item availability
      await db.run(`
        UPDATE items SET quantity_available = quantity_available + ?
        WHERE id = ?
      `, [quantity, item.id]);

      await db.run('COMMIT');

      // Get updated item
      const updatedItem = await db.get('SELECT * FROM items WHERE id = ?', [item.id]);

      res.json({
        message: `${quantity} ${item.name} erfolgreich eingecheckt.`,
        item: updatedItem,
        transaction: {
          type: 'checkin',
          quantity,
          timestamp: new Date().toISOString(),
          user: req.user.username
        }
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Checkin error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Einchecken.' });
  }
});

// Get all transactions with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type; // 'checkout', 'checkin', or undefined for all
    const userId = req.query.user_id;
    const itemId = req.query.item_id;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, i.name as item_name, i.qr_code, u.username
      FROM transactions t
      LEFT JOIN items i ON t.item_id = i.id
      LEFT JOIN users u ON t.user_id = u.id
    `;
    
    let countQuery = 'SELECT COUNT(*) as total FROM transactions t';
    let conditions = [];
    let params = [];

    if (type) {
      conditions.push('t.type = ?');
      params.push(type);
    }

    if (userId) {
      conditions.push('t.user_id = ?');
      params.push(userId);
    }

    if (itemId) {
      conditions.push('t.item_id = ?');
      params.push(itemId);
    }

    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY t.timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [transactions, countResult] = await Promise.all([
      db.all(query, params),
      db.get(countQuery, params.slice(0, -2)) // Remove limit and offset for count
    ]);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Transaktionen.' });
  }
});

// Get user's transaction history
router.get('/my-history', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [transactions, countResult] = await Promise.all([
      db.all(`
        SELECT t.*, i.name as item_name, i.qr_code
        FROM transactions t
        LEFT JOIN items i ON t.item_id = i.id
        WHERE t.user_id = ?
        ORDER BY t.timestamp DESC
        LIMIT ? OFFSET ?
      `, [req.user.id, limit, offset]),
      db.get(`
        SELECT COUNT(*) as total 
        FROM transactions 
        WHERE user_id = ?
      `, [req.user.id])
    ]);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get user history error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Benutzer-Historie.' });
  }
});

// Get transaction statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [
      totalTransactions,
      todayTransactions,
      checkoutCount,
      checkinCount,
      topUsers,
      topItems
    ] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM transactions'),
      db.get(`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE DATE(timestamp) = DATE('now')
      `),
      db.get("SELECT COUNT(*) as count FROM transactions WHERE type = 'checkout'"),
      db.get("SELECT COUNT(*) as count FROM transactions WHERE type = 'checkin'"),
      db.all(`
        SELECT u.username, COUNT(*) as transaction_count
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        GROUP BY t.user_id, u.username
        ORDER BY transaction_count DESC
        LIMIT 5
      `),
      db.all(`
        SELECT i.name, COUNT(*) as transaction_count
        FROM transactions t
        LEFT JOIN items i ON t.item_id = i.id
        GROUP BY t.item_id, i.name
        ORDER BY transaction_count DESC
        LIMIT 5
      `)
    ]);

    res.json({
      totals: {
        all_transactions: totalTransactions.count,
        today_transactions: todayTransactions.count,
        checkouts: checkoutCount.count,
        checkins: checkinCount.count
      },
      top_users: topUsers,
      top_items: topItems
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Transaktions-Statistiken.' });
  }
});

module.exports = router; 
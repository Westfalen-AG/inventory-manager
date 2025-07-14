const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken, requireManager } = require('../middleware/auth');
const db = require('../database/database');

const router = express.Router();

// Get all users (Manager only)
router.get('/', authenticateToken, requireManager, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const [users, countResult] = await Promise.all([
      db.all(`
        SELECT id, username, role, email, created_at, last_login,
               (SELECT COUNT(*) FROM transactions WHERE user_id = users.id) as transaction_count
        FROM users
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]),
      db.get('SELECT COUNT(*) as total FROM users')
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Benutzer.' });
  }
});

// Get single user by ID (Manager only)
router.get('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.get(`
      SELECT id, username, role, email, created_at, last_login
      FROM users WHERE id = ?
    `, [id]);

    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    // Get user's recent transactions
    const recentTransactions = await db.all(`
      SELECT t.*, i.name as item_name, i.qr_code
      FROM transactions t
      LEFT JOIN items i ON t.item_id = i.id
      WHERE t.user_id = ?
      ORDER BY t.timestamp DESC
      LIMIT 10
    `, [id]);

    res.json({
      ...user,
      recent_transactions: recentTransactions
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen des Benutzers.' });
  }
});

// Create new user (Manager only)
router.post('/', authenticateToken, requireManager, async (req, res) => {
  try {
    const { username, password, role, email } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ 
        error: 'Benutzername, Passwort und Rolle sind erforderlich.' 
      });
    }

    if (!['manager', 'user'].includes(role)) {
      return res.status(400).json({ 
        error: 'Ungültige Rolle. Verfügbar: manager, user' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' 
      });
    }

    // Check if username already exists
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(409).json({ error: 'Benutzername bereits vorhanden.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.run(`
      INSERT INTO users (username, password, role, email)
      VALUES (?, ?, ?, ?)
    `, [username, hashedPassword, role, email]);

    const newUser = await db.get(`
      SELECT id, username, role, email, created_at
      FROM users WHERE id = ?
    `, [result.id]);

    res.status(201).json({
      message: 'Benutzer erfolgreich erstellt.',
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({ error: 'Benutzername bereits vorhanden.' });
    } else {
      res.status(500).json({ error: 'Server-Fehler beim Erstellen des Benutzers.' });
    }
  }
});

// Update user (Manager only)
router.put('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, role, email } = req.body;

    const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    if (role && !['manager', 'user'].includes(role)) {
      return res.status(400).json({ 
        error: 'Ungültige Rolle. Verfügbar: manager, user' 
      });
    }

    // Check if new username is already taken by another user
    if (username && username !== existingUser.username) {
      const usernameExists = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
      if (usernameExists) {
        return res.status(409).json({ error: 'Benutzername bereits vorhanden.' });
      }
    }

    await db.run(`
      UPDATE users SET
        username = COALESCE(?, username),
        role = COALESCE(?, role),
        email = COALESCE(?, email)
      WHERE id = ?
    `, [username, role, email, id]);

    const updatedUser = await db.get(`
      SELECT id, username, role, email, created_at, last_login
      FROM users WHERE id = ?
    `, [id]);

    res.json({
      message: 'Benutzer erfolgreich aktualisiert.',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({ error: 'Benutzername bereits vorhanden.' });
    } else {
      res.status(500).json({ error: 'Server-Fehler beim Aktualisieren des Benutzers.' });
    }
  }
});

// Reset user password (Manager only)
router.post('/:id/reset-password', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'Neues Passwort ist erforderlich.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Das neue Passwort muss mindestens 6 Zeichen lang sein.' 
      });
    }

    const existingUser = await db.get('SELECT username FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);

    res.json({ 
      message: `Passwort für ${existingUser.username} erfolgreich zurückgesetzt.` 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Zurücksetzen des Passworts.' });
  }
});

// Delete user (Manager only)
router.delete('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(409).json({ error: 'Sie können sich nicht selbst löschen.' });
    }

    const existingUser = await db.get('SELECT username FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    // Check if user has transactions
    const transactionCount = await db.get('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?', [id]);
    
    if (transactionCount.count > 0) {
      return res.status(409).json({ 
        error: 'Benutzer kann nicht gelöscht werden, da Transaktionen vorhanden sind.' 
      });
    }

    await db.run('DELETE FROM users WHERE id = ?', [id]);

    res.json({ 
      message: `Benutzer ${existingUser.username} erfolgreich gelöscht.` 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Löschen des Benutzers.' });
  }
});

// Get user statistics (Manager only)
router.get('/stats/overview', authenticateToken, requireManager, async (req, res) => {
  try {
    const [totalUsers, managers, users, activeUsers] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM users'),
      db.get("SELECT COUNT(*) as count FROM users WHERE role = 'manager'"),
      db.get("SELECT COUNT(*) as count FROM users WHERE role = 'user'"),
      db.get(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE last_login >= datetime('now', '-30 days')
      `)
    ]);

    const topActiveUsers = await db.all(`
      SELECT u.username, u.role, COUNT(t.id) as transaction_count,
             MAX(t.timestamp) as last_transaction
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id
      GROUP BY u.id, u.username, u.role
      ORDER BY transaction_count DESC
      LIMIT 10
    `);

    res.json({
      totals: {
        all_users: totalUsers.count,
        managers: managers.count,
        users: users.count,
        active_last_30_days: activeUsers.count
      },
      top_active_users: topActiveUsers
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Benutzer-Statistiken.' });
  }
});

module.exports = router; 
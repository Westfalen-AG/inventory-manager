const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken, authenticateToken } = require('../middleware/auth');
const db = require('../database/database');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich.' });
    }

    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
    }

    // Update last login
    await db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = generateToken(user.id, user.username, user.role);

    res.json({
      message: 'Anmeldung erfolgreich',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Anmelden.' });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.get('SELECT id, username, role, email, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Benutzerdaten.' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Das neue Passwort muss mindestens 6 Zeichen lang sein.' });
    }

    const user = await db.get('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.user.id]);

    res.json({ message: 'Passwort erfolgreich geändert.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Ändern des Passworts.' });
  }
});

module.exports = router; 
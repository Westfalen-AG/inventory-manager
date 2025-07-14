const jwt = require('jsonwebtoken');
const db = require('../database/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify JWT Token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Zugriff verweigert. Kein Token bereitgestellt.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user details from database
    const user = await db.get('SELECT id, username, role FROM users WHERE id = ?', [decoded.userId]);
    
    if (!user) {
      return res.status(401).json({ error: 'Ungültiger Token. Benutzer nicht gefunden.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Ungültiger Token.' });
  }
};

// Check if user is manager
const requireManager = (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Zugriff verweigert. Manager-Berechtigung erforderlich.' });
  }
  next();
};

// Generate JWT Token
const generateToken = (userId, username, role) => {
  return jwt.sign(
    { userId, username, role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = {
  authenticateToken,
  requireManager,
  generateToken,
  JWT_SECRET
}; 
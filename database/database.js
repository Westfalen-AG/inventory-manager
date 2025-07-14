const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'inventory.db');

class Database {
  constructor() {
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Fehler beim Öffnen der Datenbank:', err.message);
          reject(err);
        } else {
          console.log('Verbindung zur SQLite Datenbank hergestellt.');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('manager', 'user')),
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `;

    const createItemsTable = `
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        qr_code TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL DEFAULT 'rj45',
        category TEXT NOT NULL DEFAULT 'cable',
        length REAL,
        color TEXT,
        cat_version TEXT,
        indoor_outdoor TEXT CHECK(indoor_outdoor IN ('indoor', 'outdoor')),
        location TEXT,
        manufacturer TEXT,
        quantity_total INTEGER DEFAULT 1,
        quantity_available INTEGER DEFAULT 1,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `;

    const createTransactionsTable = `
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('checkout', 'checkin')),
        quantity INTEGER DEFAULT 1,
        notes TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    const createLabelsTable = `
      CREATE TABLE IF NOT EXISTS labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        label_size TEXT NOT NULL CHECK(label_size IN ('12mm', '24mm')),
        pdf_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id)
      )
    `;

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createUsersTable);
        this.db.run(createItemsTable);
        this.db.run(createTransactionsTable);
        this.db.run(createLabelsTable, (err) => {
          if (err) {
            reject(err);
          } else {
            this.createDefaultUser().then(resolve).catch(reject);
          }
        });
      });
    });
  }

  async createDefaultUser() {
    return new Promise((resolve, reject) => {
      // Check if any users exist
      this.db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count === 0) {
          // Create default manager user
          const hashedPassword = bcrypt.hashSync('admin123', 10);
          this.db.run(
            "INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)",
            ['admin', hashedPassword, 'manager', 'admin@example.com'],
            (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('Standard Manager-Benutzer erstellt: admin / admin123');
                resolve();
              }
            }
          );
        } else {
          resolve();
        }
      });
    });
  }

  // Helper methods for database operations
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Fehler beim Schließen der Datenbank:', err.message);
        } else {
          console.log('Datenbankverbindung geschlossen.');
        }
      });
    }
  }
}

module.exports = new Database(); 
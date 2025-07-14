// backend/init-db.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('rides.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS rides (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT    NOT NULL,
    name        TEXT    NOT NULL,
    origin      TEXT    NOT NULL,
    destination TEXT    NOT NULL,
    seats       INTEGER,
    contact     TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
  )`);

  // initialize last_imported if missing
  db.run(
    `INSERT OR IGNORE INTO meta(key, value) VALUES ('last_imported', '1970-01-01T00:00:00Z')`
  );
});
db.serialize(() => {
  // existing tables...
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    phone    TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS otps (
    phone    TEXT PRIMARY KEY,
    code     TEXT NOT NULL,
    expires  INTEGER NOT NULL
  )`);
});

db.close();
console.log('Database initialized.');

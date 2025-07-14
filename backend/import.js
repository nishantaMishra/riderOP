// backend/import.js
const fs = require('fs');
const { parse } = require('csv-parse');
const sqlite3 = require('sqlite3').verbose();

const CSV_PATH = 'whatsapp.csv';  // adjust path if needed

const db = new sqlite3.Database('rides.db');
let newestTimestamp = null;

db.get(`SELECT value FROM meta WHERE key='last_imported'`, (err, row) => {
  if (err) throw err;
  const lastImported = new Date(row.value);

  fs.createReadStream(CSV_PATH)
    .pipe(parse({ columns: true, trim: true }))
    .on('data', record => {
      const ts = new Date(record.timestamp_scraped);
      if (ts > lastImported) {
        db.run(
          `INSERT OR IGNORE INTO rides(timestamp,name,origin,destination,seats,contact)
           VALUES (?,?,?,?,?,?)`,
          [
            record.timestamp_scraped,
            record.sender,
            record.origin,
            record.destination,
            record.seats || null,
            record.phone
          ]
        );
        if (!newestTimestamp || ts > newestTimestamp) {
          newestTimestamp = ts;
        }
      }
    })
    .on('end', () => {
      if (newestTimestamp) {
        db.run(
          `UPDATE meta SET value = ? WHERE key = 'last_imported'`,
          [newestTimestamp.toISOString()]
        );
        console.log(`Imported up to ${newestTimestamp.toISOString()}`);
      } else {
        console.log('No new records.');
      }
      db.close();
    });
});

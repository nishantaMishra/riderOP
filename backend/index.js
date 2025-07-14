// backend/index.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const jwt      = require('jsonwebtoken');
const Twilio   = require('twilio');

require('dotenv').config();
const { TWILIO_SID, TWILIO_TOKEN, TWILIO_NUMBER } = process.env;
const client   = new Twilio(TWILIO_SID, TWILIO_TOKEN);
const JWT_SECRET = 'a-very-secret-key';  // move to env in prod


const app = express();
app.use(cors());
app.use(bodyParser.json());

const DB_PATH = 'rides.db';

// GET /rides — always available, but mask contact for anonymous
app.get('/rides', (req, res) => {
  const db = new sqlite3.Database(DB_PATH);
  db.all(`SELECT * FROM rides ORDER BY timestamp DESC`, (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: err.message });

    // Check for Bearer token
    const auth = req.headers.authorization?.split(' ')[1];
    let showAll = false;
    if (auth) {
      try {
        jwt.verify(auth, JWT_SECRET);
        showAll = true;
      } catch {}
    }

    const payload = rows.map(r => ({
      ...r,
      // if not authenticated, mask last 5 digits of phone
      contact: showAll
        ? r.contact
        : r.contact.replace(/\d(?=\d{5})/g, '*'),
      // hide sender name entirely if anonymous
      name: showAll ? r.name : 'Anonymous'
    }));

    res.json(payload);
  });
});

// POST /rides — require login
app.post('/rides', authenticate, (req, res) => {
  const { origin, destination, seats } = req.body;
  const phone = req.user.phone;
  const name  = phone;  // or any display name you want

  const timestamp = new Date().toISOString();
  const db = new sqlite3.Database(DB_PATH);
  db.run(
    `INSERT INTO rides(timestamp,name,origin,destination,seats,contact)
     VALUES (?,?,?,?,?,?)`,
    [timestamp, name, origin, destination, seats || null, phone],
    function(err) {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, timestamp, name, origin, destination, seats, contact: phone });
    }
  );
});


// 1) Request an OTP
app.post('/auth/request-otp', async (req, res) => {
  const { phone } = req.body;
  const code = String(Math.floor(100000 + Math.random()*900000)); // 6-digit
  const expires = Date.now() + 5*60*1000; // 5 min

  // store or update OTP
  const db = new sqlite3.Database(DB_PATH);
  db.run(
    `INSERT INTO otps(phone,code,expires) VALUES(?,?,?)
     ON CONFLICT(phone) DO UPDATE SET code=?,expires=?`,
    [phone, code, expires, code, expires],
    err => {
      db.close();
      if (err) return res.status(500).json({ error: err.message });
      // send SMS via Twilio
      client.messages.create({
        to: phone,
        from: TWILIO_NUMBER,
        body: `Your RiderOP login code is ${code}`
      }).then(() => res.json({ success: true }))
        .catch(e => res.status(500).json({ error: e.message }));
    }
  );
});

// 2) Verify OTP & issue JWT
app.post('/auth/verify-otp', (req, res) => {
  const { phone, code } = req.body;
  const db = new sqlite3.Database(DB_PATH);
  db.get(
    `SELECT code,expires FROM otps WHERE phone = ?`,
    [phone],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row || row.code !== code || Date.now() > row.expires) {
        return res.status(400).json({ error: 'Invalid or expired code' });
      }
      // Create or activate user
      db.run(
        `INSERT INTO users(phone,is_active) VALUES(?,1)
         ON CONFLICT(phone) DO UPDATE SET is_active=1`,
        [phone],
        function() {
          db.close();
          // Issue JWT
          const token = jwt.sign({ phone }, JWT_SECRET, { expiresIn:'7d' });
          res.json({ token });
        }
      );
    }
  );
});

// JWT verification middleware
function authenticate(req, res, next) {
  const auth = req.headers.authorization?.split(' ')[1];
  if (!auth) return res.status(401).json({ error: 'Missing token' });
  jwt.verify(auth, JWT_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = payload; 
    next();
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));

const Database = require('better-sqlite3');
require('dotenv').config();
const db = new Database(`./${process.env.DATABASE}`);

db.prepare(`
    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        channelId TEXT,
        category TEXT,
        categoryId TEXT,
        createdAt TEXT,
        completedAt TEXT,
        status TEXT
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS blacklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT UNIQUE
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticketId INTEGER,
        userId TEXT,
        rating INTEGER,
        comment TEXT,
        createdAt TEXT DEFAULT (datetime('now', 'localtime'))
    )
`).run();

module.exports = db;

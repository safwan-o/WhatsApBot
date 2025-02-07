const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const axios = require('axios');
const schedule = require('node-schedule');

// Initialize database asynchronously
const adapter = new JSONFile('db.json');
const db = new Low(adapter, { contests: [], users: {} });

async function getCodeforcesContests() {
    try {
        const response = await axios.get('https://codeforces.com/api/contest.list');
        return response.data.result.filter(c => c.phase === 'BEFORE');
    } catch (error) {
        console.error('Codeforces API error:', error);
        return [];
    }
}

function secondsToHMS(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

async function initialize() {
    await db.read(); // Ensure DB is loaded before exporting
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: { headless: true }
    });

    return { client, db, getCodeforcesContests, secondsToHMS, qrcode, schedule };
}

// Export as a Promise that must be awaited
module.exports = initialize();

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.json');

// Membaca database
function getDatabase() {
    try {
        if (!fs.existsSync(dbPath)) {
            const initial = { users: {} };
            fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2));
            return initial;
        }
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('[DB ERROR] Gagal membaca database.json:', e.message);
        return { users: {} };
    }
}

// Menyimpan database
function saveDatabase(data) {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('[DB ERROR] Gagal menyimpan database.json:', e.message);
        return false;
    }
}

module.exports = {
    getDatabase,
    saveDatabase
};

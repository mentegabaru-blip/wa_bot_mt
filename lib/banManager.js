const fs = require('fs');
const path = require('path');

const bannedFile = path.join(__dirname, '..', 'banned.json');

function getBannedUsers() {
    try {
        if (!fs.existsSync(bannedFile)) {
            fs.writeFileSync(bannedFile, JSON.stringify([], null, 2));
            return [];
        }
        const data = fs.readFileSync(bannedFile, 'utf8');
        return JSON.parse(data || '[]');
    } catch (e) {
        console.error('[BAN DB ERROR] Gagal membaca banned.json:', e.message);
        return [];
    }
}

function saveBannedUsers(list) {
    try {
        fs.writeFileSync(bannedFile, JSON.stringify(list, null, 2));
    } catch (e) {
        console.error('[BAN DB ERROR] Gagal menulis ke banned.json:', e.message);
    }
}

function isUserBanned(jidOrNumber) {
    const clean = jidOrNumber.replace(/[^0-9]/g, '');
    const list = getBannedUsers();
    return list.some(item => item.number === clean || item.jid === jidOrNumber);
}

function addBannedUser({ jid, number, reason, bannedBy, group }) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    let list = getBannedUsers();

    if (!list.some(item => item.number === cleanNumber)) {
        list.push({
            jid: jid || `${cleanNumber}@s.whatsapp.net`,
            number: cleanNumber,
            reason: reason || 'Melanggar peraturan grup',
            bannedBy: bannedBy || 'Admin',
            group: group || '',
            bannedAt: new Date().toISOString()
        });
        saveBannedUsers(list);
    }
    return list;
}

function removeBannedUser(jidOrNumber) {
    const cleanNumber = jidOrNumber.replace(/[^0-9]/g, '');
    let list = getBannedUsers();
    const initialLen = list.length;
    list = list.filter(item => item.number !== cleanNumber && item.jid !== jidOrNumber);
    if (list.length !== initialLen) {
        saveBannedUsers(list);
        return true;
    }
    return false;
}

module.exports = {
    getBannedUsers,
    saveBannedUsers,
    isUserBanned,
    addBannedUser,
    removeBannedUser
};

/**
 * Mengirim reaction emoji ke pesan tertentu
 * 
 * @param {Object} sock - Instance socket Baileys
 * @param {Object} msg - Pesan yang akan diberi reaksi
 * @param {string} emoji - Emoji reaction (misal: '⏳', '✅', '❌', '❓')
 */
async function sendReaction(sock, msg, emoji) {
    if (!sock || !msg || !msg.key || !emoji) return;
    try {
        await sock.sendMessage(msg.key.remoteJid, {
            react: {
                text: emoji,
                key: msg.key
            }
        });
    } catch (err) {
        console.error('Gagal mengirim reaksi:', err.message);
    }
}

module.exports = {
    sendReaction
};

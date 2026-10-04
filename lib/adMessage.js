const axios = require('axios');
const fs = require('fs');

/**
 * Mengirim pesan dengan contextInfo externalAdReply (preview banner / thumbnail)
 * 
 * @param {Object} sock - Instance socket Baileys
 * @param {string} jid - Remote JID tujuan
 * @param {string} text - Teks pesan
 * @param {Object} adData - Konfigurasi iklan / banner
 * @param {Object} quoted - Pesan yang di-quote (opsional)
 */
async function sendAdMessage(sock, jid, text, adData = {}, quoted = null) {
    const {
        title = 'Mewtype Bot',
        body = 'WhatsApp Bot Multi Device',
        thumbnailUrl = 'https://i.ibb.co/V3Qv0Hj/banner.jpg',
        sourceUrl = 'https://github.com',
        mediaType = 1,
        renderLargerThumbnail = true
    } = adData;

    let thumbnailBuffer = null;

    // Support URL thumbnail atau Buffer/file path
    if (typeof thumbnailUrl === 'string') {
        if (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')) {
            try {
                const res = await axios.get(thumbnailUrl, { responseType: 'arraybuffer' });
                thumbnailBuffer = Buffer.from(res.data);
            } catch (e) {
                console.error('Gagal mengambil thumbnail dari URL:', e.message);
            }
        } else if (fs.existsSync(thumbnailUrl)) {
            thumbnailBuffer = fs.readFileSync(thumbnailUrl);
        }
    } else if (Buffer.isBuffer(thumbnailUrl)) {
        thumbnailBuffer = thumbnailUrl;
    }

    const contextInfo = {
        externalAdReply: {
            title,
            body,
            mediaType,
            thumbnail: thumbnailBuffer,
            thumbnailUrl: typeof thumbnailUrl === 'string' && thumbnailUrl.startsWith('http') ? thumbnailUrl : undefined,
            sourceUrl,
            renderLargerThumbnail
        }
    };

    return await sock.sendMessage(jid, {
        text,
        contextInfo
    }, { quoted });
}

module.exports = {
    sendAdMessage
};

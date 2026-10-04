const { downloadContentFromMessage } = require('@rexxhayanasi/elaina-baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

async function downloadMediaMessage(message, type) {
    const stream = await downloadContentFromMessage(message, type);
    let buffer = Buffer.alloc(0);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

module.exports = {
    name: 'sticker',
    description: 'Mengubah gambar atau video pendek menjadi stiker WhatsApp',
    execute: async ({ sock, msg, from, prefix, react, config }) => {
        // Cek media pada pesan langsung atau pesan yang di-reply (quoted message)
        const message = msg.message;
        const quoted = message?.extendedTextMessage?.contextInfo?.quotedMessage;

        let targetMessage = null;
        let mediaType = null;

        if (message?.imageMessage) {
            targetMessage = message.imageMessage;
            mediaType = 'image';
        } else if (message?.videoMessage) {
            targetMessage = message.videoMessage;
            mediaType = 'video';
        } else if (quoted?.imageMessage) {
            targetMessage = quoted.imageMessage;
            mediaType = 'image';
        } else if (quoted?.videoMessage) {
            targetMessage = quoted.videoMessage;
            mediaType = 'video';
        } else if (quoted?.viewOnceMessageV2?.message?.imageMessage) {
            targetMessage = quoted.viewOnceMessageV2.message.imageMessage;
            mediaType = 'image';
        } else if (quoted?.viewOnceMessageV2?.message?.videoMessage) {
            targetMessage = quoted.viewOnceMessageV2.message.videoMessage;
            mediaType = 'video';
        } else if (quoted?.viewOnceMessage?.message?.imageMessage) {
            targetMessage = quoted.viewOnceMessage.message.imageMessage;
            mediaType = 'image';
        } else if (quoted?.viewOnceMessage?.message?.videoMessage) {
            targetMessage = quoted.viewOnceMessage.message.videoMessage;
            mediaType = 'video';
        }

        if (!targetMessage || !mediaType) {
            await react.error();
            return await sock.sendMessage(from, {
                text: `${prefix}s <kirim/reply gambar/video>`
            }, { quoted: msg });
        }

        // Batasi durasi video maksimal 10 detik agar stiker tidak terlalu berat
        if (mediaType === 'video' && targetMessage.seconds > 10) {
            await react.error();
            return await sock.sendMessage(from, {
                text: `❌ Durasi video maksimal 10 detik!`
            }, { quoted: msg });
        }

        await react.loading();

        try {
            console.log(`[STICKER] 📥 Mengunduh media (${mediaType}) dari pesan WhatsApp...`);
            const mediaBuffer = await downloadMediaMessage(targetMessage, mediaType);

            console.log(`[STICKER] 🎨 Memformat stiker dengan wa-sticker-formatter...`);
            const sticker = new Sticker(mediaBuffer, {
                pack: config.botName || 'MewType Bot',
                author: config.msg_body?.footer || 'MewType Network',
                type: StickerTypes.FULL,
                quality: 70
            });

            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(from, {
                sticker: stickerBuffer
            }, { quoted: msg });

            await react.success();
            console.log(`[STICKER] ✅ Sukses mengirim stiker ke ${from}`);
        } catch (err) {
            console.error('[STICKER ERROR]:', err.message);
            await react.error();
            await sock.sendMessage(from, {
                text: `❌ Gagal membuat stiker: ${err.message}`
            }, { quoted: msg });
        }
    }
};

const axios = require('axios');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

module.exports = {
    name: 'brat',
    description: 'Membuat stiker teks bergaya Brat',
    execute: async ({ sock, msg, from, args, prefix, react, config }) => {
        const text = args.join(' ').trim();

        if (!text) {
            await react.error();
            return await sock.sendMessage(from, {
                text: `${prefix}brat <teks>`
            }, { quoted: msg });
        }

        await react.loading();

        try {
            console.log(`[BRAT] 🎨 Menghasilkan brat sticker untuk teks: "${text}"`);

            const apiUrl = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 20000 });

            // Format sticker menggunakan wa-sticker-formatter lengkap dengan metadata
            const sticker = new Sticker(res.data, {
                pack: config.botName || 'MewType Bot',
                author: config.msg_body?.footer || 'MewType Network',
                type: StickerTypes.FULL,
                quality: 80
            });

            const stickerBuffer = await sticker.toBuffer();

            // Kirim sebagai stiker WhatsApp
            await sock.sendMessage(from, {
                sticker: stickerBuffer
            }, { quoted: msg });

            await react.success();
            console.log(`[BRAT] ✅ Sukses mengirim stiker brat ke ${from}`);
        } catch (err) {
            console.error('[BRAT ERROR]:', err.message);
            await react.error();
            await sock.sendMessage(from, {
                text: `❌ Gagal membuat stiker brat: ${err.message}`
            }, { quoted: msg });
        }
    }
};

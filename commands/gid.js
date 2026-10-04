module.exports = {
    name: 'gid',
    description: 'Mendapatkan ID JID grup WhatsApp saat ini',
    adminOnly: true,
    execute: async ({ sock, msg, from, config }) => {
        const isGroup = from.endsWith('@g.us');
        const footer = config.msg_body?.footer || `${config.botName || 'Mew BOT'} © 2026`;

        if (!isGroup) {
            console.log(`[GID] ❌ Digunakan di Private Chat | Chat JID: ${from}`);
            return await sock.sendMessage(from, {
                text: `❌ Command ini hanya bisa digunakan di dalam *Grup WhatsApp*!\n\nID Chat Pribadi Anda: \`${from}\`\n\n   *${footer}*`
            }, { quoted: msg });
        }

        try {
            const groupMetadata = await sock.groupMetadata(from);
            
            console.log(`\n========================================`);
            console.log(`[GID] 📌 Nama Grup  : ${groupMetadata.subject}`);
            console.log(`[GID] 🆔 Group JID  : ${from}`);
            console.log(`[GID] 👥 Total Member: ${groupMetadata.participants.length}`);
            console.log(`========================================\n`);

            const text = `╭─❮ ɢʀᴏᴜᴘ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ ❯\n` +
                         `│ 📌 ɴᴀᴍᴀ : ${groupMetadata.subject}\n` +
                         `│ 🆔 ɢʀᴏᴜᴘ ᴊɪᴅ :\n` +
                         `│ \`${from}\`\n` +
                         `│ 👥 ᴛᴏᴛᴀʟ ᴍᴇᴍʙᴇʀ : ${groupMetadata.participants.length}\n` +
                         `╰──────────────────►\n\n` +
                         `   *${footer}*`;

            await sock.sendMessage(from, { text }, { quoted: msg });
        } catch (e) {
            console.log(`\n[GID] 🆔 Group JID: ${from}\n`);
            await sock.sendMessage(from, {
                text: `📌 *GROUP JID:*\n\`${from}\`\n\n   *${footer}*`
            }, { quoted: msg });
        }
    }
};

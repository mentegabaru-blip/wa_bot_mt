const { sendAdMessage } = require('../lib/adMessage');

module.exports = {
    name: 'help',
    description: 'Menampilkan daftar menu bot aesthetic',
    execute: async ({ sock, msg, from, sender, commands, prefix, config }) => {
        const botName = config.botName || 'Mew BOT';
        const footer = config.msg_body?.footer || `${botName} © 2026 • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴇʟᴀɪɴᴀ-ʙᴀɪʟᴇʏꜱ`;
        const senderNumber = (sender || from).split('@')[0];

        // Format waktu & tanggal
        const dateNow = new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Template menu aesthetic dengan Cool Symbols & Borders
        let text = `╔══════════════════════╗\n`;
        text += `   ✦ ✧ MewType Bot ✧ ✦\n`;
        text += `╚══════════════════════╝\n\n`;

        text += `╭─❮ ɪɴꜰᴏʀᴍᴀꜱɪ ᴜꜱᴇʀ ❯\n`;
        text += `│ 👤 ᴜꜱᴇʀ : @${senderNumber}\n`;
        text += `│ 📅 ʜᴀʀɪ : ${dateNow}\n`;
        text += `│ ⚡ ᴘʀᴇꜰɪx : [ ${prefix} ]\n`;
        text += `│ 🤖 ꜱᴛᴀᴛᴜꜱ : ᴀᴄᴛɪᴠᴇ / ᴏɴʟɪɴᴇ\n`;
        text += `╰─────────────────────►\n\n`;

        text += `╭─❮ ᴅᴀꜰᴛᴀʀ ᴄᴏᴍᴍᴀɴᴅ ❯\n`;

        for (const [name, cmd] of commands.entries()) {
            text += `│ ◈ *${prefix}${name}* ➔ _${cmd.description || '-' }_\n`;
        }

        text += `╰─────────────────────►\n\n`;
        text += `┌───❮ ɴᴏᴛᴇꜱ ❯\n`;
        text += `│ ✦ ᴋᴇᴛɪᴋ *${prefix}<ᴄᴏᴍᴍᴀɴᴅ>* ᴜɴᴛᴜᴋ ᴍᴇɴᴊᴀʟᴀɴᴋᴀɴ.\n`;
        text += `│ ✦ ɢᴜɴᴀᴋᴀɴ ʙᴏᴛ ᴅᴇɴɢᴀɴ ʙɪᴊᴀᴋ (ᴊᴇᴅᴀ ᴄᴏᴏʟᴅᴏᴡɴ 3ꜱ).\n`;
        text += `└─────────────────────►\n\n`;
        text += `   *${footer}*`;

        // Kirim dengan banner externalAdReply
        await sendAdMessage(sock, from, text.trim(), {
            title: `乂 ${botName} 乂`,
            body: footer,
            thumbnailUrl: 'https://picsum.photos/600/300?random=bot',
            sourceUrl: 'https://github.com',
            renderLargerThumbnail: true
        }, msg);
    }
};

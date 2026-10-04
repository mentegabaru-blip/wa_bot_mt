const { removeBannedUser } = require('../lib/banManager');

module.exports = {
    name: 'unban',
    description: 'Menghapus member dari daftar blacklist banned.json',
    adminOnly: true,
    execute: async ({ sock, msg, from, args, prefix, config, react }) => {
        const footer = config.msg_body?.footer || `${config.botName || 'Mew BOT'} © 2026`;

        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant;

        let targetJid = null;
        if (mentionedJid && mentionedJid.length > 0) {
            targetJid = mentionedJid[0];
        } else if (quotedSender) {
            targetJid = quotedSender;
        } else if (args[0]) {
            const cleanNumber = args[0].replace(/[^0-9]/g, '');
            if (cleanNumber.length >= 7) {
                targetJid = `${cleanNumber}@s.whatsapp.net`;
            }
        }

        if (!targetJid) {
            await react.error();
            return await sock.sendMessage(from, {
                text: `${prefix}unban <@tag/reply/nomor>`
            }, { quoted: msg });
        }

        const targetNumber = targetJid.split('@')[0];
        const success = removeBannedUser(targetJid);

        if (success) {
            await react.success();
            await sock.sendMessage(from, {
                text: `✅ User @${targetNumber} berhasil dihapus dari blacklist banned database.\n\n   *${footer}*`,
                mentions: [targetJid]
            }, { quoted: msg });
        } else {
            await react.error();
            await sock.sendMessage(from, {
                text: `❌ User @${targetNumber} tidak ditemukan di daftar blacklist banned.\n\n   *${footer}*`,
                mentions: [targetJid]
            }, { quoted: msg });
        }
    }
};

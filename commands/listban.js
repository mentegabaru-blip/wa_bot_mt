const { getBannedUsers } = require('../lib/banManager');

module.exports = {
    name: 'listban',
    description: 'Melihat daftar member yang di-blacklist',
    adminOnly: true,
    execute: async ({ sock, msg, from, prefix, config }) => {
        const footer = config.msg_body?.footer || `${config.botName || 'Mew BOT'} © 2026`;
        const list = getBannedUsers();

        if (list.length === 0) {
            return await sock.sendMessage(from, {
                text: `📋 *DAFTAR BANNED USER*\n\n_Belum ada user yang di-ban / blacklist._\n\n   *${footer}*`
            }, { quoted: msg });
        }

        let text = `╔═══════════════════╗\n`;
        text += `   ✦ ✧ *BANNED USER LIST* ✧ ✦\n`;
        text += `╚═══════════════════╝\n\n`;
        text += `Total Blacklist: *${list.length} user*\n\n`;

        const mentions = [];
        list.forEach((item, index) => {
            const userTag = `@${item.number}`;
            mentions.push(item.jid || `${item.number}@s.whatsapp.net`);
            text += `╭─❮ *#${index + 1}* ❯\n`;
            text += `│ 👤 ᴜꜱᴇʀ : ${userTag}\n`;
            text += `│ 📌 ᴀʟᴀꜱᴀɴ : ${item.reason || '-'}\n`;
            text += `│ 👮 ʙʏ : @${item.bannedBy || 'Admin'}\n`;
            text += `│ 📅 ᴛᴀɴɢɢᴀʟ : ${new Date(item.bannedAt).toLocaleDateString('id-ID')}\n`;
            text += `╰─────────────────►\n\n`;
        });

        text += `_Ketik *${prefix}unban @user* untuk menghapus dari blacklist.`;

        await sock.sendMessage(from, {
            text,
            mentions
        }, { quoted: msg });
    }
};

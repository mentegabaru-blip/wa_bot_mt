module.exports = {
    name: 'ping',
    description: 'Cek respon bot',
    adminOnly: true,
    execute: async ({ sock, msg, from, config }) => {
        const footer = config.msg_body?.footer || `${config.botName || 'Mew BOT'} © 2026`;
        await sock.sendMessage(from, { 
            text: `plong!\n\n   *${footer}*` 
        }, { quoted: msg });
    }
};

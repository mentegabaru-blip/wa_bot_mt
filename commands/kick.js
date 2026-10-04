module.exports = {
    name: 'kick',
    description: 'Mengeluarkan member dari grup',
    adminOnly: true,
    execute: async ({ sock, msg, from, sender, args, prefix, config, react }) => {
        const isGroup = from.endsWith('@g.us');
        const footer = config.msg_body?.footer || `${config.botName || 'Mew BOT'} © 2026`;

        if (!isGroup) {
            await react.error();
            return await sock.sendMessage(from, {
                text: `❌ Command ini hanya bisa digunakan di dalam *Grup WhatsApp*!\n\n   *${footer}*`
            }, { quoted: msg });
        }

        try {
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants || [];

            // Identifikasi sender & bot JID
            const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net' || sock.user?.id;
            const senderNorm = sender.includes(':') ? sender.split(':')[0] + '@s.whatsapp.net' : sender;

            const senderParticipant = participants.find(p => {
                const pId = p.id.includes(':') ? p.id.split(':')[0] + '@s.whatsapp.net' : p.id;
                const pPhone = p.phoneNumber || '';
                return pId === senderNorm || pPhone === senderNorm || p.id === sender;
            });

            const botParticipant = participants.find(p => {
                const pId = p.id.includes(':') ? p.id.split(':')[0] + '@s.whatsapp.net' : p.id;
                const pPhone = p.phoneNumber || '';
                return pId === botJid || pPhone === botJid || p.id === botJid;
            });

            // Cek apakah sender adalah admin grup
            const isSenderAdmin = senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin';
            if (!isSenderAdmin) {
                await react.error();
                return await sock.sendMessage(from, {
                    text: `❌ Maaf, hanya *Admin Grup* yang dapat menggunakan command ini!\n\n   *${footer}*`
                }, { quoted: msg });
            }

            // Cek apakah bot adalah admin grup
            const isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
            if (!isBotAdmin) {
                await react.error();
                return await sock.sendMessage(from, {
                    text: `❌ Bot belum menjadi *Admin Grup*! Jadikan bot sebagai admin terlebih dahulu.\n\n   *${footer}*`
                }, { quoted: msg });
            }

            // Dapatkan target user yang akan di-kick (via mention atau quote)
            const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant;

            let targetJids = [];
            if (mentionedJid && mentionedJid.length > 0) {
                targetJids = [...mentionedJid];
            } else if (quotedSender) {
                targetJids = [quotedSender];
            } else if (args[0]) {
                const cleanNumber = args[0].replace(/[^0-9]/g, '');
                if (cleanNumber.length >= 7) {
                    targetJids = [`${cleanNumber}@s.whatsapp.net`];
                }
            }

            if (targetJids.length === 0) {
                await react.error();
                return await sock.sendMessage(from, {
                    text: `${prefix}kick <@tag/reply/nomor>`
                }, { quoted: msg });
            }

            // FILTER: Jangan biarkan bot mengeluarkan dirinya sendiri
            const rawBotId = sock.user?.id || config.botNumber || '';
            const botCleanNumber = rawBotId.replace(/[^0-9]/g, '');
            const botNormJid = rawBotId.includes(':') ? rawBotId.split(':')[0] + '@s.whatsapp.net' : (rawBotId.includes('@') ? rawBotId : `${rawBotId}@s.whatsapp.net`);
            const botLid = sock.user?.lid || '';

            const filteredTargets = targetJids.filter(target => {
                const targetClean = target.replace(/[^0-9]/g, '');
                const isTargetBot = (
                    target === botNormJid ||
                    target === botJid ||
                    target === botLid ||
                    target === sock.user?.id ||
                    (botCleanNumber && targetClean === botCleanNumber) ||
                    (botParticipant && (target === botParticipant.id || target === botParticipant.phoneNumber))
                );
                return !isTargetBot;
            });

            if (filteredTargets.length === 0) {
                await react.error();
                const playfulResponses = [
                    'apa coba?',
                    'ga bisa lah',
                    'hmmm...',
                    'nope',
                    'ngapain?'
                ];
                const randomText = playfulResponses[Math.floor(Math.random() * playfulResponses.length)];
                return await sock.sendMessage(from, {
                    text: `${randomText}`
                }, { quoted: msg });
            }

            targetJids = filteredTargets;

            await react.loading();

            // Eksekusi kick / remove
            for (const target of targetJids) {
                const targetNumber = target.split('@')[0];
                console.log(`[KICK] 🚫 Mengeluarkan user @${targetNumber} dari grup ${from}`);
                await sock.groupParticipantsUpdate(from, [target], 'remove');
            }

            await react.success();
            const targetMentions = targetJids.map(t => `@${t.split('@')[0]}`).join(', ');

            await sock.sendMessage(from, {
                text: `👢 Sukses mengeluarkan ${targetMentions} dari grup.\n\n   *${footer}*`,
                mentions: targetJids
            }, { quoted: msg });

        } catch (err) {
            console.error('[KICK ERROR]:', err.message);
            await react.error();
            await sock.sendMessage(from, {
                text: `❌ Gagal mengeluarkan member: ${err.message}\n\n   *${footer}*`
            }, { quoted: msg });
        }
    }
};

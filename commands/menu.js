const path = require('path');
const fs = require('fs');
const { getMinecraftStatus } = require('../lib/minecraft');
const { sendCarouselMessage, sendButtonMessage } = require('../lib/interactiveMessage');

module.exports = {
    name: 'menu',
    description: 'Menampilkan menu dashboard bot & status server Minecraft',
    execute: async ({ sock, msg, from, sender, prefix, config, commands }) => {
        const botName = config.botName || 'MewType Bot';
        const footer = config.msg_body?.footer || `${botName} © 2026 • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀᴅᴍɪɴ :)`;
        const senderNumber = (sender || from).split('@')[0];

        const dateNow = new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Ambil status server Minecraft dari config.json
        const mc = await getMinecraftStatus(config.minecraft_config);
        const javaOnline = mc.java.online ? '🟢 ᴏɴʟɪɴᴇ' : '🔴 ᴏꜰꜰʟɪɴᴇ';
        const javaPlayers = `${mc.java.playersOnline}/${mc.java.maxPlayers}`;

        const mcIp = config.minecraft_config?.bedrock?.ip || config.minecraft_config?.java?.ip || 'iftecen.my.id';
        const mcPort = config.minecraft_config?.bedrock?.port || 19132;

        // Deep link auto-join Minecraft
        const quickJoinLink = `minecraft://?addExternalServer=MewType%20Server|${mcIp}:${mcPort}`;

        let menuText = `╔══════════════════╗\n`;
        menuText += `     ✦ ✧ MewType Bot ✧ ✦\n`;
        menuText += `╚══════════════════╝\n\n`;

        menuText += `╭─❮ ɪɴꜰᴏʀᴍᴀꜱɪ ᴜꜱᴇʀ ❯\n`;
        menuText += `│ 👤 ᴜꜱᴇʀ : @${senderNumber}\n`;
        menuText += `│ 📅 ʜᴀʀɪ : ${dateNow}\n`;
        menuText += `│ ⚡ ᴘʀᴇꜰɪx : [ ${prefix} ]\n`;
        menuText += `╰──────────────────►\n\n`;

        menuText += `╭─❮ ɪɴꜰᴏʀᴍᴀꜱɪ ꜱᴇʀᴠᴇʀ ❯\n`;
        menuText += `│ 🎮 ꜱᴇʀᴠᴇʀ : ${javaOnline}\n`;
        menuText += `│ 👥 ᴘʟᴀʏᴇʀ : ${javaPlayers}\n`;
        menuText += `│ 🌐 ᴡᴇʙꜱɪᴛᴇ : ${config.website}\n`;
        menuText += `│ 🌐 ɪᴘ : ${mcIp}\n`;
        menuText += `╰──────────────────►\n\n`;

        menuText += `╭─❮ ᴅᴀꜰᴛᴀʀ ᴄᴏᴍᴍᴀɴᴅ ❯\n`;
        for (const [name, cmd] of commands.entries()) {
            if (name !== 'gid' &&
                name !== 'id' &&
                name !== 'ping' &&
                name !== 'menu' &&
                name !== 'help' &&
                name !== 'ytmp3' &&
                name !== 'sticker' &&
                name !== 'ban' &&
                name !== 'kick' &&
                name !== 'unban' &&
                name !== 'listban'
            ) {
                menuText += `│ ◈ *${prefix}${name}* ➔ _${cmd.description || '-' }_\n`;
            }
        }
        menuText += `╰──────────────────►\n\n`;

        menuText += `┌───❮ ɴᴏᴛᴇꜱ ❯\n`;
        menuText += `│ ✦ ᴋᴇᴛɪᴋ *${prefix}<ᴄᴏᴍᴍᴀɴᴅ>* ᴜɴᴛᴜᴋ ᴍᴇɴᴊᴀʟᴀɴᴋᴀɴ.\n`;
        menuText += `│ ✦ ɢᴜɴᴀᴋᴀɴ ʙᴏᴛ ᴅᴇɴɢᴀɴ ʙɪᴊᴀᴋ (ᴊᴇᴅᴀ ᴄᴏᴏʟᴅᴏᴡɴ 3ꜱ).\n`;
        menuText += `└──────────────────►`;

        // Siapkan Assets Image Path untuk Carousel Cards
        const assetsDir = path.join(__dirname, '..', 'assets');
        const survivalImg = path.join(assetsDir, 'survival.jpg');
        const skyblockImg = path.join(assetsDir, 'skyblock.png');
        const acidIslandsImg = path.join(assetsDir, 'acidislands.jpg');

        const cards = [
            {
                title: '🌲 SURVIVAL MODE',
                body: `Mode Survival klasik dengan fitur ekonomi, claim land, dan custom dungeon! Jelajahi dunia tanpa batas bersama teman-temanmu.`,
                footer: footer,
                image: fs.existsSync(survivalImg) ? survivalImg : undefined,
                buttons: [
                    { type: 'url', text: '🎮 Play Survival', url: quickJoinLink },
                    { type: 'copy', text: '📋 Salin IP', code: mcIp }
                ]
            },
            {
                title: '🏝️ SKYBLOCK MODE',
                body: `Bangun kerajaanmu dari pulau melayang! Selesaikan challenge, upgrade generator, dan jadilah pulau nomor satu di server.`,
                footer: footer,
                image: fs.existsSync(skyblockImg) ? skyblockImg : undefined,
                buttons: [
                    { type: 'url', text: '🎮 Play Skyblock', url: quickJoinLink },
                    { type: 'copy', text: '📋 Salin IP', code: mcIp }
                ]
            },
            {
                title: '☣️ ACID ISLANDS',
                body: `Bertahan hidup di tengah lautan asam beracun! Jangan menyentuh air dan taklukkan rintangan ekstrem bersama timmu.`,
                footer: footer,
                image: fs.existsSync(acidIslandsImg) ? acidIslandsImg : undefined,
                buttons: [
                    { type: 'url', text: '🎮 Play AcidIslands', url: quickJoinLink },
                    { type: 'copy', text: '📋 Salin IP', code: mcIp }
                ]
            }
        ];

        try {
            console.log(`[MENU] 🎠 Mengirim menu carousel slide cards ke ${from}...`);
            await sendCarouselMessage(sock, from, {
                body: menuText,
                footer: footer,
                cards: cards,
                mentions: [sender || from]
            }, msg);
            console.log(`[MENU] ✅ Sukses mengirim menu carousel!`);
        } catch (err) {
            console.error('[MENU CAROUSEL ERROR]:', err.message);
            // Fallback ke single interactive button jika carousel gagal
            try {
                await sendButtonMessage(sock, from, {
                    body: menuText,
                    footer: footer,
                    mentions: [sender || from],
                    buttons: [
                        { type: 'url', text: '🎮 Play Minecraft', url: quickJoinLink },
                        { type: 'copy', text: '📋 Copy Server IP', code: `${mcIp}` }
                    ]
                }, msg);
            } catch (fallbackErr) {
                await sock.sendMessage(from, {
                    text: menuText + `\n\n   *${footer}*`,
                    mentions: [sender || from]
                }, { quoted: msg });
            }
        }
    }
};

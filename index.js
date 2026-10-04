const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@rexxhayanasi/elaina-baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { Boom } = require('@hapi/boom');
const axios = require('axios');
const { sendReaction } = require('./lib/reaction');
const { sendButtonMessage } = require('./lib/interactiveMessage');
const { isUserBanned } = require('./lib/banManager');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Load config.json with auto-reload
let config = {};
const configPath = path.join(__dirname, 'config.json');
function loadConfig() {
    try {
        delete require.cache[require.resolve(configPath)];
        config = require(configPath);
        console.log('[CONFIG] config.json loaded.');
    } catch (e) {
        console.error('[CONFIG ERROR] Gagal memuat config.json:', e.message);
    }
}
loadConfig();
fs.watch(configPath, () => {
    loadConfig();
});

// Setup readline interface for user input in terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// Load all command files from /commands directory
const commands = new Map();
const commandsDir = path.join(__dirname, 'commands');

function loadCommandFile(filePath) {
    if (!filePath.endsWith('.js')) return;
    try {
        delete require.cache[require.resolve(filePath)];
        const cmd = require(filePath);
        if (cmd && cmd.name) {
            commands.set(cmd.name.toLowerCase(), cmd);
            console.log(`[HOT-RELOAD] Command loaded/reloaded: ${cmd.name}`);
        }
    } catch (err) {
        console.error(`[HOT-RELOAD ERROR] Gagal memuat file ${filePath}:`, err.message);
    }
}

function loadCommands() {
    commands.clear();
    if (!fs.existsSync(commandsDir)) {
        fs.mkdirSync(commandsDir, { recursive: true });
    }

    const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'));
    for (const file of files) {
        loadCommandFile(path.join(commandsDir, file));
    }
    console.log(`Berhasil memuat ${commands.size} commands.`);
}

// Watch folder commands untuk auto-reload saat file diubah/ditambah/dihapus
function watchCommands() {
    if (!fs.existsSync(commandsDir)) return;

    fs.watch(commandsDir, (eventType, filename) => {
        if (!filename || !filename.endsWith('.js')) return;
        const filePath = path.join(commandsDir, filename);

        if (fs.existsSync(filePath)) {
            loadCommandFile(filePath);
        } else {
            const cmdName = filename.replace('.js', '').toLowerCase();
            if (commands.has(cmdName)) {
                commands.delete(cmdName);
                console.log(`[HOT-RELOAD] Command deleted: ${cmdName}`);
            }
        }
    });

    console.log('[WATCHER] Menyimak perubahan file di folder commands...');
}

loadCommands();
watchCommands();

// User Cooldown Tracking Map: key -> userId, value -> timestamp
const userCooldowns = new Map();

let sockInstance = null;
let isStarting = false;

async function startBot() {
    if (isStarting) return;
    isStarting = true;

    const { state, saveCreds } = await useMultiFileAuthState('./session');

    // Cek apakah creds sudah terdaftar (sudah punya nomor / me.id)
    const isRegistered = Boolean(state.creds && (state.creds.registered || state.creds.me?.id));

    let authMethod = '2'; // Default QR
    let phoneNumber = '';

    // HANYA tanyakan metode login jika BENAR-BENAR belum terdaftar session-nya
    if (!isRegistered) {
        if (process.argv.includes('--pairing-code')) {
            authMethod = '1';
        } else if (process.argv.includes('--qr')) {
            authMethod = '2';
        } else {
            console.log('\n==============================');
            console.log('--- PILIH METODE LOGIN ---');
            console.log('1. Pairing Code');
            console.log('2. QR Code (Scan)');
            console.log('==============================');
            const choice = await question('Pilih metode (1/2) [Default: 2]: ');
            if (choice.trim() === '1') {
                authMethod = '1';
            } else {
                authMethod = '2';
            }
        }

        if (authMethod === '1') {
            phoneNumber = await question('\nMasukkan nomor WhatsApp bot (contoh: 628xxxxxxxxxx): ');
            phoneNumber = String(phoneNumber).replace(/[^0-9]/g, '');
        }
    }

    const { version } = await fetchLatestBaileysVersion();
    console.log(`Using WA version v${version.join('.')}`);

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        retryRequestDelayMs: 250,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        getMessage: async () => ({ conversation: '' })
    });

    // Bungkus sendMessage dan relayMessage dengan delay 1 detik agar tidak spam / kena rate-limit
    const rawSendMessage = sock.sendMessage.bind(sock);
    sock.sendMessage = async (...args) => {
        await sleep(1000);
        return await rawSendMessage(...args);
    };

    const rawRelayMessage = sock.relayMessage.bind(sock);
    sock.relayMessage = async (...args) => {
        await sleep(1000);
        return await rawRelayMessage(...args);
    };

    sockInstance = sock;
    isStarting = false;

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);

    // Connection update listener (QR & Reconnect logic)
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Tampilkan QR hanya jika belum registered
        if (qr && !isRegistered && authMethod === '2') {
            console.log('\nScan QR code di bawah ini menggunakan WhatsApp:');
            qrcode.generate(qr, { small: true });
        }

        // Jalankan pairing code jika memilih opsi 1 dan belum registered
        if (qr && !isRegistered && authMethod === '1' && phoneNumber) {
            try {
                setTimeout(async () => {
                    const code = await sock.requestPairingCode(phoneNumber);
                    console.log(`\n========================================`);
                    console.log(`👉 PAIRING CODE ANDA: ${code?.match(/.{1,4}/g)?.join('-') || code}`);
                    console.log(`========================================\n`);
                }, 2000);
            } catch (err) {
                console.error('Gagal mendapatkan pairing code:', err);
            }
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error instanceof Boom)?.output?.statusCode || lastDisconnect?.error?.output?.statusCode;
            const reason = lastDisconnect?.error?.message || lastDisconnect?.error;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(`[DISCONNECT] Koneksi terputus: ${reason} (code: ${statusCode}), reconnecting: ${shouldReconnect}`);

            if (shouldReconnect) {
                setTimeout(() => {
                    startBot();
                }, 3000);
            } else {
                console.log('Koneksi ditutup permanen (Logged Out). Hapus folder ./session dan scan ulang.');
            }
        } else if (connection === 'open') {
            console.log(`\n========================================`);
            console.log(`[ONLINE] ${config.botName || 'Bot'} BERHASIL TERHUBUNG!`);
            console.log(`Nomor Bot: ${sock.user?.id?.split(':')[0] || 'Unknown'}`);
            console.log(`========================================\n`);
        }
    });

    // Handle group participants update via group-participants.update AND messages.upsert protocol
    const handleGroupParticipants = async (id, participants, action) => {
        try {
            console.log(`\n🔔 [GROUP-EVENT DETECTED] Action: ${action} | Group JID: ${id} | Participants:`, participants);

            const detectGroup = (config.detect_userinout_gid || '').trim();
            const targetSendGroup = (config.welcome_target_gid || id).trim();

            console.log(`[GROUP-EVENT CHECK] Detected Group: "${id}" | Config Detect: "${detectGroup}" | Target Send: "${targetSendGroup}"`);

            if (detectGroup && id !== detectGroup && !id.includes(detectGroup.split('@')[0])) {
                console.log(`[GROUP-EVENT BLOCKED] Event diabaikan karena Group ID (${id}) tidak sama dengan detect_userinout_gid (${detectGroup})`);
                return;
            }

            let groupName = 'Grup';
            try {
                const groupMetadata = await sock.groupMetadata(id);
                groupName = groupMetadata.subject || 'Grup';
            } catch (e) {
                console.log('[GROUP-EVENT] Gagal mengambil metadata grup:', e.message);
            }

            for (const item of participants) {
                // Ekstrak JID dan nomor pengguna (support object {id, phoneNumber} maupun string JID)
                let userJid = '';
                let userNumber = '';

                if (typeof item === 'object' && item !== null) {
                    userJid = item.phoneNumber || item.id || '';
                } else if (typeof item === 'string') {
                    userJid = item;
                }

                if (!userJid) continue;
                userNumber = userJid.split('@')[0];

                let profilePicUrl = null;
                let profilePicBuffer = null;
                try {
                    profilePicUrl = await sock.profilePictureUrl(userJid, 'image');
                    if (profilePicUrl) {
                        const ppRes = await axios.get(profilePicUrl, { responseType: 'arraybuffer', timeout: 8000 });
                        profilePicBuffer = Buffer.from(ppRes.data);
                    }
                } catch (e) {
                    console.log(`[GROUP-EVENT] Tidak dapat mengambil foto profil @${userNumber}`);
                }

                if (action === 'add') {
                    // AUTO-KICK BANNED USER CHECK
                    if (isUserBanned(userJid) || isUserBanned(userNumber)) {
                        console.log(`[AUTOKICK BANNED] 🚨 User @${userNumber} terdeteksi di database blacklist! Mengeluarkan dari grup ${id}...`);
                        try {
                            await sock.groupParticipantsUpdate(id, [userJid], 'remove');
                            await sock.sendMessage(id, {
                                text: `🚨 *SECURITY SYSTEM*\n\nUser @${userNumber} telah masuk ke dalam *Blacklist / Banned List* dan langsung dikeluarkan secara otomatis.`,
                                mentions: [userJid]
                            });
                        } catch (banKickErr) {
                            console.error('[AUTOKICK ERROR]:', banKickErr.message);
                        }
                        continue;
                    }

                    console.log(`[WELCOME] 🚀 Mengirim welcome message untuk @${userNumber} ke grup target: ${targetSendGroup}`);

                    const mcConfig = config.minecraft_config || {};
                    const mcIp = mcConfig.bedrock?.ip || mcConfig.java?.ip || 'iftecen.my.id';
                    const mcPort = mcConfig.bedrock?.port || 19132;
                    const quickJoinLink = `minecraft://?addExternalServer=MewType%20Server|${mcIp}:${mcPort}`;

                    const footerText = config.msg_body?.footer || `${config.botName || 'MewType Bot'} © 2026`;

                    const welcomeText = `╔════════════════╗\n` +
                        `    *WELCOME TO GROUP*\n` +
                        `╚════════════════╝\n\n` +
                        `👋 ʜᴀʟᴏ *@${userNumber}*, ꜱᴇʟᴀᴍᴀᴛ ᴅᴀᴛᴀɴɢ ᴅɪ ɢʀᴜᴘ *${groupName}*!\n\n` +
                        `╭─❮ ʀᴜʟᴇꜱ & ɪɴꜰᴏ ❯\n` +
                        `│ 📌 ᴊᴀɴɢᴀɴ ʟᴜᴘᴀ ʙᴀᴄᴀ ᴅᴇꜱᴋʀɪᴘꜱɪ ɢʀᴜᴘ\n` +
                        `│ 💬 ꜱᴀʟɪɴɢ ᴍᴇɴɢʜᴏʀᴍᴀᴛɪ ꜱᴇꜱᴀᴍᴀ ᴍᴇᴍʙᴇʀ\n` +
                        `│ 🌐 ᴡᴇʙsɪᴛᴇ: *${config.website}*\n` +
                        `│ 🎮 ꜱᴇʀᴠᴇʀ: *${mcIp}*\n` +
                        `╰───────────────►`

                    const buttons = [
                        {
                            type: 'url',
                            text: '🎮 Play Minecraft',
                            url: quickJoinLink
                        },
                        {
                            type: 'copy',
                            text: '📋 Salin IP',
                            code: mcIp
                        }
                    ];

                    // Generate Welcome Banner via Siputzx Canvas API
                    let welcomeBannerBuffer = null;
                    const avatarUrl = profilePicUrl || 'https://i.ibb.co/1s8T3sY/48f7ce63c7aa.jpg';
                    const welcomeBg = config.canvas_banner?.welcome_bg || 'https://i.ibb.co/4YBNyvP/images-76.jpg';
                    const welcomeCanvasUrl = `https://api.siputzx.my.id/api/canvas/welcomev4?avatar=${encodeURIComponent(avatarUrl)}&background=${encodeURIComponent(welcomeBg)}&title=welcome&description=${encodeURIComponent(`welcome to ${groupName}!`)}&border=%232a2e35&avatarBorder=%232a2e35&overlayOpacity=0.3`;

                    try {
                        console.log(`[WELCOME] 🎨 Mengambil canvas banner dari API Siputzx...`);
                        const welcomeCanvasRes = await axios.get(welcomeCanvasUrl, { responseType: 'arraybuffer', timeout: 15000 });
                        welcomeBannerBuffer = Buffer.from(welcomeCanvasRes.data);
                    } catch (canvasErr) {
                        console.error('[WELCOME CANVAS ERROR]:', canvasErr.message);
                    }

                    const finalWelcomeMedia = welcomeBannerBuffer || profilePicBuffer || profilePicUrl || undefined;

                    try {
                        console.log(`[WELCOME] 🔘 Mencoba mengirim button message ke ${targetSendGroup}...`);
                        await sendButtonMessage(sock, targetSendGroup, {
                            title: '',
                            body: welcomeText,
                            footer: footerText,
                            image: finalWelcomeMedia,
                            buttons,
                            mentions: [userJid]
                        });
                        console.log(`[WELCOME] ✅ Sukses mengirim button message!`);
                    } catch (btnErr) {
                        console.error('[WELCOME BUTTON ERROR]:', btnErr);
                        if (finalWelcomeMedia) {
                            try {
                                await sock.sendMessage(targetSendGroup, {
                                    image: welcomeBannerBuffer || profilePicBuffer || { url: profilePicUrl },
                                    caption: welcomeText,
                                    mentions: [userJid]
                                });
                            } catch (imgErr) {
                                await sock.sendMessage(targetSendGroup, {
                                    text: welcomeText,
                                    mentions: [userJid]
                                });
                            }
                        } else {
                            await sock.sendMessage(targetSendGroup, {
                                text: welcomeText,
                                mentions: [userJid]
                            });
                        }
                    }
                } else if (action === 'remove') {
                    console.log(`[GOODBYE] 🚀 Mengirim goodbye message untuk @${userNumber} ke grup target: ${targetSendGroup}`);

                    const footerText = config.msg_body?.footer || `${config.botName || 'MewType Bot'} © 2026`;

                    const goodbyeText = `╔════════════════╗\n` +
                        `*GOODBYE MEMBER*\n` +
                        `╚════════════════╝\n\n` +
                        `👋 ꜱᴇʟᴀᴍᴀᴛ ᴛɪɴɢɢᴀʟ *@${userNumber}* ᴅᴀʀɪ *${groupName}*.\n` +
                        `_ꜱᴇᴍᴏɢᴀ ʜᴀʀɪ-ʜᴀʀɪᴍᴜ ꜱᴇʟᴀʟᴜ ᴍᴇɴʏᴇɴᴀɴɢᴋᴀɴ!_ ✨\n\n` +
                        `╰───────────────►`;

                    // Generate Goodbye Banner via Siputzx Canvas API
                    let goodbyeBannerBuffer = null;
                    const avatarUrl = profilePicUrl || 'https://i.ibb.co/1s8T3sY/48f7ce63c7aa.jpg';
                    const goodbyeBg = config.canvas_banner?.goodbye_bg || 'https://i.ibb.co/4YBNyvP/images-76.jpg';
                    const canvasUrl = `https://api.siputzx.my.id/api/canvas/goodbyev4?avatar=${encodeURIComponent(avatarUrl)}&background=${encodeURIComponent(goodbyeBg)}&title=goodbye&description=${encodeURIComponent(`goodbye from ${groupName}!`)}&border=%232a2e35&avatarBorder=%232a2e35&overlayOpacity=0.3`;

                    try {
                        console.log(`[GOODBYE] 🎨 Mengambil canvas banner dari API Siputzx...`);
                        const canvasRes = await axios.get(canvasUrl, { responseType: 'arraybuffer', timeout: 15000 });
                        goodbyeBannerBuffer = Buffer.from(canvasRes.data);
                    } catch (canvasErr) {
                        console.error('[GOODBYE CANVAS ERROR]:', canvasErr.message);
                    }

                    const finalMedia = goodbyeBannerBuffer || profilePicBuffer || profilePicUrl || undefined;

                    try {
                        console.log(`[GOODBYE] 🔘 Mencoba mengirim goodbye message ke ${targetSendGroup}...`);
                        await sendButtonMessage(sock, targetSendGroup, {
                            title: '👋 Goodbye Member',
                            body: goodbyeText,
                            footer: footerText,
                            image: finalMedia,
                            buttons: [],
                            mentions: [userJid]
                        });
                        console.log(`[GOODBYE] ✅ Sukses mengirim goodbye message!`);
                    } catch (btnErr) {
                        console.error('[GOODBYE ERROR]:', btnErr);
                        if (finalMedia) {
                            try {
                                await sock.sendMessage(targetSendGroup, {
                                    image: goodbyeBannerBuffer || profilePicBuffer || { url: profilePicUrl },
                                    caption: `${goodbyeText}\n\n   *${footerText}*`,
                                    mentions: [userJid]
                                });
                            } catch (imgErr) {
                                await sock.sendMessage(targetSendGroup, {
                                    text: `${goodbyeText}\n\n   *${footerText}*`,
                                    mentions: [userJid]
                                });
                            }
                        } else {
                            await sock.sendMessage(targetSendGroup, {
                                text: `${goodbyeText}\n\n   *${footerText}*`,
                                mentions: [userJid]
                            });
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[GROUP-UPDATE ERROR]:', err.message);
        }
    };

    // 1. Standar Baileys group-participants update listener
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        await handleGroupParticipants(id, participants, action);
    });

    // 2. Fallback StubType detection via messages.upsert (Jika Baileys event tertahan)
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message && msg.messageStubType) {
                // messageStubType: 27 (add), 28 (remove/leave), 32 (leave)
                const stubType = msg.messageStubType;
                const stubParams = msg.messageStubParameters || [];
                const groupId = msg.key.remoteJid;

                console.log(`[STUB-MESSAGE] StubType: ${stubType} | Group: ${groupId} | Params:`, stubParams);

                if (stubType === 27 || stubType === 28 || stubType === 32) {
                    const action = stubType === 27 ? 'add' : 'remove';
                    const participants = stubParams.map(p => p.includes('@') ? p : `${p}@s.whatsapp.net`);
                    await handleGroupParticipants(groupId, participants, action);
                }
                continue;
            }

            if (!msg.message) continue;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;

            const body = msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message.imageMessage?.caption ||
                '';

            if (!body) continue;

            console.log(`\n[INCOMING] From JID: ${from} | Sender: ${sender}`);
            console.log(`[PESAN]: ${body}`);

            // DEV MODE FILTER: Jika is_on_dev = true, cek apakah from atau sender cocok
            if (config.is_on_dev && config.target_dev_group) {
                const targetClean = config.target_dev_group.trim();
                if (from !== targetClean && !from.includes(targetClean.split('@')[0])) {
                    console.log(`[DEV MODE BLOCKED] Pesan diabaikan karena from (${from}) != target_dev_group (${targetClean})`);
                    continue;
                }
            }

            // Abaikan pesan yang dikirim oleh bot sendiri (fromMe)
            if (msg.key.fromMe) continue;

            const senderNorm = sender.includes(':') ? sender.split(':')[0] + '@s.whatsapp.net' : sender;
            const senderNumber = senderNorm.split('@')[0];
            const isGroup = from.endsWith('@g.us');
            const botOwnerNumber = (config.botNumber || '').replace(/[^0-9]/g, '');
            const isOwner = botOwnerNumber && senderNumber === botOwnerNumber;

            // CEK BLACKLIST / BANNED: Jika user terdaftar di banned.json, abaikan seluruh pesan
            if (isUserBanned(senderNorm) || isUserBanned(senderNumber)) {
                console.log(`[BANNED USER BLOCKED] 🚫 Pesan dari user ter-ban @${senderNumber} diabaikan.`);
                continue;
            }

            // Reactions config mapping
            const reactions = config.reactions || {
                loading: '⏳',
                success: '✅',
                error: '❌',
                unknown: '❓'
            };

            // Helper react khusus command
            const react = {
                loading: async () => await sendReaction(sock, msg, reactions.loading),
                success: async () => await sendReaction(sock, msg, reactions.success),
                error: async () => await sendReaction(sock, msg, reactions.error),
                unknown: async () => await sendReaction(sock, msg, reactions.unknown),
                custom: async (emoji) => await sendReaction(sock, msg, emoji)
            };

            // Prefix handler (mengutamakan prefix dari config.json)
            const configuredPrefix = config.prefix || '.';
            const isPrefixed = body.startsWith(configuredPrefix);

            let commandName = '';
            let args = [];

            if (isPrefixed) {
                args = body.slice(configuredPrefix.length).trim().split(/ +/);
                commandName = args.shift()?.toLowerCase();
            } else {
                args = body.trim().split(/ +/);
                commandName = args.shift()?.toLowerCase();
            }

            // Cari command yang sesuai
            const command = commands.get(commandName);
            if (command) {
                // BLOK PENGGUNA JIKA MENGGUNAKAN COMMAND DI PRIVATE MESSAGE (PC)
                if (!isGroup && config.block_private_chat !== false && !isOwner) {
                    console.log(`[PC BLOCKED] 🚫 User @${senderNumber} mencoba menggunakan bot di private message. Memblokir kontak...`);
                    try {
                        await sock.sendMessage(from, {
                            text: `⛔ *AKSES DITOLAK*\n\nBot tidak dapat digunakan melalui Private Chat (PM).\nNomor Anda telah diblokir secara otomatis.\n\n   *${config.msg_body?.footer || 'MewType Network • 2026'}*`
                        }, { quoted: msg });
                        await sleep(1000);
                        // Blokir nomor pengguna di WhatsApp
                        await sock.updateBlockStatus(from, 'block');
                        console.log(`[PC BLOCKED] ✅ Berhasil memblokir user @${senderNumber}`);
                    } catch (blockErr) {
                        console.error('[PC BLOCK ERROR]:', blockErr.message);
                    }
                    continue;
                }

                // CHECK ADMIN STATUS IN CURRENT GROUP
                let isSenderAdmin = isOwner;
                if (!isSenderAdmin && isGroup) {
                    try {
                        const groupMetadata = await sock.groupMetadata(from);
                        const participants = groupMetadata.participants || [];
                        const senderParticipant = participants.find(p => {
                            const pId = p.id.includes(':') ? p.id.split(':')[0] + '@s.whatsapp.net' : p.id;
                            const pPhone = p.phoneNumber || '';
                            return pId === senderNorm || pPhone === senderNorm || p.id === sender;
                        });

                        if (senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin') {
                            isSenderAdmin = true;
                        }
                    } catch (e) {
                        console.error('[ADMIN-CHECK ERROR]:', e.message);
                    }
                }

                // GROUP RESTRICTION FOR NON-ADMIN USERS:
                // User yang bukan admin / owner HANYA bisa menggunakan bot di detect_userinout_gid
                if (isGroup && !isSenderAdmin && config.detect_userinout_gid) {
                    const allowedGroup = config.detect_userinout_gid.trim();
                    const isAllowedGroup = from === allowedGroup || from.includes(allowedGroup.split('@')[0]);

                    if (!isAllowedGroup) {
                        console.log(`[GROUP ACCESS RESTRICTED] ⚠️ User non-admin @${senderNumber} mencoba menggunakan [${configuredPrefix}${commandName}] di luar grup detect_userinout_gid (${from})`);
                        continue;
                    }
                }

                // ADMIN ONLY CHECK: Jika command bertipe adminOnly, hanya admin grup atau bot owner yang boleh menjalankan
                if (command.adminOnly && !isSenderAdmin) {
                    const userTag = senderNorm.split('@')[0];
                    console.log(`[ACCESS DENIED] ⚠️ User @${userTag} mencoba untuk menjalankan command admin [${configuredPrefix}${commandName}] di ${from}`);
                    continue;
                }

                // COOLDOWN CHECK PER USER
                const cooldownConfig = config.cooldown || { enabled: true, duration: 3000 };
                if (cooldownConfig.enabled && !msg.key.fromMe) {
                    const now = Date.now();
                    const userLastUsed = userCooldowns.get(sender) || 0;
                    const cooldownDuration = (command.cooldown !== undefined ? command.cooldown : cooldownConfig.duration) || 3000;
                    const timeLeft = userLastUsed + cooldownDuration - now;

                    if (timeLeft > 0) {
                        const seconds = Math.ceil(timeLeft / 1000);
                        await sock.sendMessage(from, {
                            text: `⏳ Mohon tunggu *${seconds} detik* lagi sebelum menggunakan command kembali.`
                        }, { quoted: msg });
                        return;
                    }
                    userCooldowns.set(sender, now);
                }

                try {
                    await command.execute({
                        sock,
                        msg,
                        from,
                        sender,
                        args,
                        body,
                        prefix: configuredPrefix,
                        commands,
                        config,
                        react
                    });
                } catch (err) {
                    console.error(`Error saat menjalankan command ${commandName}:`, err);
                    await react.error();
                    await sock.sendMessage(from, { text: `Terjadi error saat menjalankan command ${commandName}: ${err.message}` }, { quoted: msg });
                }
            }
        }
    });

    return sock;
}

startBot().catch(console.error);

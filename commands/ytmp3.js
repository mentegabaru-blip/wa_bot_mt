const axios = require('axios');

module.exports = {
    name: 'ytmp3',
    description: 'Download audio MP3 dari YouTube',
    execute: async ({ sock, msg, from, args, prefix, react, config }) => {
        const url = args[0];
        const footer = config?.msg_body?.footer || `${config?.botName || 'Mew BOT'} © 2026`;

        if (!url) {
            await react.error();
            return await sock.sendMessage(from, {
                text: `.mp3 <url>`
            }, { quoted: msg });
        }

        // Validasi link YouTube
        if (!url.includes('youtu.be') && !url.includes('youtube.com')) {
            await react.error();
            return await sock.sendMessage(from, {
                text: `❌ URL yang dimasukkan bukan link YouTube yang valid!\n\n   *${footer}*`
            }, { quoted: msg });
        }

        // Pemicu react loading untuk command yang butuh proses download
        await react.loading();

        console.log(`\n========================================`);
        console.log(`[YTMP3] ⏳ Memproses request URL: ${url}`);

        const apiUrl = `https://api.siputzx.my.id/api/d/ummy?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { timeout: 30000 });
        const resData = response.data;

        if (!resData.status || !resData.data) {
            console.error('[YTMP3] ❌ Gagal mendapatkan respon valid dari API Siputzx');
            throw new Error('Gagal mendapatkan data audio dari API Siputzx.');
        }

        const info = resData.data;
        const meta = info.meta || {};
        const title = (meta.title || 'YouTube_Audio').replace(/[\\/:*?"<>|]/g, '');
        const duration = meta.duration || '-';
        const thumb = info.thumb;

        // Ambil direct audio stream
        let directAudioUrl = null;

        if (Array.isArray(info.url)) {
            const audioTracks = info.url.filter(item => item.audio === true && item.url && !item.url.includes('du.sf-converter.com'));
            const bestAudio = audioTracks.find(t => t.itag === '140') || 
                              audioTracks.sort((a, b) => (b.contentLength || 0) - (a.contentLength || 0))[0];

            if (bestAudio && bestAudio.url) {
                directAudioUrl = bestAudio.url;
            }
        }

        if (!directAudioUrl) {
            console.error('[YTMP3] ❌ Tidak ada direct audio stream ditemukan.');
            throw new Error('Tidak ditemukan direct audio stream yang valid dari YouTube.');
        }

        console.log(`[YTMP3] 📌 Judul: ${title}`);
        console.log(`[YTMP3] ⏱️ Durasi: ${duration}`);

        // Kirim preview awal
        let infoMessage = null;
        const initialCaption = `🎵 *YOUTUBE MP3 DOWNLOADER*\n\n` +
            `📌 *Judul:* ${meta.title || title}\n` +
            `⏱️ *Durasi:* ${duration}\n` +
            `🔗 *Sumber:* ${meta.source || url}\n\n` +
            `⏳ _Sedang mendownload file audio..._\n\n` +
            `   *${footer}*`;

        if (thumb) {
            infoMessage = await sock.sendMessage(from, {
                image: { url: thumb },
                caption: initialCaption
            }, { quoted: msg });
        } else {
            infoMessage = await sock.sendMessage(from, {
                text: initialCaption
            }, { quoted: msg });
        }

        console.log(`[YTMP3] 📥 Sedang mendownload buffer audio dari YouTube stream...`);
        const startTime = Date.now();

        // Download binary audio stream
        const audioRes = await axios.get(directAudioUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            onDownloadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    const loadedMB = (progressEvent.loaded / 1024 / 1024).toFixed(2);
                    const totalMB = (progressEvent.total / 1024 / 1024).toFixed(2);
                    process.stdout.write(`\r[YTMP3] 🔄 Progress: ${percent}% (${loadedMB}/${totalMB} MB)`);
                }
            },
            timeout: 60000
        });

        console.log('');
        const downloadTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const audioBuffer = Buffer.from(audioRes.data);
        const fileSizeMB = (audioBuffer.length / 1024 / 1024).toFixed(2);

        console.log(`[YTMP3] 📦 Download selesai (${fileSizeMB} MB dalam ${downloadTime} detik)`);

        // Edit pesan info awal menjadi "Download Selesai!"
        if (infoMessage && infoMessage.key) {
            const finishedText = `🎵 *YOUTUBE MP3 DOWNLOADER*\n\n` +
                `📌 *Judul:* ${meta.title || title}\n` +
                `⏱️ *Durasi:* ${duration}\n` +
                `📁 *Ukuran:* ${fileSizeMB} MB\n` +
                `🔗 *Sumber:* ${meta.source || url}\n\n` +
                `✅ *Download Selesai!*\n\n` +
                `   *${footer}*`;

            try {
                await sock.sendMessage(from, {
                    text: finishedText,
                    edit: infoMessage.key
                });
            } catch (err) {
                console.error('[YTMP3] Gagal mengedit pesan caption:', err.message);
            }
        }

        console.log(`[YTMP3] 📤 Mengirim file audio ke WhatsApp...`);

        // Buffer thumbnail untuk preview blurry / cover audio dokumen
        let thumbBuffer = null;
        if (thumb) {
            try {
                const thumbRes = await axios.get(thumb, { responseType: 'arraybuffer', timeout: 8000 });
                thumbBuffer = Buffer.from(thumbRes.data);
            } catch (e) {
                console.log('[YTMP3] Gagal mengunduh buffer thumbnail audio:', e.message);
            }
        }

        // Kirim file audio sebagai Dokumen MP3 dengan thumbnail preview
        await sock.sendMessage(from, {
            document: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            jpegThumbnail: thumbBuffer || undefined,
            contextInfo: thumbBuffer ? {
                externalAdReply: {
                    title: meta.title || title,
                    body: `Durasi: ${duration} • YouTube Music`,
                    mediaType: 2,
                    thumbnail: thumbBuffer,
                    sourceUrl: meta.source || url,
                    renderLargerThumbnail: false
                }
            } : undefined
        }, { quoted: msg });

        // Beri react success setelah selesai proses download
        await react.success();

        console.log(`[YTMP3] ✅ Sukses terkirim: ${title}.mp3 (${fileSizeMB} MB)`);
        console.log(`========================================\n`);
    }
};

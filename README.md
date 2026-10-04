# 🤖 MewType WhatsApp Bot

Bot WhatsApp multi-fitur berbasis Node.js dan `@rexxhayanasi/elaina-baileys` dengan dukungan fitur Minecraft Server Tracker, Canvas Welcome/Goodbye Banners, Sticker Formatter, Moderator Tools (Ban/Kick/Blacklist), Carousel Slides, dan Auto-Block PM.

---

## 📦 Prasyarat Sistem

- **Node.js**: Versi `18.x` atau lebih baru (`v20.x` LTS sangat disarankan)
- **NPM**: Versi `9.x` atau lebih baru
- **FFmpeg** *(Opsional tapi disarankan untuk media/audio conversion)*

---

## 🚀 Panduan Instalasi (NPM)

### 1. Install Semua Dependencies Otomatis
Jika file `package.json` sudah ada di dalam folder proyek, cukup jalankan:
```bash
npm install
```

### 2. Atau Install Satu per Satu (Manual)
Jika ingin menginstal dependensi satu per satu secara manual:

```bash
# Core Baileys WhatsApp Engine & Logger
npm install @rexxhayanasi/elaina-baileys pino qrcode-terminal @hapi/boom

# HTTP Client & Helper
npm install axios dotenv

# Sticker & Image Processing
npm install wa-sticker-formatter sharp jimp

# YouTube Audio Downloader & Search
npm install @tdkrage-oss/youtube-mp3-downloader yt-search
```

---

## 📋 Daftar Library & Kegunaannya

| Package NPM | Deskripsi / Fungsi |
| :--- | :--- |
| **`@rexxhayanasi/elaina-baileys`** | Library koneksi WhatsApp Web API & interactive messages (Carousel, Buttons, Native Flow). |
| **`pino`** | High-performance logger untuk Baileys socket. |
| **`qrcode-terminal`** | Menampilkan QR Code scan login langsung di layar terminal. |
| **`@hapi/boom`** | HTTP error handling standar Baileys. |
| **`axios`** | Melakukan HTTP request untuk fetch Canvas Banner (Siputzx API), Minecraft Status, & Brat API. |
| **`wa-sticker-formatter`** | Mengonversi gambar/video menjadi WhatsApp Sticker (`.webp`) dengan metadata pack & author. |
| **`sharp`** | Pemrosesan & resize gambar berkecepatan tinggi. |
| **`jimp`** | Manipulasi gambar buffer / background. |
| **`@tdkrage-oss/youtube-mp3-downloader`** | Mengunduh audio YouTube MP3 langsung via stream. |
| **`yt-search`** | Mencari judul / video YouTube lewat command chat. |
| **`dotenv`** | Memuat environment variables jika diperlukan. |

---

## ⚙️ Konfigurasi (`config.json`)

Edit file `config.json` sesuai kebutuhan bot Anda:


## ▶️ Menjalankan Bot

### Mode QR Code (Scan WhatsApp):
```bash
npm start
# atau
node index.js --qr
```

### Mode Pairing Code (Nomor HP):
```bash
node index.js --pairing-code
```

---

## 📁 Struktur Folder

```
bot/
├── assets/                 # Gambar lokal untuk Carousel Banner (survival, skyblock, acidislands)
├── commands/               # File command otomatis ter-load (Hot-Reload)
│   ├── ban.js              # Blacklist permanen member
│   ├── unban.js            # Buka ban member
│   ├── listban.js          # Daftar member yang diblacklist
│   ├── kick.js             # Mengeluarkan member dari grup
│   ├── brat.js             # Generator stiker teks brat
│   ├── sticker.js / s.js   # Konversi media ke stiker
│   ├── ytmp3.js / mp3.js   # Download audio YouTube
│   ├── menu.js             # Carousel menu dashboard & status Minecraft
│   ├── ping.js             # Cek latency bot
│   └── id.js / gid.js      # Cek JID user / grup
├── lib/                    # Helper module (banManager, interactiveMessage, reaction, minecraft)
├── session/                # Multi-file auth credentials WhatsApp
├── banned.json             # Database blacklist pengguna
├── config.json             # Konfigurasi bot
├── package.json            # Daftar dependencies
└── README.md               # Dokumentasi bot
```

---

## 💡 Fitur Utama

- 🎠 **Carousel Interactive Menu**: Tampilan menu modern berbentuk kartu geser (slide cards).
- 🚫 **Moderator & Anti-Raid**: Fitur `.ban`, `.unban`, `.kick`, `.listban` dengan auto-kick jika user yang diblacklist mencoba masuk kembali.
- 🛡️ **Auto Block PM**: Otomatis memblokir nomor asing/member yang mencoba menggunakan command di private message.
- 🔒 **Grup Akses Khusus**: Member biasa hanya diizinkan memakai bot di grup `detect_userinout_gid`, sedangkan admin bebas di semua grup.
- 🖼️ **Siputzx Canvas V4**: Welcome dan Goodbye banner dinamis dengan avatar profil member.
- ⚡ **Hot-Reload**: Menambah atau mengubah command di folder `commands/` langsung aktif tanpa perlu me-restart bot.

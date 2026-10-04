module.exports = {
    name: 's',
    description: 'Ubah gambar/video menjadi stiker',
    execute: async (context) => {
        const stickerCmd = require('./sticker');
        await stickerCmd.execute(context);
    }
};

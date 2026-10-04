const axios = require('axios');

module.exports = {
    name: 'mp3',
    description: 'Download lagu dari youtube',
    execute: async (context) => {
        const ytmp3 = require('./ytmp3');
        await ytmp3.execute(context);
    }
};

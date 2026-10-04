const axios = require('axios');

async function getMinecraftStatus(mcConfig = {}) {
    const javaConfig = mcConfig.java || { ip: 'iftecen.my.id', port: 25565 };
    const bedrockConfig = mcConfig.bedrock || { ip: 'iftecen.my.id', port: 19132 };

    let javaStatus = { online: false, playersOnline: 0, maxPlayers: 0, playerList: [] };
    let bedrockStatus = { online: false, playersOnline: 0, maxPlayers: 0 };

    try {
        const javaRes = await axios.get(`https://api.mcsrvstat.us/3/${javaConfig.ip}:${javaConfig.port}`, { timeout: 6000 });
        if (javaRes.data?.online) {
            javaStatus.online = true;
            javaStatus.playersOnline = javaRes.data.players?.online || 0;
            javaStatus.maxPlayers = javaRes.data.players?.max || 0;
            javaStatus.playerList = (javaRes.data.players?.list || []).map(p => typeof p === 'object' ? p.name : p);
        }
    } catch (e) {}

    try {
        const bedrockRes = await axios.get(`https://api.mcsrvstat.us/bedrock/3/${bedrockConfig.ip}:${bedrockConfig.port}`, { timeout: 6000 });
        if (bedrockRes.data?.online) {
            bedrockStatus.online = true;
            bedrockStatus.playersOnline = bedrockRes.data.players?.online || 0;
            bedrockStatus.maxPlayers = bedrockRes.data.players?.max || 0;
        }
    } catch (e) {}

    return {
        java: javaStatus,
        bedrock: bedrockStatus
    };
}

module.exports = {
    getMinecraftStatus
};

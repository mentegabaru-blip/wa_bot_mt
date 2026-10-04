const {
    generateWAMessageFromContent,
    proto,
    prepareWAMessageMedia
} = require('@rexxhayanasi/elaina-baileys');
const axios = require('axios');

/**
 * Mengirim Pesan Interactive Buttons (Quick Reply / URL / Call / Copy)
 */
async function sendButtonMessage(sock, jid, { title, body, footer, image, buttons = [], mentions = [] }, quoted = null) {
    let headerMedia = null;

    if (image) {
        try {
            let buffer = image;
            if (typeof image === 'string' && image.startsWith('http')) {
                const res = await axios.get(image, { responseType: 'arraybuffer', timeout: 10000 });
                buffer = Buffer.from(res.data);
            }
            if (Buffer.isBuffer(buffer)) {
                headerMedia = await prepareWAMessageMedia({ image: buffer }, { upload: sock.waUploadToServer });
            }
        } catch (imgErr) {
            console.error('[BUTTON MESSAGE] Gagal memuat/upload media header:', imgErr.message);
        }
    }

    const nativeButtons = buttons.map(btn => {
        if (btn.type === 'url') {
            return {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    url: btn.url,
                    merchant_url: btn.url
                })
            };
        } else if (btn.type === 'call') {
            return {
                name: 'cta_call',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    id: btn.phone
                })
            };
        } else if (btn.type === 'copy') {
            return {
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    id: btn.code,
                    copy_code: btn.code
                })
            };
        } else {
            return {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                    display_text: btn.text,
                    id: btn.id || btn.text
                })
            };
        }
    });

    const mentionedJidList = Array.isArray(mentions) ? mentions : (mentions ? [mentions] : []);

    const interactiveMessage = {
        header: headerMedia ? {
            title: title || '',
            hasMediaAttachment: true,
            imageMessage: headerMedia.imageMessage
        } : (title ? { title, hasMediaAttachment: false } : undefined),
        body: { text: body },
        footer: footer ? { text: footer } : undefined,
        nativeFlowMessage: {
            buttons: nativeButtons,
            messageParamsJson: '',
            messageVersion: 1
        },
        contextInfo: {
            mentionedJid: mentionedJidList
        }
    };

    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage
            }
        }
    }, { quoted, userJid: sock.user?.id });

    return await sock.relayMessage(jid, msg.message, {
        messageId: msg.key.id,
        additionalNodes: [
            {
                tag: 'biz',
                attrs: {},
                content: [
                    {
                        tag: 'interactive',
                        attrs: { type: 'native_flow', v: '1' },
                        content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                    }
                ]
            }
        ]
    });
}

/**
 * Mengirim Pesan Carousel Slide Cards (Multi Banner Card)
 */
async function sendCarouselMessage(sock, jid, { body, footer, cards = [], mentions = [] }, quoted = null) {
    const cardElements = [];

    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        let headerMedia = null;

        if (card.image) {
            let buffer = card.image;
            if (typeof card.image === 'string') {
                if (card.image.startsWith('http')) {
                    try {
                        const res = await axios.get(card.image, { responseType: 'arraybuffer', timeout: 10000 });
                        buffer = Buffer.from(res.data);
                    } catch (e) {
                        console.error('[CAROUSEL] Gagal download gambar kartu:', e.message);
                    }
                } else if (require('fs').existsSync(card.image)) {
                    buffer = require('fs').readFileSync(card.image);
                }
            }
            if (Buffer.isBuffer(buffer)) {
                try {
                    headerMedia = await prepareWAMessageMedia({ image: buffer }, { upload: sock.waUploadToServer });
                } catch (upErr) {
                    console.error('[CAROUSEL] Gagal upload media card:', upErr.message);
                }
            }
        }

        const nativeButtons = (card.buttons || []).map(btn => {
            if (btn.type === 'url') {
                return {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text,
                        url: btn.url,
                        merchant_url: btn.url
                    })
                };
            } else if (btn.type === 'copy') {
                return {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text,
                        id: btn.code,
                        copy_code: btn.code
                    })
                };
            } else {
                return {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: btn.text,
                        id: btn.id || btn.text
                    })
                };
            }
        });

        const cardHeader = {
            title: card.title || '',
            subtitle: card.subtitle || '',
            hasMediaAttachment: !!headerMedia?.imageMessage,
            ...(headerMedia?.imageMessage ? { imageMessage: headerMedia.imageMessage } : {})
        };

        cardElements.push({
            header: cardHeader,
            body: { text: card.body || '' },
            footer: card.footer ? { text: card.footer } : undefined,
            nativeFlowMessage: {
                buttons: nativeButtons,
                messageParamsJson: '',
                messageVersion: 1
            }
        });
    }

    const mentionedJidList = Array.isArray(mentions) ? mentions : (mentions ? [mentions] : []);

    const interactiveMessage = {
        header: {
            hasMediaAttachment: false
        },
        body: { text: body || 'Pilih menu di bawah ini:' },
        footer: footer ? { text: footer } : undefined,
        carouselMessage: {
            cards: cardElements,
            messageVersion: 1
        },
        contextInfo: {
            mentionedJid: mentionedJidList
        }
    };

    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage
            }
        }
    }, { quoted, userJid: sock.user?.id });

    return await sock.relayMessage(jid, msg.message, {
        messageId: msg.key.id,
        additionalNodes: [
            {
                tag: 'biz',
                attrs: {},
                content: [
                    {
                        tag: 'interactive',
                        attrs: { type: 'native_flow', v: '1' },
                        content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                    }
                ]
            }
        ]
    });
}

module.exports = {
    sendButtonMessage,
    sendCarouselMessage
};

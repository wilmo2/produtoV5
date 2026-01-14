const xnxx = require("xnxx-dl");
const xnxxjs = require('xnxxjs');
const { PornHub } = require('pornhub.js');
const pornhub = new PornHub();
const xvideosDownload = require("xvdlvoid");
const axios = require('axios');
const cheerio = require('cheerio');

const videoService = {
    // XNXX
    async searchXNXX(query) {
        try {
            const results = await xnxx.search(query);
            return results.map(item => ({
                title: item.title,
                url: item.url,
                thumbnail: item.thumbnail || '',
                duration: item.duration || ''
            }));
        } catch (err) {
            console.error("Erro XNXX Search:", err);
            throw new Error("Falha ao pesquisar no XNXX");
        }
    },

    async getInfoXNXX(url) {
        try {
            // Tenta primeiro com xnxxjs para detalhes mais completos se disponível
            const response = await xnxxjs(url);
            if (response.estado === 200) {
                const datos = response.datos;
                return {
                    title: datos.titulo,
                    thumbnail: datos.imagen,
                    duration: datos.duracion,
                    downloadUrl: datos.urlVideo,
                    views: datos.vistas,
                    description: datos.descripcion
                };
            }
            // Fallback para xnxx-dl
            const videoInfo = await xnxx.getInfo(url);
            return {
                title: videoInfo.title,
                thumbnail: videoInfo.thumbnail,
                duration: videoInfo.duration,
                downloadUrl: videoInfo.dlink,
                views: videoInfo.views,
                likes: videoInfo.likes
            };
        } catch (err) {
            console.error("Erro XNXX Info:", err);
            throw new Error("Falha ao obter informações do XNXX");
        }
    },

    // Pornhub
    async searchPornhub(query) {
        try {
            const result = await pornhub.searchVideo(query);
            return result.data.map(item => ({
                title: item.title,
                url: item.url,
                thumbnail: item.preview,
                duration: item.duration,
                views: item.views
            }));
        } catch (err) {
            console.error("Erro Pornhub Search:", err);
            throw new Error("Falha ao pesquisar no Pornhub");
        }
    },

    async getInfoPornhub(url) {
        try {
            const info = await pornhub.video(url);
            if (!info) throw new Error("Vídeo não encontrado");
            
            return {
                title: info.title,
                thumbnail: info.thumb,
                duration: info.durationFormatted,
                views: info.views,
                downloadUrl: info.mediaDefinitions && info.mediaDefinitions.length > 0 ? info.mediaDefinitions[0].videoUrl : null,
                qualities: info.mediaDefinitions.map(m => ({ quality: m.quality, url: m.videoUrl }))
            };
        } catch (err) {
            console.error("Erro Pornhub Info:", err);
            throw new Error("Falha ao obter informações do Pornhub");
        }
    },

    // Xvideos
    async searchXvideos(query) {
        try {
            const urlBusca = `https://www.xvideos.com/?k=${encodeURIComponent(query)}`;
            const { data } = await axios.get(urlBusca, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            const results = [];
            
            $('div.mozaique > div.thumb-block').each((i, el) => {
                const $el = $(el);
                const title = $el.find('p.title a').attr('title');
                const url = 'https://www.xvideos.com' + $el.find('p.title a').attr('href');
                const thumbnail = $el.find('div.thumb img').attr('data-src') || $el.find('div.thumb img').attr('src');
                const duration = $el.find('span.duration').text();
                
                if (title && url) {
                    results.push({ title, url, thumbnail, duration });
                }
            });
            return results;
        } catch (err) {
            console.error("Erro Xvideos Search:", err);
            throw new Error("Falha ao pesquisar no Xvideos");
        }
    },

    async getInfoXvideos(url) {
        try {
            const video = await xvideosDownload(url);
            return {
                title: video.nomeVideo,
                thumbnail: video.thumbnail,
                duration: video.duracao,
                downloadUrl: video.linkDownload,
                description: video.descricao,
                date: video.dataUpload
            };
        } catch (err) {
            console.error("Erro Xvideos Info:", err);
            throw new Error("Falha ao obter informações do Xvideos");
        }
    }
};

module.exports = videoService;

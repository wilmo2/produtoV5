const siteType = window.location.pathname.replace('/', ''); // pagina1, pagina2, pagina3
const siteMap = {
    'pagina1': 'xnxx',
    'pagina2': 'pornhub',
    'pagina3': 'xvideos'
};

const currentSite = siteMap[siteType];
console.log('Site atual detectado:', currentSite);

async function searchVideos() {
    console.log('Iniciando busca...');
    const query = document.getElementById('searchInput').value;
    const resultsDiv = document.getElementById('results');
    
    if (!query) return;

    resultsDiv.innerHTML = `
        <div class="loader">
            <div class="spinner"></div>
            <p>Buscando vídeos incríveis...</p>
        </div>
    `;

    try {
        console.log(`Fazendo requisição para: /api/search?site=${currentSite}&q=${encodeURIComponent(query)}`);
        const response = await fetch(`/api/search?site=${currentSite}&q=${encodeURIComponent(query)}`);
        console.log('Resposta recebida:', response.status);
        
        if (response.status === 401) {
            window.location.href = '/';
            return;
        }

        const data = await response.json();

        if (data.error) {
            resultsDiv.innerHTML = `<div class="error-msg">${data.error}</div>`;
            return;
        }

        if (data.length === 0) {
            resultsDiv.innerHTML = '<div class="error-msg">Nenhum vídeo encontrado. Tente outros termos.</div>';
            return;
        }

        resultsDiv.innerHTML = data.map(video => `
            <div class="video-item">
                <div class="video-thumb">
                    <img src="${video.thumbnail}" alt="${video.title}" onerror="this.src='https://via.placeholder.com/320x180?text=Sem+Imagem'">
                    <span class="badge">${video.duration}</span>
                </div>
                <div class="video-details">
                    <div class="video-title">${video.title}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 0.8rem; color: var(--text-dim);">${video.views || ''}</span>
                    </div>
                    <button onclick="getVideoInfo('${video.url}')" class="btn">Ver Detalhes / Download</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        resultsDiv.innerHTML = '<div class="error-msg">Erro na conexão com o servidor. Verifique sua internet.</div>';
    }
}

async function getVideoInfo(url) {
    const resultsDiv = document.getElementById('results');
    const originalContent = resultsDiv.innerHTML;
    
    resultsDiv.innerHTML = `
        <div class="loader">
            <div class="spinner"></div>
            <p>Obtendo links de alta velocidade...</p>
        </div>
    `;

    try {
        const response = await fetch(`/api/info?site=${currentSite}&url=${encodeURIComponent(url)}`);
        
        if (response.status === 401) {
            window.location.href = '/';
            return;
        }

        const info = await response.json();

        if (info.error) {
            alert('Erro: ' + info.error);
            resultsDiv.innerHTML = originalContent;
            return;
        }

        resultsDiv.innerHTML = `
            <div class="video-item" style="margin-top: 10px;">
                <button onclick="location.reload()" class="btn btn-secondary" style="margin-bottom: 15px; width: auto; padding: 8px 15px;">← Voltar para busca</button>
                <div class="video-thumb">
                    <img src="${info.thumbnail}" alt="${info.title}">
                </div>
                <div class="video-details">
                    <h3 style="margin-bottom: 15px; font-size: 1.1rem;">${info.title}</h3>
                    <p style="font-size: 0.9rem; color: var(--text-dim); margin-bottom: 20px;">Duração: ${info.duration}</p>
                    
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${info.downloadUrl ? 
                            `<a href="${info.downloadUrl}" class="btn" style="background: var(--success); color: white;" target="_blank" download>BAIXAR VÍDEO AGORA</a>` : 
                            `<div class="error-msg">Link direto não disponível. Tente as opções abaixo ou abra no site original.</div>`
                        }
                        
                        ${info.qualities ? info.qualities.map(q => `
                            <a href="${q.url}" class="btn" style="background: #333; color: white;" target="_blank">Baixar em ${q.quality}</a>
                        `).join('') : ''}
                    </div>
                </div>
            </div>
        `;

    } catch (error) {
        alert('Erro ao obter informações do vídeo.');
        resultsDiv.innerHTML = originalContent;
    }
}

async function handleDirectLink() {
    const query = document.getElementById('searchInput').value;
    if (!query) return;
    
    if (query.startsWith('http')) {
        getVideoInfo(query);
    } else {
        searchVideos();
    }
}

// Permitir busca ao apertar Enter
document.getElementById('searchInput')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleDirectLink();
    }
});

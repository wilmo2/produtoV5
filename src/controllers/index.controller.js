const path = require('path')
const videoService = require('../services/videoService')
const ai = require('unlimited-ai')

// Tela do inquérito
exports.home = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'))
}

/*
// Receber formulário e redirecionar
exports.handleForm = (req, res) => {
  const { idade, sexo, profissao } = req.body

  console.log('Dados recebidos:')
  console.log({ idade, sexo, profissao })

  res.redirect('/home')
}
*/


exports.handleForm = (req, res) => {
  const { idade, sexo, profissao, visitor_id } = req.body;

  if (!idade || !sexo || !profissao) {
    return res.status(400).send('Todos os campos são obrigatórios.');
  }

  if (idade !== 'sim') {
    return res.send('Você precisa ser maior de idade para acessar este site.');
  }

  // Marca que passou pelo inquérito
  req.session.inqueritoOK = true;
  req.session.userData = { sexo, profissao };
  
  if (visitor_id) {
    req.session.visitor_id = visitor_id;
  }

  // Salva a sessão explicitamente antes de redirecionar (importante para o Render)
  req.session.save((err) => {
    if (err) {
      console.error('Erro ao salvar sessão:', err);
      return res.status(500).send('Erro interno do servidor');
    }
    // Após o inquérito, vai para a página de pagamento
    res.redirect('/pagamento');
  });
};

exports.pagamento = (req, res) => {
  // Se o cliente enviou um visitor_id via query (opcional) ou se já temos no localStorage (lidado no front)
  // Aqui apenas servimos o arquivo, a lógica de sessão será reforçada via API
  res.sendFile(path.join(__dirname, '../views/pagamento.html'))
}

exports.admin = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin.html'))
}

exports.recover = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/recover.html'))
}



// Tela principal
exports.mainPage = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/home.html'))
}

// Páginas
exports.pagina1 = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/pagina1.html'))
}

exports.pagina2 = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/pagina2.html'))
}

exports.pagina3 = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/pagina3.html'))
}

exports.criador = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/criador.html'))
}

// API Search
exports.apiSearch = async (req, res) => {
  const { q, site } = req.query
  if (!q || !site) return res.status(400).json({ error: 'Parâmetros ausentes' })

  try {
    let results = []
    if (site === 'xnxx') results = await videoService.searchXNXX(q)
    else if (site === 'pornhub') results = await videoService.searchPornhub(q)
    else if (site === 'xvideos') results = await videoService.searchXvideos(q)
    
    res.json(results)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// API Info
exports.apiInfo = async (req, res) => {
  const { url, site } = req.query
  if (!url || !site) return res.status(400).json({ error: 'Parâmetros ausentes' })

  try {
    let info = null
    if (site === 'xnxx') info = await videoService.getInfoXNXX(url)
    else if (site === 'pornhub') info = await videoService.getInfoPornhub(url)
    else if (site === 'xvideos') info = await videoService.getInfoXvideos(url)
    
    res.json(info)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// API Suporte IA (wxt-bot)
exports.apiSupport = async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensagem vazia' });

  const systemPrompt = `Você é o wxt-bot, o assistente de suporte oficial do site produto-wxt.
Seu objetivo é ajudar os usuários com dúvidas sobre o site, pagamentos, acesso e funcionalidades.
Regras:
1. Respostas curtas, diretas e profissionais.
2. Se o usuário estiver com dificuldades técnicas ou de pagamento, recomende entrar em contato pelo WhatsApp: +258 857 270 435 (Wilmo).
3. Explique que o site oferece downloads de vídeos do XNXX, Pornhub e Xvideos.
4. O acesso premium custa 1$ (63 MT / 18.50 ZAR / 6.00 BRL) e dura 7 dias.
5. Se perceber que o usuário não está entendendo, seja ainda mais simples e peça para chamar no WhatsApp.
6. Não responda sobre assuntos que não sejam relacionados ao site ou suporte.`;

  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message }
    ];

    const response = await ai.generate('gpt-4o', messages);
    res.json({ response });
  } catch (error) {
    console.error('Erro na IA:', error);
    res.json({ response: 'Desculpe, estou com uma instabilidade. Por favor, entre em contato pelo WhatsApp: +258 857 270 435.' });
  }
}
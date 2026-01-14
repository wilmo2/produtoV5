# Notas de Correção - Projeto produto-wxt

Este documento detalha as alterações realizadas para corrigir os problemas de navegação e sessão no Render, além da implementação do sistema de keep-alive.

## 1. Correção de Sessão e Cookies (Render)
O Render utiliza um proxy reverso, o que exige configurações específicas para que os cookies de sessão funcionem corretamente em HTTPS:
- **`app.set('trust proxy', 1)`**: Adicionado ao `server.js` para que o Express confie no proxy do Render e permita cookies seguros.
- **Configuração do Cookie**:
  - `secure: true` em produção.
  - `sameSite: 'none'` em produção para garantir que o cookie seja enviado em diferentes contextos se necessário.
  - `resave: true`: Alterado para garantir que a sessão seja persistida corretamente em cada requisição.

## 2. Persistência de Sessão no Redirecionamento
No Render, o redirecionamento pode ocorrer antes que a sessão seja totalmente gravada no "store" (memória).
- **`req.session.save()`**: No `index.controller.js`, agora chamamos explicitamente o salvamento da sessão antes de executar o `res.redirect('/pagamento')`. Isso garante que o middleware de autenticação encontre os dados na próxima rota.

## 3. Sistema Keep-Alive (Evitar Sleep do Render)
O Render coloca instâncias gratuitas para "dormir" após 15 minutos de inatividade.
- **Rota `/ping`**: Criada uma rota leve que apenas responde "pong".
- **Auto-Ping**: Implementado um `setInterval` que faz uma requisição para a própria URL do site a cada 14 minutos.
- **Configuração**: Para ativar, você deve adicionar a variável de ambiente `RENDER_EXTERNAL_URL` no painel do Render com a URL do seu site (ex: `https://seu-site.onrender.com`).

## 4. Dependências
- Adicionado o pacote `axios` para realizar o auto-ping.

## Como Aplicar no Render:
1. Vá nas configurações do seu Web Service no Render.
2. Em **Environment Variables**, adicione:
   - `NODE_ENV`: `production`
   - `RENDER_EXTERNAL_URL`: `https://o-link-do-seu-site.onrender.com`
   - `SESSION_SECRET`: `uma-chave-aleatoria-e-segura`
3. O comando de inicialização deve continuar sendo `npm start`.

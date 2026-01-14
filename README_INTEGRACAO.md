# Integração de Pagamento e Admin - Video Downloader

Este projeto foi integrado para funcionar como um sistema único, focado em mobile e pronto para deploy na Vercel.

## Mudanças Realizadas:
1.  **Fluxo de Usuário:**
    *   O usuário responde ao inquérito inicial (com botões de profissão).
    *   Após o inquérito, é redirecionado para a página de **Pagamento**.
    *   Na página de pagamento, ele escolhe M-Pesa ou e-Mola e envia o comprovante.
    *   O acesso é liberado manualmente pelo Admin.
2.  **Painel Administrativo:**
    *   Acessível em `/admin`.
    *   Senha configurada: `wilmo`.
    *   Permite visualizar comprovantes e aprovar acessos com um clique.
3.  **Controle de Acesso:**
    *   Middleware integrado que verifica se o pagamento foi aprovado e se ainda está dentro do prazo de 7 dias.
    *   Se o acesso expirar, o usuário é redirecionado de volta para o pagamento.
4.  **Perfil e Suporte:**
    *   Menu superior no site principal com acesso ao perfil.
    *   Botões de suporte via WhatsApp e Email integrados.
5.  **Mobile First:**
    *   Todas as novas páginas (Pagamento, Admin, Recover) foram desenhadas para uso em dispositivos móveis.

## Como fazer o Deploy na Vercel:
1.  Conecte seu repositório à Vercel.
2.  Adicione as seguintes variáveis de ambiente (opcional, já estão no código como fallback):
    *   `SUPABASE_URL`
    *   `SUPABASE_SERVICE_KEY`
    *   `SESSION_SECRET`
3.  A Vercel usará o arquivo `vercel.json` para configurar as rotas automaticamente.

## Senha Admin:
A senha para o painel administrativo é: **wilmo**

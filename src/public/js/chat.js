const chatWidgetHTML = `
  <div id="ai-chat-widget">
    <button id="ai-chat-button" onclick="toggleChat()">💬</button>
    <div id="ai-chat-window">
      <div id="ai-chat-header">
        <span>wxt-bot (Suporte)</span>
        <button onclick="toggleChat()" style="background:transparent; border:none; color:black; font-weight:bold; cursor:pointer;">✕</button>
      </div>
      <div id="ai-chat-messages">
        <div class="chat-msg bot">Olá! Eu sou o wxt-bot. Como posso te ajudar hoje?</div>
      </div>
      <div id="ai-chat-input-area">
        <input type="text" id="ai-chat-input" placeholder="Digite sua dúvida..." onkeypress="handleChatKey(event)">
        <button id="ai-chat-send" onclick="sendChatMessage()">></button>
      </div>
    </div>
  </div>
`;

document.body.insertAdjacentHTML('beforeend', chatWidgetHTML);

let chatHistory = [];

function toggleChat() {
  const window = document.getElementById('ai-chat-window');
  window.style.display = window.style.display === 'flex' ? 'none' : 'flex';
}

function handleChatKey(e) {
  if (e.key === 'Enter') sendChatMessage();
}

async function sendChatMessage() {
  const input = document.getElementById('ai-chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  appendMessage('user', msg);
  input.value = '';

  const messagesDiv = document.getElementById('ai-chat-messages');
  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'chat-msg bot';
  loadingMsg.innerText = 'Digitando...';
  messagesDiv.appendChild(loadingMsg);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  try {
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg, history: chatHistory })
    });
    const data = await res.json();
    
    messagesDiv.removeChild(loadingMsg);
    appendMessage('bot', data.response);
    
    chatHistory.push({ role: 'user', content: msg });
    chatHistory.push({ role: 'bot', content: data.response });
    if (chatHistory.length > 10) chatHistory.shift(); // Manter memória curta
  } catch (e) {
    messagesDiv.removeChild(loadingMsg);
    appendMessage('bot', 'Erro de conexão. Tente o WhatsApp.');
  }
}

function appendMessage(sender, text) {
  const messagesDiv = document.getElementById('ai-chat-messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender}`;
  msgDiv.innerText = text;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

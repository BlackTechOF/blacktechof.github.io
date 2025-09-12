let botOcupado = false;
let intervaloId;
let controller;
let currentChatId = null; // chat atual

const API_URL = "https://blacktechof-github-io.onrender.com"; // troque pela URL no deploy

// ================= AUTENTICAÇÃO =================
async function register() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  alert(data.message || data.error);
}

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem("token", data.token);

    document.getElementById("auth-container").style.display = "none";
    document.getElementById("chat-container").style.display = "block";

    await loadChats();
    await ensureChatExists(); // 🔥 garante que sempre haja um chat
  } else {
    alert(data.error);
  }
}

// 🔑 auto login se já tem token
window.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const res = await fetch(`${API_URL}/chatdb/list`, {
        headers: { "Authorization": "Bearer " + token }
      });
      if (res.ok) {
        document.getElementById("auth-container").style.display = "none";
        document.getElementById("chat-container").style.display = "block";
        await loadChats();
        await ensureChatExists(); // 🔥 garante chat também no autologin
      } else {
        localStorage.removeItem("token");
      }
    } catch {
      console.error("Erro ao validar token");
    }
  }

  // listeners
  const input = document.getElementById("userInput");
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  const sendBtn = document.getElementById("inputs");
  if (sendBtn) {
    sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      sendMessage();
    });
  }

  const newChatBtn = document.getElementById("new-chat-btn");
  if (newChatBtn) {
    newChatBtn.addEventListener("click", () => newChat());
  }
});

// ================= CHATS =================
async function ensureChatExists() {
  const res = await fetch(`${API_URL}/chatdb/list`, {
    headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
  });
  const chats = await res.json();

  if (chats.length === 0) {
    // se não existir nenhum chat, cria um novo
    const newC = await fetch(`${API_URL}/chatdb/new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ title: "Novo Chat" })
    });
    const chat = await newC.json();
    currentChatId = chat._id;
  } else {
    // usa o primeiro chat da lista
    currentChatId = chats[0]._id;
    loadHistory(currentChatId);
  }
}

async function newChat() {
  const res = await fetch(`${API_URL}/chatdb/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ title: "Novo Chat" })
  });

  const chat = await res.json();
  currentChatId = chat._id;
  loadChats();
  loadHistory(currentChatId);
}

async function loadChats() {
  const res = await fetch(`${API_URL}/chatdb/list`, {
    headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
  });

  const chats = await res.json();
  const chatList = document.getElementById("chat-list");
  if (!chatList) return;

  chatList.innerHTML = "";

  chats.forEach(c => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";

    // título do chat (clique para abrir)
    const span = document.createElement("span");
    span.textContent = c.title;
    span.style.cursor = "pointer";
    span.onclick = () => {
      currentChatId = c._id;
      loadHistory(currentChatId);
    };

    // botão apagar
    const delBtn = document.createElement("button");
    delBtn.innerHTML = `
    <svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10 11V17" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14 11V17" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M4 7H20" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6 7H12H18V18C18 19.6569 16.6569 21 15 21H9C7.34315 21 6 19.6569 6 18V7Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
    delBtn.onclick = async (e) => {
      e.stopPropagation(); // não abrir chat ao clicar no 🗑️
      if (confirm("Tem certeza que deseja excluir este chat?")) {
        await fetch(`${API_URL}/chatdb/${c._id}`, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
        });
        loadChats();

        // se você estava nesse chat, limpa mensagens
        if (currentChatId === c._id) {
          currentChatId = null;
          document.getElementById("messages").innerHTML = "";
        }
      }
    };

    li.appendChild(span);
    li.appendChild(delBtn);
    chatList.appendChild(li);
  });
}

async function loadHistory(chatId) {
  if (!chatId) return;

  const res = await fetch(`${API_URL}/chatdb/${chatId}`, {
    headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
  });

  const history = await res.json();
  const messagesDiv = document.getElementById("messages");
  if (!messagesDiv) return;

  messagesDiv.innerHTML = "";

  history.forEach(msg => {
    const div = document.createElement("div");
    div.className = `message ${msg.role}`;

    if (msg.role === "user") {
      div.innerHTML = `
        <svg viewBox="0 0 30 30"><path d="..."/></svg>
        ${marked.parse(msg.content)}
      `;
    } else {
      div.innerHTML = `
        <div class="bot-icon">🤖</div>
        <div class="bot-content">${marked.parse(msg.content)}</div>
      `;
    }

    messagesDiv.appendChild(div);
  });

  // aplicar highlight.js nos códigos depois de renderizar
  if (typeof hljs !== "undefined") {
    hljs.highlightAll();
  }

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ================= CHAT MENSAGENS =================
async function sendMessage() {
  if (botOcupado || !currentChatId) return;
  botOcupado = true;

  const input = document.getElementById("userInput");
  const messagesDiv = document.getElementById("messages");
  if (!input || !messagesDiv) {
    botOcupado = false;
    return;
  }

  const userMessage = input.value.trim();
  if (!userMessage) {
    botOcupado = false;
    return;
  }

  // mostra msg user
  const userDiv = document.createElement("div");
  userDiv.className = 'message user';
  userDiv.innerHTML = `<svg viewBox="0 0 30 30"><path d="..."/></svg> ${userMessage}`;
  messagesDiv.appendChild(userDiv);

  // salva no banco
  await fetch(`${API_URL}/chatdb/${currentChatId}/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ role: "user", content: userMessage })
  });

  input.value = "";
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // placeholder bot
  const botDiv = document.createElement("div");
  botDiv.className = "message bot bot_ativo";
  botDiv.innerHTML = `<span>Pensando</span> <span>Na</span> <span>Resposta</span>`;
  messagesDiv.appendChild(botDiv);

  try {
    controller = new AbortController();

    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
      signal: controller.signal
    });

    const data = await response.json();

    // digita resposta
let i = 0;
intervaloId = setInterval(async () => {
  const sliced = data.reply.slice(0, i);

  botDiv.innerHTML = `
    <div class="bot-icon">🤖</div>
    <div class="bot-content">${marked.parse(sliced)}</div>
  `;

  if (i >= data.reply.length) {
    clearInterval(intervaloId);
    botOcupado = false;

    // aplica highlight.js depois que terminar de escrever
    if (typeof hljs !== "undefined") {
      hljs.highlightAll();
    }

    // salva resposta
    await fetch(`${API_URL}/chatdb/${currentChatId}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ role: "bot", content: data.reply })
    });
  }
  i++;
}, 15);

  } catch (err) {
    botDiv.textContent = "Erro na IA.";
    console.error(err);
    botOcupado = false;
  }
}

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem("token");
  currentChatId = null;
  document.getElementById("chat-container").style.display = "none";
  document.getElementById("auth-container").style.display = "block";
}

// listener para logout
window.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
});


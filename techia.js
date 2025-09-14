// techia.js (corrigido e mais resiliente)
let botOcupado = false;
let intervaloId;
let controller;
let currentChatId = null; // id do chat atual

const API_URL = "https://blacktechof-github-io.onrender.com"; // ajuste se necessário

/* ================= Helpers UX ================= */
function el(id) { return document.getElementById(id); }

function appendSystemMessage(text) {
  const messagesDiv = el("messages");
  if (!messagesDiv) return;
  const div = document.createElement("div");
  div.className = "message bot";
  // mensagem do sistema em negrito
  div.innerHTML = `<b>${text}</b>`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function showWarningInUI(text) {
  const messagesDiv = el("messages");
  if (!messagesDiv) return;
  const div = document.createElement("div");
  div.className = "message bot";
  div.innerHTML = `⚠️ ${text}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/* ================= AUTENTICAÇÃO ================= */
async function register() {
  const username = el("username")?.value;
  const password = el("password")?.value;
  if (!username || !password) return alert("Preencha usuário e senha");

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    alert(data.message || data.error || JSON.stringify(data));
  } catch (err) {
    console.error("Erro register:", err);
    alert("Erro ao registrar.");
  }
}

async function login() {
  const username = el("username")?.value;
  const password = el("password")?.value;
  if (!username || !password) return alert("Preencha usuário e senha");

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      if (el("auth-container")) el("auth-container").style.display = "none";
      if (el("chat-container")) el("chat-container").style.display = "block";
      await loadChats();
      await ensureChatExists();
    } else {
      alert(data.error || "Erro no login");
    }
  } catch (err) {
    console.error("Erro login:", err);
    alert("Erro no login.");
  }
}

/* ================= AUTO-LOGIN E LISTENERS ================= */
window.addEventListener("DOMContentLoaded", async () => {
  // Adiciona listeners de botões/apertar enter de forma segura
  try {
    const token = localStorage.getItem("token");
    if (token) {
      // valida token e carrega chats
      try {
        const res = await fetch(`${API_URL}/chatdb/list`, {
          headers: { "Authorization": "Bearer " + token }
        });
        if (res.ok) {
          if (el("auth-container")) el("auth-container").style.display = "none";
          if (el("chat-container")) el("chat-container").style.display = "block";
          await loadChats();
          await ensureChatExists();
        } else {
          console.warn("Token inválido/expirado");
          logout();
        }
      } catch (err) {
        console.error("Erro ao validar token:", err);
        logout();
      }
    }
  } catch (err) {
    console.error("Erro no auto-login:", err);
  }

  // listeners comuns (verifica existência de elementos)
  const input = el("userInput");
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }

  const sendBtn = el("inputs");
  if (sendBtn) {
    sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      sendMessage();
    });
  }

  const newChatBtn = el("new-chat-btn");
  if (newChatBtn) newChatBtn.addEventListener("click", () => newChat());

  const logoutBtn = el("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // sidebar toggle (se existir)
  const sidebar = document.querySelector(".sidebar");
  const toggleBtn = el("toggleSidebar");
  const fecharSideBar = el("fecharSideBar");
  const main = document.querySelector(".principal");

  if (toggleBtn && sidebar && main) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("active");
      main.classList.toggle("blurred", sidebar.classList.contains("active"));
    });
  }
  if (fecharSideBar && sidebar && main) {
    fecharSideBar.addEventListener("click", () => {
      sidebar.classList.toggle("active");
      main.classList.toggle("blurred", sidebar.classList.contains("active"));
    });
  }
});

/* ================= CHATS (CRUD) ================= */
async function ensureChatExists() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/chatdb/list`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) {
      console.warn("Não foi possível listar chats:", res.status);
      return;
    }
    const chats = await res.json();
    if (!Array.isArray(chats) || chats.length === 0) {
      // cria novo chat
      const createRes = await fetch(`${API_URL}/chatdb/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ title: "Novo Chat" })
      });
      const chat = await createRes.json();
      currentChatId = chat._id;
      await loadChats();
      await loadHistory(currentChatId);
    } else {
      currentChatId = chats[0]._id;
      await loadChats();
      await loadHistory(currentChatId);
    }
  } catch (err) {
    console.error("Erro ensureChatExists:", err);
  }
}

async function newChat() {
  const token = localStorage.getItem("token");
  if (!token) return logout();
  try {
    const res = await fetch(`${API_URL}/chatdb/new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ title: "Novo Chat" })
    });
    const chat = await res.json();
    currentChatId = chat._id;
    await loadChats();
    await loadHistory(currentChatId);
  } catch (err) {
    console.error("Erro newChat:", err);
    alert("Erro ao criar chat.");
  }
}

async function loadChats() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_URL}/chatdb/list`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) {
      console.warn("Não foi possível buscar lista de chats:", res.status);
      return;
    }
    const chats = await res.json();
    const chatList = el("chat-list");
    if (!chatList) return;
    chatList.innerHTML = "";

    chats.forEach(c => {
      const li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";

      const span = document.createElement("span");
      span.textContent = c.title;
      span.style.cursor = "pointer";
      span.onclick = () => {
        currentChatId = c._id;
        loadHistory(currentChatId);
      };

      const delBtn = document.createElement("button");
      delBtn.innerHTML = "🗑️";
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm("Excluir este chat?")) return;
        try {
          await fetch(`${API_URL}/chatdb/${c._id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
          });
          await loadChats();
          if (currentChatId === c._id) {
            currentChatId = null;
            const messagesDiv = el("messages");
            if (messagesDiv) messagesDiv.innerHTML = "";
          }
        } catch (err) {
          console.error("Erro ao deletar chat:", err);
        }
      };

      li.appendChild(span);
      li.appendChild(delBtn);
      chatList.appendChild(li);
    });
  } catch (err) {
    console.error("Erro loadChats:", err);
  }
}

async function loadHistory(chatId) {
  if (!chatId) return;
  const token = localStorage.getItem("token");
  if (!token) return logout();

  try {
    const res = await fetch(`${API_URL}/chatdb/${chatId}`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) {
      console.warn("Erro ao carregar histórico:", res.status);
      return;
    }
    const history = await res.json();
    const messagesDiv = el("messages");
    if (!messagesDiv) return;
    messagesDiv.innerHTML = "";

    history.forEach(msg => {
      const div = document.createElement("div");
      div.className = `message ${msg.role}`;
      // usa marked para markdown (se disponível). Se não, usa texto simples.
      try {
        div.innerHTML = (typeof marked !== "undefined") ? marked.parse(msg.content) : msg.content;
      } catch (e) {
        div.textContent = msg.content;
      }
      messagesDiv.appendChild(div);
    });

    // after render
    if (typeof hljs !== "undefined") hljs.highlightAll();
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } catch (err) {
    console.error("Erro loadHistory:", err);
  }
}

/* ================= SALVAR MENSAGEM (com fallback) ================= */
async function createChatAndSet(title = "Novo Chat") {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/chatdb/new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ title })
    });
    if (!res.ok) {
      console.error("Erro criar chat:", res.status);
      return null;
    }
    const chat = await res.json();
    currentChatId = chat._id;
    await loadChats();
    return chat._id;
  } catch (err) {
    console.error("Erro createChatAndSet:", err);
    return null;
  }
}

async function saveMessage(role, content) {
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("Sem token ao salvar mensagem");
    return false;
  }
  if (!currentChatId) {
    // tenta criar chat automaticamente
    const created = await createChatAndSet("Chat criado automaticamente");
    if (!created) {
      console.error("Não foi possível criar chat para salvar mensagem");
      return false;
    }
  }

  try {
    const res = await fetch(`${API_URL}/chatdb/${currentChatId}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ role, content })
    });

    if (res.ok) return true;

    // se 404 -> tenta recriar chat e reenviar
    if (res.status === 404) {
      console.warn("Salvar retornou 404. Tentando criar novo chat e reenviar...");
      const newId = await createChatAndSet("Chat (retry)");
      if (!newId) return false;
      const retry = await fetch(`${API_URL}/chatdb/${newId}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ role, content })
      });
      return retry.ok;
    }

    // loga corpo do erro para debug
    const text = await res.text();
    console.error("Erro ao salvar mensagem:", res.status, text);
    return false;
  } catch (err) {
    console.error("Erro ao salvar mensagem (fetch):", err);
    return false;
  }
}

/* ================= CHAT (enviar mensagem -> servidor faz IA + websearch) ================= */
async function sendMessage() {
  if (botOcupado) return;
  if (!currentChatId) {
    // tenta criar chat antes de enviar
    await createChatAndSet("Chat automático ao enviar");
  }
  if (!currentChatId) {
    alert("Não foi possível criar ou selecionar um chat. Tente logar novamente.");
    return;
  }

  const input = el("userInput");
  const messagesDiv = el("messages");
  const token = localStorage.getItem("token");
  if (!input || !messagesDiv) return;
  if (!token) return logout();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  // mostra mensagem do usuário localmente
  const userDiv = document.createElement("div");
  userDiv.className = "message user";
  userDiv.textContent = userMessage;
  messagesDiv.appendChild(userDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // salva no banco (tenta, mas não bloqueia o envio ao servidor)
  const saved = await saveMessage("user", userMessage);
  if (!saved) {
    console.warn("Mensagem do usuário não pôde ser salva no servidor (continuando)...");
    showWarningInUI("Mensagem não salva no servidor (servidor pode estar fora).");
  }

  input.value = "";
  botOcupado = true;

  // placeholder "pensando"
  const botDiv = document.createElement("div");
  botDiv.className = "message bot bot_ativo";
  botDiv.textContent = "⏳ Pensando...";
  messagesDiv.appendChild(botDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // prepara controller para abort
  try {
    controller = new AbortController();

    const res = await fetch(`${API_URL}/chat/${currentChatId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ message: userMessage }),
      signal: controller.signal
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Erro na rota /chat/:", res.status, txt);
      botDiv.textContent = "⚠️ Erro na IA (resposta inválida).";
      showWarningInUI("Erro ao obter resposta do servidor.");
      botOcupado = false;
      return;
    }

    const data = await res.json();

    // se o backend retornar { web: "...", reply: "..." } ou somente reply,
    // nós manejamos ambos. Assumimos `data.reply` string.
    let reply = data?.reply ?? "";
    // se o backend informar que buscou na web, prefixa com indicador (opcional)
    if (data?.webFetched) {
      reply = `🌐 ${reply}`;
    }

    // efeito digitando com interval
    let i = 0;
    intervaloId = setInterval(async () => {
      try {
        const partial = reply.slice(0, i);
        botDiv.innerHTML = (typeof marked !== "undefined") ? marked.parse(partial) : partial;
      } catch (e) {
        botDiv.textContent = reply.slice(0, i);
      }
      if (i >= reply.length) {
        clearInterval(intervaloId);
        botOcupado = false;
        // salva resposta do bot (tenta)
        const ok = await saveMessage("bot", reply);
        if (!ok) {
          console.warn("Resposta do bot não pôde ser salva.");
          showWarningInUI("Resposta do bot não foi salva no servidor.");
        }
      }
      i++;
    }, 12);

  } catch (err) {
    if (err.name === "AbortError") {
      console.warn("Resposta abortada pelo usuário");
      botDiv.textContent = "⏹ Resposta interrompida.";
    } else {
      console.error("Erro sendMessage:", err);
      botDiv.textContent = "⚠️ Erro na IA.";
      showWarningInUI("Erro ao buscar resposta (ver console).");
    }
    botOcupado = false;
  }
}

function interromperResposta() {
  // aborta o fetch e limpa intervalos
  try {
    if (controller) controller.abort();
  } catch (e) {}
  try { clearInterval(intervaloId); } catch(e){}
  botOcupado = false;
}

/* ================= LOGOUT ================= */
function logout() {
  try { localStorage.removeItem("token"); } catch (e) {}
  currentChatId = null;
  if (el("chat-container")) el("chat-container").style.display = "none";
  if (el("auth-container")) el("auth-container").style.display = "block";
}

/* ================= fim ================= */
// nota: este arquivo assume que o backend expõe:
// POST /auth/register
// POST /auth/login  -> { token }
// GET  /chatdb/list
// POST /chatdb/new  -> { _id }
// GET  /chatdb/:id   -> returns array of messages
// POST /chatdb/:id/save  -> saves message
// POST /chat/:id  -> { reply: "texto", webFetched: true/false }
//
// A lógica de buscar na web (DuckDuckGo) DEVE estar no servidor.
// O cliente só exibe o texto retornado pelo backend.


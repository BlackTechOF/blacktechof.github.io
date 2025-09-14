/* techia.js - versão corrigida e robusta */

let botOcupado = false;
let intervaloId = null;
let controller = null;
let currentChatId = null;
let lastBotDiv = null;

const API_URL = "https://blacktechof-github-io.onrender.com"; // <-- seu backend

/* ---------- Helpers ---------- */
async function safeParseResponse(res) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (ct.includes("application/json")) {
    try { return JSON.parse(text); } catch { return text; }
  }
  // se não for JSON, retorna o texto (HTML de erro possivelmente)
  return text;
}

function showLocalError(message) {
  console.warn(message);
  const messagesDiv = document.getElementById("messages");
  if (!messagesDiv) return;
  const errDiv = document.createElement("div");
  errDiv.className = "message bot";
  errDiv.textContent = "⚠️ " + message;
  messagesDiv.appendChild(errDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/* ---------- Auth: register/login ---------- */
async function register() {
  const username = document.getElementById("username")?.value;
  const password = document.getElementById("password")?.value;
  if (!username || !password) return alert("Preencha usuário e senha.");

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await safeParseResponse(res);
    if (!res.ok) return alert(data.error || "Erro ao registrar");
    alert(data.message || "Registrado com sucesso");
  } catch (err) {
    console.error("Erro no register:", err);
    alert("Erro ao registrar.");
  }
}

async function login() {
  const username = document.getElementById("username")?.value;
  const password = document.getElementById("password")?.value;
  if (!username || !password) return alert("Preencha usuário e senha.");

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await safeParseResponse(res);
    if (!res.ok) {
      const err = data.error || "Erro ao logar";
      alert(err);
      return;
    }

    if (data.token) {
      localStorage.setItem("token", data.token);
      document.getElementById("auth-container") && (document.getElementById("auth-container").style.display = "none");
      document.getElementById("chat-container") && (document.getElementById("chat-container").style.display = "block");
      await loadChats();
      await ensureChatExists();
    } else {
      alert("Sem token retornado");
    }
  } catch (err) {
    console.error("Erro no login:", err);
    alert("Erro ao conectar no servidor.");
  }
}

/* ---------- Auto-login (se token existe) e listeners ---------- */
window.addEventListener("DOMContentLoaded", async () => {
  // Attach basic listeners
  const input = document.getElementById("userInput");
  if (input) input.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

  const sendBtn = document.getElementById("inputs");
  if (sendBtn) sendBtn.addEventListener("click", (e) => { e.preventDefault(); sendMessage(); });

  const interruptBtn = document.getElementById("interrupt-btn");
  if (interruptBtn) interruptBtn.addEventListener("click", interromperResposta);

  const newChatBtn = document.getElementById("new-chat-btn");
  if (newChatBtn) newChatBtn.addEventListener("click", newChat);

  // logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // sidebar toggles
  const sidebar = document.querySelector(".sidebar");
  const toggleBtn = document.getElementById("toggleSidebar");
  const fecharSideBar = document.getElementById("fecharSideBar");
  const main = document.querySelector(".principal");
  if (toggleBtn && sidebar && main) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("active");
      main.classList.toggle("blurred", sidebar.classList.contains("active"));
    });
  }
  if (fecharSideBar && sidebar && main) {
    fecharSideBar.addEventListener("click", () => {
      sidebar.classList.remove("active");
      main.classList.remove("blurred");
    });
  }

  // Auto-login: se já tem token
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const res = await fetch(`${API_URL}/chatdb/list`, { headers: { "Authorization": "Bearer " + token } });
      if (res.ok) {
        document.getElementById("auth-container") && (document.getElementById("auth-container").style.display = "none");
        document.getElementById("chat-container") && (document.getElementById("chat-container").style.display = "block");
        await loadChats();
        await ensureChatExists();
      } else {
        // Token inválido: remove e mostra auth
        localStorage.removeItem("token");
      }
    } catch (err) {
      console.error("Erro ao validar token:", err);
      localStorage.removeItem("token");
    }
  }
});

/* ---------- CHATS (list / create / delete / history) ---------- */
async function ensureChatExists() {
  try {
    const res = await fetch(`${API_URL}/chatdb/list`, { headers: { "Authorization": "Bearer " + localStorage.getItem("token") } });
    if (!res.ok) {
      console.warn("ensureChatExists: lista retornou não-ok", res.status);
      return;
    }
    const chats = await safeParseResponse(res);
    if (!Array.isArray(chats) || chats.length === 0) {
      const newC = await fetch(`${API_URL}/chatdb/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("token") },
        body: JSON.stringify({ title: "Novo Chat" })
      });
      if (!newC.ok) {
        console.error("Erro ao criar chat:", await safeParseResponse(newC));
        return;
      }
      const chat = await safeParseResponse(newC);
      currentChatId = chat._id;
      await loadChats();
    } else {
      currentChatId = chats[0]._id;
      await loadHistory(currentChatId);
    }
  } catch (err) {
    console.error("Erro em ensureChatExists:", err);
  }
}

async function newChat() {
  try {
    const res = await fetch(`${API_URL}/chatdb/new`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("token") },
      body: JSON.stringify({ title: "Novo Chat" })
    });
    if (!res.ok) {
      const t = await safeParseResponse(res);
      console.error("Erro criando novo chat:", res.status, t);
      return;
    }
    const chat = await safeParseResponse(res);
    currentChatId = chat._id;
    await loadChats();
    await loadHistory(currentChatId);
  } catch (err) {
    console.error("Erro em newChat:", err);
  }
}

async function loadChats() {
  try {
    const res = await fetch(`${API_URL}/chatdb/list`, { headers: { "Authorization": "Bearer " + localStorage.getItem("token") } });
    if (!res.ok) {
      console.error("loadChats: fetch retornou", res.status);
      return;
    }
    const chats = await safeParseResponse(res);
    const chatList = document.getElementById("chat-list");
    if (!chatList) return;
    chatList.innerHTML = "";
    (chats || []).forEach(c => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = c.title || "Sem título";
      span.style.cursor = "pointer";
      span.onclick = () => { currentChatId = c._id; loadHistory(currentChatId); };

      const delBtn = document.createElement("button");
      delBtn.innerHTML = "🗑️";
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm("Tem certeza que deseja excluir este chat?")) return;
        try {
          const del = await fetch(`${API_URL}/chatdb/${c._id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
          });
          if (!del.ok) {
            console.error("Erro ao deletar chat:", await safeParseResponse(del));
            return;
          }
          if (currentChatId === c._id) {
            currentChatId = null;
            document.getElementById("messages") && (document.getElementById("messages").innerHTML = "");
          }
          await loadChats();
        } catch (err) {
          console.error("Erro ao deletar chat:", err);
        }
      };

      li.appendChild(span);
      li.appendChild(delBtn);
      chatList.appendChild(li);
    });
  } catch (err) {
    console.error("Erro em loadChats:", err);
  }
}

async function loadHistory(chatId) {
  if (!chatId) return;
  try {
    const res = await fetch(`${API_URL}/chatdb/${chatId}`, { headers: { "Authorization": "Bearer " + localStorage.getItem("token") } });
    if (!res.ok) {
      console.error("loadHistory: erro fetch", res.status);
      return;
    }
    const history = await safeParseResponse(res);
    const messagesDiv = document.getElementById("messages");
    if (!messagesDiv) return;
    messagesDiv.innerHTML = "";
    (history || []).forEach(msg => {
      const div = document.createElement("div");
      div.className = `message ${msg.role}`;
      // usa marked se disponível, senão texto puro
      if (typeof marked !== "undefined") {
        div.innerHTML = marked.parse(msg.content);
      } else {
        div.textContent = msg.content;
      }
      messagesDiv.appendChild(div);
    });
    if (typeof hljs !== "undefined") hljs.highlightAll();
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } catch (err) {
    console.error("Erro em loadHistory:", err);
  }
}

/* ---------- SALVAR MENSAGEM (retorna boolean) ---------- */
async function saveMessage(role, content) {
  if (!currentChatId) {
    console.error("Nenhum chat selecionado para salvar mensagem.");
    return false;
  }
  try {
    const res = await fetch(`${API_URL}/chatdb/${currentChatId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("token") },
      body: JSON.stringify({ role, content })
    });
    if (!res.ok) {
      const body = await safeParseResponse(res);
      console.error("Erro ao salvar mensagem:", res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Erro saveMessage:", err);
    return false;
  }
}

/* ---------- ENVIAR MENSAGEM (fluxo completo) ---------- */
async function sendMessage() {
  if (botOcupado) return;
  if (!currentChatId) return showLocalError("Nenhum chat selecionado. Crie um chat antes de enviar mensagens.");

  const input = document.getElementById("userInput");
  const messagesDiv = document.getElementById("messages");
  const token = localStorage.getItem("token");
  if (!input || !messagesDiv) return;

  const userMessage = input.value.trim();
  if (!userMessage) return;
  input.value = "";

  // mostra msg do usuário (imediato)
  const userDiv = document.createElement("div");
  userDiv.className = "message user";
  // usar marked se disponível (para permitir formatação enviada pelo usuário)
  userDiv.innerHTML = (typeof marked !== "undefined") ? marked.parse(userMessage) : userMessage;
  messagesDiv.appendChild(userDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // salva no banco
  const okSaveUser = await saveMessage("user", userMessage);
  if (!okSaveUser) {
    showLocalError("Erro ao salvar sua mensagem no servidor.");
  }

  // placeholder do bot
  const botDiv = document.createElement("div");
  botDiv.className = "message bot bot_ativo";
  botDiv.textContent = "⏳ Pensando...";
  messagesDiv.appendChild(botDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  lastBotDiv = botDiv;

  // mostra interrupt button se existir
  const interruptBtn = document.getElementById("interrupt-btn");
  if (interruptBtn) interruptBtn.style.display = "inline-block";

  // bloqueia novo envio
  botOcupado = true;
  // desabilitar input/enviar
  const sendBtn = document.getElementById("inputs");
  if (sendBtn) sendBtn.disabled = true;
  if (input) input.disabled = true;

  try {
    controller = new AbortController();
    const response = await fetch(`${API_URL}/chat/${currentChatId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ message: userMessage }),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await safeParseResponse(response);
      console.error("Resposta do /chat não OK:", response.status, body);
      botDiv.textContent = "⚠️ Erro na resposta da IA.";
      botOcupado = false;
      if (interruptBtn) interruptBtn.style.display = "none";
      if (sendBtn) sendBtn.disabled = false;
      if (input) input.disabled = false;
      return;
    }

    const data = await safeParseResponse(response);
    const replyText = (typeof data === "object" && data.reply) ? data.reply : (typeof data === "string" ? data : String(data.reply || "Erro: resposta inválida"));

    // anima "digitando" de forma incremental
    let i = 0;
    const total = replyText.length;
    clearInterval(intervaloId);
    intervaloId = setInterval(() => {
      const slice = replyText.slice(0, i);
      if (typeof marked !== "undefined") botDiv.innerHTML = `<div class="bot-icon">🤖</div><div class="bot-content">${marked.parse(slice)}</div>`;
      else botDiv.textContent = slice;

      messagesDiv.scrollTop = messagesDiv.scrollHeight;

      if (i >= total) {
        clearInterval(intervaloId);
        botOcupado = false;
        // salva resposta completa
        saveMessage("bot", replyText).catch(err => console.error("Erro ao salvar resposta:", err));
        // esconder interrupt
        if (interruptBtn) interruptBtn.style.display = "none";
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.disabled = false;
        // highlight se disponível
        if (typeof hljs !== "undefined") hljs.highlightAll();
      }
      i++;
    }, 12); // velocidade de "digitação"

  } catch (err) {
    if (err.name === "AbortError") {
      // usuário interrompeu
      if (lastBotDiv) lastBotDiv.textContent = "⏹ Resposta interrompida.";
    } else {
      console.error("Erro na IA:", err);
      if (lastBotDiv) lastBotDiv.textContent = "⚠️ Erro na IA.";
    }
    botOcupado = false;
    const interruptBtn = document.getElementById("interrupt-btn");
    if (interruptBtn) interruptBtn.style.display = "none";
    const sendBtn = document.getElementById("inputs");
    if (sendBtn) sendBtn.disabled = false;
    if (document.getElementById("userInput")) document.getElementById("userInput").disabled = false;
  }
}

/* ---------- Interromper resposta ---------- */
function interromperResposta() {
  if (intervaloId) {
    clearInterval(intervaloId);
    intervaloId = null;
  }
  if (controller) {
    try { controller.abort(); } catch (e) {}
    controller = null;
  }
  botOcupado = false;
  const interruptBtn = document.getElementById("interrupt-btn");
  if (interruptBtn) interruptBtn.style.display = "none";
  const sendBtn = document.getElementById("inputs");
  if (sendBtn) sendBtn.disabled = false;
  const input = document.getElementById("userInput");
  if (input) input.disabled = false;
  if (lastBotDiv) lastBotDiv.textContent = "⏹ Resposta interrompida.";
}

/* ---------- Logout ---------- */
function logout() {
  localStorage.removeItem("token");
  currentChatId = null;
  const chatContainer = document.getElementById("chat-container");
  const authContainer = document.getElementById("auth-container");
  if (chatContainer) chatContainer.style.display = "none";
  if (authContainer) authContainer.style.display = "block";
}

/* ---------- Expor algumas funções para console (opcional) ---------- */
window.techia = {
  sendMessage,
  newChat,
  loadChats,
  loadHistory,
  logout
};

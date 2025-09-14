let botOcupado = false;
let intervaloId;
let controller;
let currentChatId = null; // chat atual

const API_URL = "https://blacktechof-github-io.onrender.com"; // backend

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
    await ensureChatExists();
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
        await ensureChatExists();
      } else {
        console.warn("⚠️ Token inválido ou expirado. Fazendo logout...");
        logout();
      }
    } catch (err) {
      console.error("Erro ao validar token:", err);
      logout();
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

    // título
    const span = document.createElement("span");
    span.textContent = c.title;
    span.style.cursor = "pointer";
    span.onclick = () => {
      currentChatId = c._id;
      console.log("📌 Chat selecionado:", currentChatId);
      loadHistory(currentChatId);
    };

    // botão deletar
    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";
    delBtn.onclick = async (e) => {
      e.stopPropagation();
      if (confirm("Excluir este chat?")) {
        await fetch(`${API_URL}/chatdb/${c._id}`, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
        });
        loadChats();

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
    div.innerHTML = marked.parse(msg.content);
    messagesDiv.appendChild(div);
  });

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ================= SALVAR MENSAGEM =================
async function saveMessage(role, content) {
  if (!currentChatId) {
    console.error("❌ Nenhum chat selecionado.");
    return;
  }

  console.log("💾 Salvando mensagem em chat:", currentChatId);

  const res = await fetch(`${API_URL}/chatdb/${currentChatId}/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ role, content })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("❌ Erro ao salvar mensagem:", res.status, errText);
  }
}

// ================= CHAT MENSAGENS =================
async function sendMessage() {
  if (botOcupado || !currentChatId) return;
  botOcupado = true;

  const input = document.getElementById("userInput");
  const messagesDiv = document.getElementById("messages");
  const token = localStorage.getItem("token");

  const userMessage = input.value.trim();
  if (!userMessage) {
    botOcupado = false;
    return;
  }

  // mostra msg user
  const userDiv = document.createElement("div");
  userDiv.className = "message user";
  userDiv.textContent = userMessage;
  messagesDiv.appendChild(userDiv);

  await saveMessage("user", userMessage);
  input.value = "";

  // placeholder bot
  const botDiv = document.createElement("div");
  botDiv.className = "message bot bot_ativo";
  botDiv.textContent = "⏳ Pensando...";
  messagesDiv.appendChild(botDiv);

  try {
    controller = new AbortController();

    const response = await fetch(`${API_URL}/chat/${currentChatId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ message: userMessage }),
      signal: controller.signal,
    });

    const data = await response.json();

    let i = 0;
    intervaloId = setInterval(async () => {
      botDiv.innerHTML = marked.parse(data.reply.slice(0, i));
      if (i >= data.reply.length) {
        clearInterval(intervaloId);
        botOcupado = false;
        await saveMessage("bot", data.reply);
      }
      i++;
    }, 15);

  } catch (err) {
    botDiv.textContent = "⚠️ Erro na IA.";
    console.error("Erro na IA:", err);
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

window.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
});

// ================= SIDEBAR =================
document.addEventListener("DOMContentLoaded", () => {
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
      sidebar.classList.toggle("active");
      main.classList.toggle("blurred", sidebar.classList.contains("active"));
    });
  }
});

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
    document.getElementById("chat-container").style.display = "";

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
       <svg fill="#000000" width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.71,12.71a6,6,0,1,0-7.42,0,10,10,0,0,0-6.22,8.18,1,1,0,0,0,2,.22,8,8,0,0,1,15.9,0,1,1,0,0,0,1,.89h.11a1,1,0,0,0,.88-1.1A10,10,0,0,0,15.71,12.71ZM12,12a4,4,0,1,1,4-4A4,4,0,0,1,12,12Z"/></svg>
        ${marked.parse(msg.content)}
      `;
    } else {
      div.innerHTML = `
        <div class="bot-icon">
        <svg viewBox="0 0 300.000000 300.000000" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
       <g transform="translate(0.000000,300.000000) scale(0.100000,-0.100000)"
fill="#000000" stroke="none">
<path d="M0 1500 l0 -1500 743 1 c408 1 733 4 722 6 -11 3 -285 158 -610 345
-395 228 -602 353 -627 379 l-38 38 0 735 0 736 28 29 c15 16 194 125 397 242
204 117 471 271 594 342 123 71 236 133 250 137 14 5 -308 9 -716 9 l-743 1 0
-1500z"/>
<path d="M1540 2991 c14 -5 261 -144 550 -311 289 -167 560 -323 603 -348 122
-68 118 -54 115 -387 l-3 -280 -109 -62 c-85 -49 -113 -60 -127 -53 -16 9 -18
32 -21 268 l-3 259 -26 34 c-19 24 -101 76 -270 173 -134 77 -348 200 -475
273 -198 113 -238 133 -274 133 -46 0 -20 14 -715 -388 -223 -129 -295 -175
-312 -201 l-23 -35 2 -570 c3 -664 -8 -601 125 -678 43 -24 258 -149 479 -276
358 -208 405 -232 445 -232 38 0 74 17 274 133 127 73 341 198 478 276 169 98
254 153 270 175 21 29 22 43 25 218 l4 188 101 60 c65 38 111 59 127 58 l25
-3 3 -300 c1 -165 0 -314 -3 -331 -7 -41 -43 -77 -125 -123 -36 -21 -303 -175
-595 -343 -291 -168 -539 -308 -550 -311 -11 -2 314 -5 723 -6 l742 -1 0 1500
0 1500 -742 -1 c-409 0 -732 -4 -718 -8z m155 -607 c171 -98 179 -105 171
-131 -7 -21 -195 -133 -225 -133 -11 0 -42 12 -68 26 -66 35 -99 29 -224 -42
-124 -70 -153 -93 -144 -116 11 -27 233 -150 282 -156 50 -5 64 1 376 182 119
69 224 126 233 126 22 0 213 -108 241 -136 l23 -23 0 -480 0 -480 -22 -24
c-13 -14 -90 -63 -173 -110 -82 -46 -253 -144 -380 -217 -184 -107 -239 -134
-277 -138 -46 -4 -55 0 -425 213 -208 120 -393 228 -410 242 l-33 24 0 359 c0
340 1 360 19 369 14 8 40 -2 127 -52 l109 -62 5 -232 c3 -135 9 -236 15 -242
6 -5 129 -78 275 -163 235 -136 270 -153 310 -153 40 0 76 18 320 160 l275
160 3 343 c1 188 -1 342 -4 342 -3 0 -128 -71 -278 -157 -240 -138 -276 -157
-316 -157 -40 0 -82 21 -407 210 -393 226 -404 235 -372 293 10 18 123 89 374
234 324 187 364 207 405 207 39 0 67 -12 195 -86z"/>
</g>
        </svg></div>
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
  userDiv.className = "message user";
  userDiv.innerHTML = `<svg viewBox="0 0 30 30"><path d="..."/></svg> ${userMessage}`;
  messagesDiv.appendChild(userDiv);

  // salva no banco
  await fetch(`${API_URL}/chatdb/${currentChatId}/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token"),
    },
    body: JSON.stringify({ role: "user", content: userMessage }),
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
      signal: controller.signal,
    });

    const data = await response.json();

    // botão de interromper (caso exista no HTML)
    const interruptBtn = document.getElementById("interrupt-btn");
    if (interruptBtn) interruptBtn.style.display = "inline-block";

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

        if (typeof hljs !== "undefined") hljs.highlightAll();

        // salva resposta
        await fetch(`${API_URL}/chatdb/${currentChatId}/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify({ role: "bot", content: data.reply }),
        });

        if (interruptBtn) interruptBtn.style.display = "none"; // esconde ao terminar
      }
      i++;
    }, 15);
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn("⏹ Resposta interrompida pelo usuário.");
      botDiv.textContent = "⏹ Resposta interrompida.";
    } else {
      console.error("Erro na IA:", err);
      botDiv.textContent = "Erro na IA.";
    }
    botOcupado = false;
  }
}

function interromperResposta() {
  clearInterval(intervaloId); // para a digitação
  if (controller) controller.abort(); // aborta o fetch
  botOcupado = false;
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

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".sidebar");
  const toggleBtn = document.getElementById("toggleSidebar");
  const fecharSideBar = document.getElementById("fecharSideBar");
  const main = document.querySelector(".principal");

  if (toggleBtn && sidebar && main) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("active");

      if (sidebar.classList.contains("active")) {
        main.classList.add("blurred");   // aplica blur
      } else {
        main.classList.remove("blurred"); // remove blur
      }
    });
  }

  if (fecharSideBar && sidebar && main) {
    fecharSideBar.addEventListener("click", () => {
      sidebar.classList.toggle("active");

      if (sidebar.classList.contains("active")) {
        main.classList.remove("blurred");   // aplica blur
      } else {
        main.classList.add("blurred"); // remove blur
      }
    });
  }
});








let botOcupado = false;
let intervaloId;
let controller; // 👈 controlador global do fetch

// ================= CONFIG =================
const API_URL = "https://blacktechof-github-io.onrender.com"; // 🔥 troque pela URL do Render se for deploy
// ==========================================

// =============== AUTENTICAÇÃO ===============
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

    // esconde login, mostra chat
    document.getElementById("auth-container").style.display = "none";
    document.getElementById("chat-container").style.display = "block";

    // carrega histórico
    loadHistory();
  } else {
    alert(data.error);
  }
}

// carregar histórico
async function loadHistory() {
  const res = await fetch(`${API_URL}/chatdb/history`, {
    headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
  });

  const history = await res.json();
  const messagesDiv = document.getElementById("messages");
  messagesDiv.innerHTML = "";

  history.forEach(msg => {
    const div = document.createElement("div");
    div.className = `message ${msg.role}`;

    if (msg.role === "user") {
      div.innerHTML = `
        <svg viewBox="0 0 30 30" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
          <path d="M16 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm0-12c-2.757 0-5 2.243-5 5s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zM27 32a1 1 0 0 1-1-1v-6.115a6.95 6.95 0 0 0-6.942-6.943h-6.116A6.95 6.95 0 0 0 6 24.885V31a1 1 0 1 1-2 0v-6.115c0-4.93 4.012-8.943 8.942-8.943h6.116c4.93 0 8.942 4.012 8.942 8.943V31a1 1 0 0 1-1 1z"></path>
        </svg>
        <hr id='divisoria'>
        ${msg.content}
      `;
    } else {
      div.innerHTML = `
        <div class="bot-icon">
          <svg viewBox="0 0 300.000000 300.000000" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
            <g transform="translate(0.000000,300.000000) scale(0.100000,-0.100000)"
              fill="#000000" stroke="none">
              <path d="M0 1500 l0 -1500 743 1 ..."/>
            </g>
          </svg>
        </div>
        <div class="bot-content">${msg.content}</div>
      `;
    }

    messagesDiv.appendChild(div);
  });

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// =============== CHAT ===============
async function sendMessage() {
  if (botOcupado) return;
  botOcupado = true;

  const input = document.getElementById("userInput");
  const messagesDiv = document.getElementById("messages");
  const userMessage = input.value.trim();

  if (!userMessage) {
    botOcupado = false;
    return;
  }

  // Mensagem do usuário
  const userDiv = document.createElement("div");
  userDiv.className = 'message user';
  userDiv.innerHTML = `
    <svg viewBox="0 0 30 30" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
      <path d="M16 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm0-12c-2.757 0-5 2.243-5 5s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zM27 32a1 1 0 0 1-1-1v-6.115a6.95 6.95 0 0 0-6.942-6.943h-6.116A6.95 6.95 0 0 0 6 24.885V31a1 1 0 1 1-2 0v-6.115c0-4.93 4.012-8.943 8.942-8.943h6.116c4.93 0 8.942 4.012 8.942 8.943V31a1 1 0 0 1-1 1z"></path>
    </svg>
    <hr id='divisoria'>
    ${userMessage}
  `;
  messagesDiv.appendChild(userDiv);

  // salvar no banco
  await fetch(`${API_URL}/chatdb/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ role: "user", content: userMessage })
  });

  input.value = "";
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Placeholder do bot
  const botDiv = document.createElement("div");
  botDiv.className = "message bot bot_ativo";
  botDiv.innerHTML = `<span>Pensando</span> <span>Na</span> <span>Resposta</span>`;
  messagesDiv.appendChild(botDiv);

  const interruptBtn = document.getElementById("interrupt-btn");
  const enviarBtn = document.getElementById("enviar");
  enviarBtn.style.display = 'none';
  interruptBtn.style.display = "inline-block";

  interruptBtn.replaceWith(interruptBtn.cloneNode(true));
  const newInterruptBtn = document.getElementById("interrupt-btn");
  newInterruptBtn.addEventListener("click", () => {
    interromperResposta(intervaloId, botDiv, newInterruptBtn);
  });

  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  try {
    controller = new AbortController();

    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
      signal: controller.signal
    });

    const data = await response.json();

    async function typeMessage(element, message) {
      element.classList.remove("bot_ativo");
      element.innerHTML = `
        <div class="bot-icon">
          <svg viewBox="0 0 300.000000 300.000000" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
            <g transform="translate(0.000000,300.000000) scale(0.100000,-0.100000)"
              fill="#000000" stroke="none">
              <path d="M0 1500 l0 -1500 743 1 ..."/>
            </g>
          </svg>
        </div>
        <div class="bot-content">TechIA</div>
      `;

      let i = 0;
      intervaloId = setInterval(async () => {
        const slicedMessage = message.slice(0, i);
        element.querySelector(".bot-content").innerHTML =
          "TechIA " + marked.parse(slicedMessage);

        if (i >= message.length) {
          clearInterval(intervaloId);
          if (typeof hljs !== "undefined") hljs.highlightAll();
          botOcupado = false;
          newInterruptBtn.style.display = "none";
          enviarBtn.style.display = '';

          // salvar resposta do bot
          await fetch(`${API_URL}/chatdb/save`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify({ role: "bot", content: message })
          });
        }
        i++;
      }, 10);
    }

    typeMessage(botDiv, data.reply);
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("⚡ Fetch interrompido pelo usuário.");
    } else {
      botDiv.textContent = "Erro ao se comunicar com o servidor.";
      console.error(error);
    }
    botOcupado = false;
    interruptBtn.style.display = "none";
    enviarBtn.style.display = '';
  }
}

// 🚨 Função para parar tudo
function interromperResposta(intervaloId, botDiv, interruptBtn) {
  clearInterval(intervaloId);

  if (controller) {
    controller.abort();
  }

  botDiv.innerHTML = "Resposta interrompida.";
  interruptBtn.style.display = "none";
  botOcupado = false;
}

// listeners
document.getElementById("userInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

document.getElementById("inputs").addEventListener("click", function(e) {
  e.preventDefault();
  sendMessage();
});

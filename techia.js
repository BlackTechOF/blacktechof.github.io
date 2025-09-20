/* techia.js - versão final com SerpAPI + Gemini e respostas longas */

let botOcupado = false;
let intervaloId = null;
let controller = null;
let currentChatId = null;
let lastBotDiv = null;
const h2DoChat = document.getElementById('h2DoChat');
const authButtons = document.querySelector('.auth-buttons')
const loginButton = document.getElementById('loginBtn')
const cadastroButton = document.getElementById('cadastroBtn')
const API_URL = "https://blacktechof-github-io.onrender.com"; // <-- backend

/* ---------- Helpers ---------- */
async function safeParseResponse(res) {
    const ct = res.headers.get("content-type") || "";
    const text = await res.text();
    if (ct.includes("application/json")) {
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }
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

/* ---------- Auth ---------- */
async function register() {
    const username = document.getElementById("username")?.value;
    const password = document.getElementById("password")?.value;
    if (!username || !password) return alert("Preencha usuário e senha.");

    loginButton.style.display = 'none'
    cadastroButton.style.display = 'none'
    const criarH3Cadastro = document.createElement('h3')
    criarH3Cadastro.textContent = 'Cadastrando Usuário...'
    authButtons.appendChild(criarH3Cadastro)

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        loginButton.style.display = ''
    cadastroButton.style.display = ''
    criarH3Cadastro.style.display = 'none'
        const data = await safeParseResponse(res);
        if (!res.ok) return alert(data.error || "Erro ao registrar");
        alert(data.message || "Registrado com sucesso (Faça Login Para Proseguir)");
    } catch (err) {
        console.error("Erro no register:", err);
        alert("Erro ao registrar.");
    }
}

async function login() {
    const username = document.getElementById("username")?.value;
    const password = document.getElementById("password")?.value;
    if (!username || !password) return alert("Preencha usuário e senha.");

    loginButton.style.display = 'none'
    cadastroButton.style.display = 'none'
    const criarH3Login = document.createElement('h3');
    criarH3Login.textContent = 'Entrando...';
    authButtons.appendChild(criarH3Login);

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        loginButton.style.display = ''
        cadastroButton.style.display = ''
        criarH3Login.style.display = 'none'
        const data = await safeParseResponse(res);
        if (!res.ok) return alert(data.error || "Erro ao logar");

        if (data.token) {
            localStorage.setItem("token", data.token);
            document.getElementById("auth-container").style.display = "none";
            document.getElementById("chat-container").style.display = "block";
            await loadChats();
            await ensureChatExists();
        }
    } catch (err) {
        console.error("Erro no login:", err);
        alert("Erro ao conectar no servidor.");
    }
}

/* ---------- Logout ---------- */
function logout() {
    localStorage.removeItem("token");
    currentChatId = null;
    document.getElementById("chat-container").style.display = "none";
    document.getElementById("auth-container").style.display = "";
}

/* ---------- Auto-login ---------- */
window.addEventListener("DOMContentLoaded", async () => {
    const input = document.getElementById("userInput");
    if (input) input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    const sendBtn = document.getElementById("inputs");
    if (sendBtn) sendBtn.addEventListener("click", (e) => {
        e.preventDefault();
        sendMessage();
    });

    const interruptBtn = document.getElementById("interrupt-btn");
    if (interruptBtn) interruptBtn.addEventListener("click", interromperResposta);

    const newChatBtn = document.getElementById("new-chat-btn");
    if (newChatBtn) newChatBtn.addEventListener("click", newChat);

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);

    const sidebar = document.querySelector(".sidebar");
    const toggleBtn = document.getElementById("toggleSidebar");
    const fecharSideBar = document.getElementById("fecharSideBar");
    const main = document.querySelector(".principal");
    if (toggleBtn) toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("active");
        main.classList.toggle("blurred", sidebar.classList.contains("active"));
    });
    if (fecharSideBar) fecharSideBar.addEventListener("click", () => {
        sidebar.classList.remove("active");
        main.classList.remove("blurred");
    });

    const token = localStorage.getItem("token");
    if (token) {
        try {
            const res = await fetch(`${API_URL}/chatdb/list`, {
                headers: {
                    "Authorization": "Bearer " + token
                }
            });
            if (res.ok) {
                document.getElementById("auth-container").style.display = "none";
                document.getElementById("chat-container").style.display = "block";
                await loadChats();
                await ensureChatExists();
            } else {
                localStorage.removeItem("token");
            }
        } catch {
            localStorage.removeItem("token");
        }
    }
});

/* ---------- CHATS ---------- */
async function ensureChatExists() {
    const res = await fetch(`${API_URL}/chatdb/list`, {
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        }
    });
    const chats = await safeParseResponse(res);
    if (!Array.isArray(chats) || chats.length === 0) {
        const newC = await fetch(`${API_URL}/chatdb/new`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify({
                title: "Novo Chat"
            })
        });
        const chat = await safeParseResponse(newC);
        currentChatId = chat._id;
        await loadChats();
    } else {
        currentChatId = chats[0]._id;
        await loadHistory(currentChatId);
    }
}

async function newChat() {
    const res = await fetch(`${API_URL}/chatdb/new`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
            title: "Novo Chat"
        })
    });
    const chat = await safeParseResponse(res);
    currentChatId = chat._id;
    await loadChats();
    await loadHistory(currentChatId);
    h2DoChat.style.display = ''
}

async function loadChats() {
    const res = await fetch(`${API_URL}/chatdb/list`, {
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        }
    });
    const chats = await safeParseResponse(res);
    const chatList = document.getElementById("chat-list");
    chatList.innerHTML = "";
    (chats || []).forEach(c => {
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.textContent = c.title;
        span.style.cursor = "pointer";
        span.onclick = () => {
            currentChatId = c._id;
            loadHistory(currentChatId);
        };
        const delBtn = document.createElement("button");
        delBtn.innerHTML = `<svg width="30px" height="30px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6 7V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V7M6 7H5M6 7H8M18 7H19M18 7H16M10 11V16M14 11V16M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7M8 7H16" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>;`
        delBtn.onclick = async (e) => {
            e.stopPropagation();
            if (!confirm("Excluir este chat?")) return;
            await fetch(`${API_URL}/chatdb/${c._id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": "Bearer " + localStorage.getItem("token")
                }
            });
            if (currentChatId === c._id) {
                currentChatId = null;
                document.getElementById("messages").innerHTML = "";
            }
            await loadChats();
        };
        li.appendChild(span);
        li.appendChild(delBtn);
        chatList.appendChild(li);
    });
}

async function deleteAllChats() {
    try {
        const res = await fetch(`${API_URL}/chatdb/all`, { // <-- Rota alterada
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + localStorage.getItem("token")
            }
        });

        if (res.ok) {
            console.log("Todos os chats deletados com sucesso!");
            await loadChats(); // Recarrega a lista de chats após a deleção.
        } else {
            console.error("Erro ao deletar chats:", res.statusText);
            alert("Erro ao deletar chats.");
        }
    } catch (error) {
        console.error("Erro ao deletar chats:", error);
        alert("Erro ao deletar chats.");
    }
}

async function loadHistory(chatId) {
    const res = await fetch(`${API_URL}/chatdb/${chatId}`, {
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        }
    });
    const history = await safeParseResponse(res);
    const messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML = "";

     if (history && history.length > 0) {
        h2DoChat.style.display = "none";  // já tem mensagens → esconde
    } else {
        h2DoChat.style.display = "";      // vazio → mostra
    }

    (history || []).forEach(msg => {
        const div = document.createElement("div");
        div.className = `message ${msg.role}`;
        div.innerHTML = (typeof marked !== "undefined") ? marked.parse(msg.content) : msg.content;
        messagesDiv.appendChild(div);
    });
    if (typeof hljs !== "undefined") hljs.highlightAll();
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/* ---------- SALVAR MENSAGEM ---------- */
async function saveMessage(role, content) {
    if (!currentChatId) return false;
    const res = await fetch(`${API_URL}/chatdb/${currentChatId}/save`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
            role,
            content
        })
    });
    return res.ok;
}

/* ---------- ENVIAR MENSAGEM ---------- */
async function sendMessage() {
    if (botOcupado || !currentChatId) return;
    h2DoChat.style.display = 'none';

    const input = document.getElementById("userInput");
    const messagesDiv = document.getElementById("messages");
    const token = localStorage.getItem("token");
    const userMessage = input.value.trim();
    if (!userMessage) return;
    input.value = "";

    botOcupado = true;
    controller = new AbortController();

     const userDiv = document.createElement("div");
userDiv.className = "message user";
userDiv.innerHTML = (typeof marked !== "undefined") ? marked.parse(userMessage) : userMessage;
messagesDiv.appendChild(userDiv);

    // Mostra placeholder "pensando..."
    const botDiv = document.createElement("div");
    botDiv.className = "message bot bot_ativo";
    botDiv.textContent = "⏳ Pensando...";
    messagesDiv.appendChild(botDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
        const res = await fetch(`${API_URL}/chat/${currentChatId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ message: userMessage })
        });

        const data = await safeParseResponse(res);
        if (!res.ok) {
            botDiv.textContent = "⚠️ Erro do servidor.";
            botOcupado = false;
            return;
        }

        // recarrega todo o histórico (já com user + bot)
        await loadChats();
        await loadHistory(currentChatId);

        botOcupado = false;

    } catch (err) {
        botDiv.textContent = "⚠️ Erro na IA.";
        botOcupado = false;
    }
}


    

/* ---------- Interromper resposta ---------- */
function interromperResposta() {
    if (intervaloId) clearInterval(intervaloId);
    if (controller) controller.abort();
    botOcupado = false;
    if (lastBotDiv) lastBotDiv.textContent = "⏹ Resposta interrompida.";
}

/* ---------- Expor funções ---------- */
window.techia = {
    sendMessage,
    newChat,
    loadChats,
    loadHistory,
    logout,
    register,
    login,
    interromperResposta,
};  


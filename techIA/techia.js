/* techia.js - versão completa corrigida com Markdown e digitação segura */

let botOcupado = false;
let intervaloId = null;
let currentAbortController = null;
let currentChatId = null;
let lastBotDiv = null;

const loadScreen = document.querySelector('.loadingScreen');
const conteudo = document.querySelector('.conteudo');
const main = document.querySelector('main');
const authContainer = document.getElementById("auth-container");
const input = document.getElementById("userInput");

function telaCarregamento() {
    loadScreen.style.display = '';
    main.style.filter = 'blur(4px)';
    authContainer.style.filter = 'blur(3.8px)';
}

function esconderCarregamento() {
    loadScreen.style.display = 'none';
    main.style.filter = 'none';
    authContainer.style.filter = 'none';
}

const h2DoChat = document.getElementById('h2DoChat');
const authButtons = document.querySelector('.auth-buttons');
const loginButton = document.getElementById('loginBtn');
const btnParar = document.getElementById('parar');
const sendBtn = document.getElementById("inputs");
const cadastroFun = document.getElementById('cadastroFun');
const loginFun = document.getElementById('loginFun');
const cadastroButton = document.getElementById('cadastroBtn');
const tituloPagLogin = document.getElementById('tituloPagLogin');
const API_URL = "https://blacktechof-github-io.onrender.com";

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

function cadastroPage() {
    tituloPagLogin.textContent = 'Cadastrar em TechIA';
    cadastroFun.style.display = 'none';
    loginFun.style.display = '';
    cadastroButton.style.display = '';
    loginButton.style.display = 'none';
}

function loginPage() {
    tituloPagLogin.textContent = 'Fazer Login em TechIA';
    cadastroFun.style.display = '';
    loginFun.style.display = 'none';
    cadastroButton.style.display = 'none';
    loginButton.style.display = '';
}

/* ---------- Auth ---------- */
async function register() {
    const username = document.getElementById("username")?.value;
    const password = document.getElementById("password")?.value;
    if (!username || !password) return alert("Preencha usuário e senha.");

    loginButton.style.display = 'none';
    cadastroButton.style.display = 'none';
    loginFun.style.display = 'none';
    const criarH3Cadastro = document.createElement('h3');
    criarH3Cadastro.textContent = 'Cadastrando Usuário...';
    authButtons.appendChild(criarH3Cadastro);

    telaCarregamento();

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        esconderCarregamento();
        loginButton.style.display = '';
        loginFun.style.display = '';
        cadastroButton.style.display = '';
        criarH3Cadastro.style.display = 'none';

        const data = await safeParseResponse(res);
        if (!res.ok) {
            cadastroPage();
            esconderCarregamento();
            return alert(data.error || "Erro ao registrar");
        }
        alert(data.message || "Registrado com sucesso (Faça Login Para Proseguir)");
    } catch (err) {
        cadastroPage();
        console.error("Erro no register:", err);
        alert("Erro ao registrar.");
    }
}

async function login() {
    const username = document.getElementById("username")?.value;
    const password = document.getElementById("password")?.value;
    if (!username || !password) return alert("Preencha usuário e senha.");

    loginButton.style.display = 'none';
    cadastroButton.style.display = 'none';
    cadastroFun.style.display = 'none';
    const criarH3Login = document.createElement('h3');
    criarH3Login.textContent = 'Entrando...';
    authButtons.appendChild(criarH3Login);

    telaCarregamento();

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        esconderCarregamento();
        loginButton.style.display = '';
        cadastroFun.style.display = '';
        cadastroButton.style.display = '';
        criarH3Login.style.display = 'none';

        const data = await safeParseResponse(res);
        if (!res.ok) {
            cadastroPage();
            esconderCarregamento();
            return alert(data.error || "Erro ao logar");
        }

        if (data.token) {
            localStorage.setItem("token", data.token);
            document.getElementById("auth-container").style.display = "none";
            document.getElementById("chat-container").style.display = "block";
            await loadChats();
            await ensureChatExists();
        }
    } catch (err) {
        cadastroPage();
        esconderCarregamento();
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
    loginPage();
}

/* ---------- Auto-login & Event listeners ---------- */
window.addEventListener("DOMContentLoaded", async () => {
    const input = document.getElementById("userInput");
    if (input) input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

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
    const chatContainer = document.getElementById("chat-container");
    if (toggleBtn) toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");

    if (sidebar.classList.contains("active")) {
        main.style.filter = "blur(4px)";
    } else {
        main.style.filter = "none";
    }
});
    if (fecharSideBar) fecharSideBar.addEventListener("click", () => {
        sidebar.classList.remove("active");
        main.classList.remove("blurred");
        main.style.filter = 'none'
    });

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
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
    const chats = await safeParseResponse(res);
    if (!Array.isArray(chats) || chats.length === 0) {
        const newC = await fetch(`${API_URL}/chatdb/new`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify({ title: "Novo Chat" })
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
    if (botOcupado === true) {
       interromperResposta()
    }
    const res = await fetch(`${API_URL}/chatdb/new`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({ title: "Novo Chat" })
    });
    const chat = await safeParseResponse(res);
    currentChatId = chat._id;
    await loadChats();
    await loadHistory(currentChatId);
    h2DoChat.style.display = '';
}

async function loadChats() {
    const res = await fetch(`${API_URL}/chatdb/list`, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
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
</svg>`;
        delBtn.onclick = async (e) => {
            e.stopPropagation();
            if (!confirm("Excluir este chat?")) return;
            await fetch(`${API_URL}/chatdb/${c._id}`, {
                method: "DELETE",
                headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
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

async function loadHistory(chatId) {
    const res = await fetch(`${API_URL}/chatdb/${chatId}`, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
    const history = await safeParseResponse(res);
    const messagesDiv = document.getElementById("messages");
    messagesDiv.innerHTML = "";

    if (history && history.length > 0) h2DoChat.style.display = 'none';
    else h2DoChat.style.display = '';

    (history || []).forEach(msg => {
        const div = document.createElement("div");
        div.className = `message ${msg.role}`;

        // ESCAPA HTML antes de passar pro marked
        const escapedContent = msg.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        div.innerHTML = marked.parse(escapedContent);
        messagesDiv.appendChild(div);
    });

    if (typeof hljs !== "undefined") hljs.highlightAll();
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    fontPrefs()
    messageStylesPrefs()
}

/* ---------- SALVAR MENSAGEM ---------- */
async function saveMessage(role, content) {
    if (!currentChatId) return false;
    try {
        const res = await fetch(`${API_URL}/chatdb/${currentChatId}/save`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify({ role, content })
        });
        return res.ok;
    } catch (err) {
        console.warn("Erro ao salvar mensagem:", err);
        return false;
    }
}

/* ---------- ENVIAR MENSAGEM ---------- */
async function sendMessage() {
    if (botOcupado || !currentChatId) return;
    h2DoChat.style.display = 'none'
    const input = document.getElementById("userInput");
    const messagesDiv = document.getElementById("messages");
    const token = localStorage.getItem("token");
    const userMessage = input?.value.trim();
    if (!userMessage) return;

    input.value = "";
    botOcupado = true;

    const userDiv = document.createElement("div");
    userDiv.className = "message user";
    userDiv.textContent = userMessage;
    messagesDiv.appendChild(userDiv);
    fontPrefs()
    messageStylesPrefs()
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    const botDiv = document.createElement("div");
    botDiv.className = "message bot bot_ativo";
    botDiv.textContent = 'Pensando...';
    messagesDiv.appendChild(botDiv);
    fontPrefs()
    messageStylesPrefs()
    lastBotDiv = botDiv;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    if (currentAbortController) try { currentAbortController.abort(); } catch (e) {}
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    if (sendBtn) sendBtn.style.display = 'none';
    if (btnParar) btnParar.style.display = '';

    try {
        const res = await fetch(`${API_URL}/chat/${currentChatId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ message: userMessage }),
            signal
        });

        const data = await safeParseResponse(res);
        if (!res.ok) throw new Error((data && data.error) || "Erro na resposta do servidor");

        const resposta = data.reply || data.content || data.answer || data.message || "⚠️ Sem resposta";
        await saveMessage("user", userMessage);
        await saveMessage("bot", resposta);

        // animação de digitação com Markdown
        botDiv.innerHTML = '';
        let i = 0;
        const chunk = 1;
        const speedMs = 12;
        intervaloId = setInterval(() => {
            if (i < resposta.length) {
                botDiv.innerHTML = marked.parse(resposta.slice(0, i + chunk));
                i += chunk;
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            } else {
                clearInterval(intervaloId);
                intervaloId = null;
                botOcupado = false;
                if (btnParar) btnParar.style.display = 'none';
                if (sendBtn) sendBtn.style.display = '';
            }
        }, speedMs);

    } catch (err) {
        if (err.name === 'AbortError') lastBotDiv.textContent = "Resposta interrompida.";
        else lastBotDiv.textContent = "⚠️ Erro na IA.";
        if (intervaloId) { clearInterval(intervaloId); intervaloId = null; }
        botOcupado = false;
        if (btnParar) btnParar.style.display = 'none';
        if (sendBtn) sendBtn.style.display = '';
    } finally {
        currentAbortController = null;
    }
}

/* ---------- Interromper resposta ---------- */
function interromperResposta() {
    if (intervaloId) { clearInterval(intervaloId); intervaloId = null; }
    if (currentAbortController) {
        try { currentAbortController.abort(); } catch (e) {}
        currentAbortController = null;
    }
    if (lastBotDiv) lastBotDiv.textContent = "Resposta interrompida.";
    botOcupado = false;
    if (btnParar) btnParar.style.display = 'none';
    if (sendBtn) sendBtn.style.display = '';
}

/* ---------- Deletar todos os chats ---------- */
async function deleteAllChats() {
    if (!confirm("Excluir todos os chats?")) return;
    try {
        const res = await fetch(`${API_URL}/chatdb/all`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
        });
        if (res.ok) {
            console.log("Todos os chats deletados com sucesso!");
            document.getElementById("messages").innerHTML = "";
            await loadChats();
        } else {
            console.error("Erro ao deletar chats:", res.statusText);
            alert("Erro ao deletar chats.");
        }
    } catch (error) {
        console.error("Erro ao deletar chats:", error);
        alert("Erro ao deletar chats.");
    }
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
    deleteAllChats
};



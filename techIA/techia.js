const API_URL = 'http://localhost:3000';

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
const btnSettings = document.getElementById('settings')
const menu_list = document.querySelector('.menu-list')
const option_setting = document.getElementById('option-settings')
const feedbackCustom = document.getElementById('feedbackCustom')

function borrarTela() {
    main.style.filter = 'blur(4px)';
    authContainer.style.filter = 'blur(3.8px)';
}

function desborrarTela() {
    main.style.filter = 'none';
    authContainer.style.filter = 'none';
}

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

async function verifyAdmin() {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:3000/user/get-data-user`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
    });

    const data = await res.json()

    if (!res.ok) {
        return alert('erro ao coletar dados do usuario');
    }

    if (data.role !== 'admin') {
        return false;
    } else {
        return true;
    }
};

async function verifyText() {
    const texto = input.value;
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:3000/status/get-warn`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ texto: texto }),
    });

    const data = await res.json()

    if (data.permitido) {
        return true;
    } else {
        return false;
    }
};

async function verifyBan() {
    const token = localStorage.getItem('token')
    const res = await fetch(`http://localhost:3000/status/verify-ban`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
    });

    const data = await res.json();

    if (data.banido) {
        return true;
    } else {
        return false;
    }
}

async function gerarNovoToken() {
    const token = localStorage.getItem('token')
    const getEmail = localStorage.getItem('userEmail')
    const res = await fetch(`http://localhost:3000/auth/novo-token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: getEmail })
    });

    const data = await res.json()

    if (res.ok) {

        alert('Novo token gerado')
        localStorage.setItem('token', data.token)

        const res = await fetch(`http://localhost:3000/auth/invalidar-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const dataInvalidTokens = await res.json()

        if (res.ok) {
            alert(dataInvalidTokens.message);

            localStorage.removeItem('token');
            window.location.reload();
        } else {
            alert(dataInvalidTokens.error || 'Erro ao desconectar dispositivos')
        }
    } else {
        alert('usuario nao autorizado')
    }
}

btnSettings.addEventListener('click', function () {
    menu_list.classList.toggle('menu-list_visible')
})

option_setting.addEventListener('click', function () {
    window.location.href = 'settings.html'
})

const h2DoChat = document.getElementById('h2DoChat');
const authButtons = document.querySelector('.auth-buttons');
const loginButton = document.getElementById('loginBtn');
const btnParar = document.getElementById('parar');
const sendBtn = document.getElementById("inputs");
const cadastroFun = document.getElementById('cadastroFun');
const loginFun = document.getElementById('loginFun');
const cadastroButton = document.getElementById('cadastroBtn');
const inputUsername = document.getElementById("username");
const tituloPagLogin = document.getElementById('tituloPagLogin');

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

const btnShowPainel = document.getElementById('btnAdminPainel')

btnShowPainel.addEventListener('click', async function () {
    const permitido = await verifyAdmin()

    if (permitido) {
        window.location.href = 'adminPainel.html'
    } else {
        alert('sem acesso a adm')
    }
})

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
    inputUsername.style.display = '';
    loginFun.style.display = '';
    cadastroButton.style.display = '';
    loginButton.style.display = 'none';
}

function loginPage() {
    tituloPagLogin.textContent = 'Fazer Login em TechIA';
    cadastroFun.style.display = '';
    inputUsername.style.display = 'none';
    loginFun.style.display = 'none';
    cadastroButton.style.display = 'none';
    loginButton.style.display = '';
}

async function register() {
    const username = document.getElementById("username")?.value;
    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;
    if (!username || !email || !password) return alert("Preencha os campos vazios.");

    loginButton.style.display = 'none';
    cadastroButton.style.display = 'none';
    loginFun.style.display = 'none';
    const criarH3Cadastro = document.createElement('h3');
    criarH3Cadastro.textContent = 'Cadastrando Usuário...';
    authButtons.appendChild(criarH3Cadastro);

    telaCarregamento();

    try {
        const res = await fetch(`${API_URL}/auth/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password })
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
    const email = document.getElementById("email")?.value;
    const password = document.getElementById("password")?.value;
    if (!email || !password) return alert("Preencha usuário e senha.");

    loginButton.style.display = 'none';
    cadastroButton.style.display = 'none';
    cadastroFun.style.display = 'none';
    const criarH3Login = document.createElement('h3');
    criarH3Login.textContent = 'Entrando...';
    authButtons.appendChild(criarH3Login);

    telaCarregamento();

    try {
        const res = await fetch(`${API_URL}/auth/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
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
            localStorage.setItem('userEmail', email);
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

function logout() {
    localStorage.removeItem("token");
    currentChatId = null;
    document.getElementById("chat-container").style.display = "none";
    document.getElementById("auth-container").style.display = "";
    loginPage();
}

window.addEventListener("DOMContentLoaded", async () => {

    const input = document.getElementById("userInput");
    if (input) input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    if (sendBtn) sendBtn.addEventListener("click", (e) => {
        e.preventDefault();
        sendMessage();
    });

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

        const token = localStorage.getItem('token')

    if (!token) return;

    const res = await fetch(`${API_URL}/auth/auto-login`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })

    const data = await res.json()

    if (!res.ok) {
    return alert(data.error);
    }

    console.log('Logado automaticamente');
     document.getElementById("auth-container").style.display = "none";
        document.getElementById("chat-container").style.display = "block";

        await ensureChatExists()
    
});

async function ensureChatExists() {
    const res = await fetch(`${API_URL}/chat/chatdb/list`, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    });
    const chats = await safeParseResponse(res);

    if (!Array.isArray(chats) || chats.length === 0) {
        const newC = await fetch(`${API_URL}/chat/chatdb/new`, {
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
        await loadHistory(currentChatId);
    } else {
        currentChatId = chats[0]._id;

        await loadChats();
        await loadHistory(currentChatId);
    }
}

async function newChat() {
    if (botOcupado === true) {
        interromperResposta()
    }
    const res = await fetch(`${API_URL}/chat/chatdb/new`, {
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
    const banido = await verifyBan()

    if (banido) {
        borrarTela()
        document.querySelector('main').style.display = 'none'
        feedbackCustom.style.display = ''
        feedbackCustom.innerHTML = `
      <h3 style='color: red;'>Voce foi banido!</h3>
      <p>Voce esta banido da plataforma, em breve sua conta sera deletada</p>
      <div class='btns' style='display: flex;'>
      <button id='yes'>Sair</button>
</div>
      `

      yes.onclick = () => {
         localStorage.removeItem('token')
        window.location.href = 'techia.html'
      }
        return;
    }

    const permitido = await verifyAdmin();

    if (permitido) {
        document.getElementById('btnAdminPainel').style.display = ''
    }

    getUserData();
    const res = await fetch(`${API_URL}/chat/chatdb/list`, {
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
            await fetch(`${API_URL}/chat/chatdb/${c._id}`, {
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
    const res = await fetch(`${API_URL}/chat/chatdb/${chatId}`, {
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

        const escapedContent = msg.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        div.innerHTML = marked.parse(escapedContent);
        messagesDiv.appendChild(div);
    });

    if (typeof hljs !== "undefined") hljs.highlightAll();
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    messageStylesPrefs();
    fontPrefs();
}

let abortada = false

async function saveMessage(role, content) {
    if (!currentChatId) return false;
    try {
        const res = await fetch(`${API_URL}/chat/chatdb/${currentChatId}/save`, {
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

async function sendMessage() {
    if (botOcupado) return;

    if (!currentChatId) {
       await newChat()
       return;
    }

    const banido = await verifyBan()

    if (banido) {
       borrarTela()
        document.querySelector('main').style.display = 'none'
        feedbackCustom.style.display = ''
        feedbackCustom.innerHTML = `
      <h3 style='color: red;'>Voce foi banido!</h3>
      <p>Voce esta banido da plataforma, em breve sua conta sera deletada</p>
      <div class='btns' style='display: flex;'>
      <button id='yes'>Sair</button>
</div>
      `

      yes.onclick = () => {
         localStorage.removeItem('token')
        window.location.href = 'techia.html'
      }
        return;
    }
    const permitido = await verifyText()
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

    if (currentAbortController) try { currentAbortController.abort(); } catch (e) { }
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    if (sendBtn) sendBtn.style.display = 'none';
    if (btnParar) btnParar.style.display = '';

    try {
        if (!permitido) {
            interromperResposta()
            botDiv.textContent = 'Mensagem Bloqueada'
            alert('(AVISO!), Verificamos o uso de uma ou mais palavras inapropriadas, porfavor evite o uso de palavras inapropriadas, e assim evite avisos como este')
            return;
        }

        setTimeout(async () => {
            if (abortada == true) {
                console.log('Requisição abortada')
                return;
            }
            const res = await fetch(`${API_URL}/chat/chat/${currentChatId}`, {
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

        }, 2000)
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

async function interromperResposta() {
    abortada = true;
    if (intervaloId) { clearInterval(intervaloId); intervaloId = null; }

    if (currentAbortController) {
        try { currentAbortController.abort(); } catch (e) { }
        currentAbortController = null;
    }

    if (lastBotDiv) {
        lastBotDiv.textContent = "Resposta interrompida.";
        if (currentChatId) {
            try {
                await fetch(`${API_URL}/chat/chat/${currentChatId}/last-two`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + localStorage.getItem("token")
                    }
                });
            } catch (e) {
                console.warn("Erro ao salvar resposta interrompida:", e);
            }
        }
    }

    botOcupado = false;
    if (btnParar) btnParar.style.display = 'none';
    if (sendBtn) sendBtn.style.display = '';
}


async function deleteAllChats() {
    if (!confirm("Excluir todos os chats?")) return;
    try {
        const res = await fetch(`${API_URL}/chat/chatdb/all`, {
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

window.addEventListener('visibilitychange', function () {
    if (window.hidden) {
        fontPrefs()
        messageStylesPrefs()
    } else {
        fontPrefs()
        messageStylesPrefs()
    }
});

const recognition = new SpeechRecognition();
recognition.lang = "pt-BR";
recognition.continuous = false;
recognition.interimResults = false;

window.addEventListener('keydown', function (e) {
    if (e.ctrlKey && (e.key === 'q' || e.key === 'Q')) {
        recognition.start();
        input.placeholder = "🎤 Ouvindo...";
    }
});

recognition.onresult = (event) => {
    const texto = event.results[0][0].transcript;
    input.value = texto;
    sendMessage();
    document.getElementById('voiceRecorder').innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
<path d="M12 14.2857C13.4229 14.2857 14.5714 13.1371 14.5714 11.7143V6.57143C14.5714 5.14857 13.4229 4 12 4C10.5771 4 9.42857 5.14857 9.42857 6.57143V11.7143C9.42857 13.1371 10.5771 14.2857 12 14.2857Z" fill="#000000"/>
<path d="M16.5429 11.7143H18C18 14.6371 15.6686 17.0543 12.8571 17.4743V20.2857H11.1429V17.4743C8.33143 17.0543 6 14.6371 6 11.7143H7.45714C7.45714 14.2857 9.63429 16.0857 12 16.0857C14.3657 16.0857 16.5429 14.2857 16.5429 11.7143Z" fill="#000000"/>
</svg>
      `
};

recognition.onend = () => {
    input.placeholder = 'Digite sua mensagem...'
    input.value = texto;
    document.getElementById('voiceRecorder').innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
<path d="M12 14.2857C13.4229 14.2857 14.5714 13.1371 14.5714 11.7143V6.57143C14.5714 5.14857 13.4229 4 12 4C10.5771 4 9.42857 5.14857 9.42857 6.57143V11.7143C9.42857 13.1371 10.5771 14.2857 12 14.2857Z" fill="#000000"/>
<path d="M16.5429 11.7143H18C18 14.6371 15.6686 17.0543 12.8571 17.4743V20.2857H11.1429V17.4743C8.33143 17.0543 6 14.6371 6 11.7143H7.45714C7.45714 14.2857 9.63429 16.0857 12 16.0857C14.3657 16.0857 16.5429 14.2857 16.5429 11.7143Z" fill="#000000"/>
</svg>
      `
};

document.getElementById('voiceRecorder').addEventListener('click', function () {
    recognition.start();
    input.placeholder = "🎤 Ouvindo...";
    document.getElementById('voiceRecorder').innerHTML = `
      <img src='../videos/recording.gif'>
      `
});

recognition.onresult = (event) => {
    const texto = event.results[0][0].transcript;
    input.value = texto;
    sendMessage();
    document.getElementById('voiceRecorder').innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
<path d="M12 14.2857C13.4229 14.2857 14.5714 13.1371 14.5714 11.7143V6.57143C14.5714 5.14857 13.4229 4 12 4C10.5771 4 9.42857 5.14857 9.42857 6.57143V11.7143C9.42857 13.1371 10.5771 14.2857 12 14.2857Z" fill="#000000"/>
<path d="M16.5429 11.7143H18C18 14.6371 15.6686 17.0543 12.8571 17.4743V20.2857H11.1429V17.4743C8.33143 17.0543 6 14.6371 6 11.7143H7.45714C7.45714 14.2857 9.63429 16.0857 12 16.0857C14.3657 16.0857 16.5429 14.2857 16.5429 11.7143Z" fill="#000000"/>
</svg>
      `
};

recognition.onend = () => {
    input.placeholder = 'Digite sua mensagem...'
    input.value = texto;
    document.getElementById('voiceRecorder').innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
<path d="M12 14.2857C13.4229 14.2857 14.5714 13.1371 14.5714 11.7143V6.57143C14.5714 5.14857 13.4229 4 12 4C10.5771 4 9.42857 5.14857 9.42857 6.57143V11.7143C9.42857 13.1371 10.5771 14.2857 12 14.2857Z" fill="#000000"/>
<path d="M16.5429 11.7143H18C18 14.6371 15.6686 17.0543 12.8571 17.4743V20.2857H11.1429V17.4743C8.33143 17.0543 6 14.6371 6 11.7143H7.45714C7.45714 14.2857 9.63429 16.0857 12 16.0857C14.3657 16.0857 16.5429 14.2857 16.5429 11.7143Z" fill="#000000"/>
</svg>
      `
};


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





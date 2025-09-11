let botOcupado = false;
let intervaloId; 

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
  userDiv.className = "message user";
  userDiv.textContent = userMessage;
  messagesDiv.appendChild(userDiv);

  input.value = "";
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // Mensagem do bot (placeholder "pensando")
  const botDiv = document.createElement("div");
  botDiv.className = "message bot bot_ativo";
  botDiv.innerHTML = `<span>Pensando</span> <span>Na</span> <span>Resposta</span>`;
  messagesDiv.appendChild(botDiv);

  const interruptBtn = document.getElementById("interrupt-btn");
  const enviarBtn = document.getElementById("enviar");
  enviarBtn.style.display = 'none';
  interruptBtn.style.display = "inline-block";

  // Limpar listeners antigos para evitar múltiplos acionamentos
  interruptBtn.replaceWith(interruptBtn.cloneNode(true));
  const newInterruptBtn = document.getElementById("interrupt-btn");
  newInterruptBtn.addEventListener("click", () => {
    interromperResposta(intervaloId, botDiv, newInterruptBtn);
  });

  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  try {
    const response = await fetch("https://blacktechof-github-io.onrender.com/chat", {  // Ajuste a URL conforme seu backend
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
    });

    const data = await response.json();

    function typeMessage(element, message) {
      element.classList.remove("bot_ativo");
      element.innerHTML = "";
      let i = 0;
      intervaloId = setInterval(() => {
        const slicedMessage = message.slice(0, i);

        // Aqui processa a mensagem com markdown
        element.innerHTML = marked.parse(slicedMessage);  // Usando marked para interpretar o Markdown

        // Adiciona highlight de sintaxe se necessário
        if (i >= message.length) {
          clearInterval(intervaloId);
          if (typeof hljs !== "undefined") {
            hljs.highlightAll();  // Aplica o highlight.js
          }
          botOcupado = false;
          newInterruptBtn.style.display = "none";
          enviarBtn.style.display = '';
        }
        i++;
      }, 10);
    }

    typeMessage(botDiv, data.reply);  // Passa a resposta do bot
  } catch (error) {
    botDiv.textContent = "Erro ao se comunicar com o servidor.";
    console.error(error);
    botOcupado = false;
  }
}

document.getElementById("userInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function interromperResposta(intervaloId, botDiv, interruptBtn) {
  clearInterval(intervaloId);
  botDiv.innerHTML = "Resposta interrompida.";
  interruptBtn.style.display = "none";
  botOcupado = false;
}

  document.getElementById("inputs").addEventListener("click", function(e) {
      e.preventDefault();
      sendMessage();
    });

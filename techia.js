let botOcupado = false; // flag global

async function sendMessage() {
  if (botOcupado) return; // bloqueia se já estiver pensando

  botOcupado = true; // marca como ocupado

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

  // Mensagem do bot
  const botDiv = document.createElement("div");
  botDiv.className = "message bot bot_ativo";
  botDiv.innerHTML = `<span>Pensando</span> <span>Na</span> <span>Resposta</span>`;
  messagesDiv.appendChild(botDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  try {
    const response = await fetch("https://blacktechof-github-io.onrender.com/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage }),
    });

    const data = await response.json();

    function typeMessage(element, message) {
      element.classList.remove("bot_ativo");
      element.innerHTML = ""; // agora vai aceitar HTML
      let i = 0;
      const interval = setInterval(() => {
        // Mostra parte do texto incrementalmente, mas com HTML preservado
        element.innerHTML = message.slice(0, i);
        i++;
        if (i >= message.length) clearInterval(interval);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }, 10);
    }    

    typeMessage(botDiv, data.reply);
  } catch (error) {
    botDiv.textContent = "Erro ao se comunicar com o servidor.";
    console.error(error);
  } finally {
    botOcupado = false; 
  }
}

document.getElementById("userInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});


let botOcupado = false;
let intervaloId; // Variável para armazenar o intervalo da digitação, a ser usado para interromper.

async function sendMessage() {
  if (botOcupado) return; // Se o bot estiver ocupado, não envia nova mensagem
  botOcupado = true; // Marca o bot como ocupado

  const input = document.getElementById("userInput");
  const messagesDiv = document.getElementById("messages");
  const userMessage = input.value.trim();

  if (!userMessage) {
    botOcupado = false;
    return;
  }

  // msg do usuário
  const userDiv = document.createElement("div");
  userDiv.className = "message user";
  userDiv.textContent = userMessage;
  messagesDiv.appendChild(userDiv);

  input.value = "";
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  // msg do bot
  const botDiv = document.createElement("div");
  botDiv.className = "message bot bot_ativo";
  botDiv.innerHTML = `<span>Pensando</span> <span>Na</span> <span>Resposta</span>`;
  messagesDiv.appendChild(botDiv);

  // Botão para interromper a resposta
  const interruptBtn = document.getElementById("interrupt-btn");
  const enviarBtn = document.getElementById("enviar");
  enviarBtn.style.display = 'none'
  interruptBtn.style.display = "inline-block";  // Torna o botão visível ao iniciar a resposta

  interruptBtn.addEventListener("click", () => {
    interromperResposta(intervaloId, botDiv, interruptBtn);  // Passa os parâmetros necessários
  });

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
      element.innerHTML = "";
      let i = 0;
      intervaloId = setInterval(() => {  // Salva o ID do intervalo para interrupção
        const slicedMessage = message.slice(0, i);
        element.innerHTML = marked.parse(slicedMessage);
        i++;

        // Adiciona os estilos de destaque de sintaxe
        if (i >= message.length) {
          clearInterval(intervaloId);
          if (typeof hljs !== "undefined") {
            hljs.highlightAll(); // Chama para destacar o código
          }
          botOcupado = false; // Libera o envio de novas mensagens após a conclusão
          interruptBtn.style.display = "none";
    enviarBtn.style.display = ''
        }
      }, 10);
    }

    typeMessage(botDiv, data.reply);
  } catch (error) {
    botDiv.textContent = "Erro ao se comunicar com o servidor.";
    console.error(error);
    botOcupado = false; // Se der erro, libera o envio de novas mensagens
  }
}

document.getElementById("userInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendImage(event) {
  const file = event.target.files[0];
  const messagesDiv = document.getElementById("messages");

  if (file) {
    // Log para verificar o arquivo
    console.log("Arquivo selecionado:", file);

    const reader = new FileReader();
    reader.onload = function(e) {
      // Exibir a imagem no chat
      const imageDiv = document.createElement("div");
      imageDiv.className = "message user";

      const image = document.createElement("img");
      image.src = e.target.result; // Usando o FileReader para exibir no chat
      image.style.maxWidth = "100%";
      image.style.borderRadius = "8px";
      imageDiv.appendChild(image);

      messagesDiv.appendChild(imageDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };
    reader.readAsDataURL(file);

    // Enviar imagem para o servidor
    const formData = new FormData();
    formData.append("image", file);

    fetch("https://blacktechof-github-io.onrender.com/upload-image", {
      method: "POST",
      body: formData,
    })
    .then(response => response.json())
    .then(data => {
      // Log para verificar a resposta do servidor
      console.log("Resposta do servidor:", data);
      
      // Exibir a resposta do bot
      const botDiv = document.createElement("div");
      botDiv.className = "message bot";
      botDiv.textContent = data.reply;
      messagesDiv.appendChild(botDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    })
    .catch(error => {
      console.error("Erro ao enviar a imagem:", error);
    });
  }
}


// Função para interromper a resposta
function interromperResposta(intervaloId, botDiv, interruptBtn) {
  clearInterval(intervaloId);  // Interrompe a digitação
  botDiv.innerHTML = "Resposta interrompida.";  // Modifica a mensagem do bot
  interruptBtn.style.display = "none";  // Esconde o botão de interrupção
  botOcupado = false;  // Marca como disponível novamente
}

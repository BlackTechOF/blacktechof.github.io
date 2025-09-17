const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { getJson } = require("serpapi");
const fetch = require("node-fetch");
const User = require("../models/User.js");
const Chat = require("../models/Chat.js");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = process.env.SECRET || "segredo123";

// ==================== GERENCIADOR DE CHAVES ====================
let geminiKeys = process.env.GEMINI_KEYS.split(",");
let serpapiKeys = process.env.SERPAPI_KEYS.split(",");

let geminiIndex = 0;
let serpapiIndex = 0;

function getGeminiKey() {
  return geminiKeys[geminiIndex % geminiKeys.length];
}
function rotateGeminiKey() {
  geminiIndex++;
  return getGeminiKey();
}

function getSerpApiKey() {
  return serpapiKeys[serpapiIndex % serpapiKeys.length];
}
function rotateSerpApiKey() {
  serpapiIndex++;
  return getSerpApiKey();
}

// ==================== MONGODB ====================
async function connectToDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB conectado");
  } catch (err) {
    console.error("❌ Erro no MongoDB:", err);
    process.exit(1);
  }
}
connectToDB();

// ==================== AUTENTICAÇÃO ====================
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token ausente" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// ==================== GEMINI REST ====================
async function gerarRespostaGeminiComHistorico(mensagens) {
  const modelos = ["gemini-2.5-flash", "gemini-1.5-flash"];
  const historicoFormatado = [
    {
      role: "user",
      parts: [
        { text: "⚠️ Importante: Responda sempre em português do Brasil, de forma natural." }
      ]
    },
    ...mensagens.map(msg => ({
      role: msg.role === "bot" ? "model" : "user",
      parts: [{ text: msg.content }]
    }))
  ];

  for (let modelo of modelos) {
    let tentativas = 0;
    while (tentativas < geminiKeys.length) {
      const key = getGeminiKey();
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: historicoFormatado })
          }
        );

        if (!response.ok) {
          const erro = await response.text();
          console.warn(`⚠️ Erro no modelo ${modelo} com chave ${key}:`, erro);
          rotateGeminiKey();
          tentativas++;
          continue;
        }

        const data = await response.json();
        const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (texto) return texto;
      } catch (err) {
        console.error(`❌ Falha ao chamar ${modelo}:`, err.message);
        rotateGeminiKey();
        tentativas++;
      }
    }
  }
  return "⚠️ Não consegui gerar resposta.";
}

async function gerarTituloChat(mensagem) {
  const modelos = ["gemini-2.5-flash", "gemini-1.5-flash"];
  const prompt = `Crie um título curto (máx 5 palavras) para este chat.
  Mensagem: "${mensagem}"`;

  for (let modelo of modelos) {
    let tentativas = 0;
    while (tentativas < geminiKeys.length) {
      const key = getGeminiKey();
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }]
            })
          }
        );

        if (!response.ok) {
          const erro = await response.text();
          console.warn(`⚠️ Erro ao gerar título com chave ${key}:`, erro);
          rotateGeminiKey();
          tentativas++;
          continue;
        }

        const data = await response.json();
        const titulo = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/^"|"$/g, "");
        if (titulo) return titulo;
      } catch (err) {
        console.error(`❌ Falha ao chamar ${modelo} para título:`, err.message);
        rotateGeminiKey();
        tentativas++;
      }
    }
  }
  return "Novo Chat";
}

// ==================== SERPAPI ====================
async function buscarNaWeb(query) {
  let tentativas = 0;
  while (tentativas < serpapiKeys.length) {
    const key = getSerpApiKey();
    try {
      const results = await getJson({
        engine: "google",
        q: query,
        api_key: key,
        hl: "pt-br",
        gl: "br"
      });

      if (results.organic_results && results.organic_results.length > 0) {
        return results.organic_results[0];
      }
    } catch (err) {
      console.warn(`⚠️ Falha SerpAPI com chave ${key}:`, err.message);
      rotateSerpApiKey();
      tentativas++;
    }
  }
  return null;
}

// ==================== ROTAS DE AUTENTICAÇÃO ====================
app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Usuário ou senha ausente" });

  const existing = await User.findOne({ username });
  if (existing) return res.status(400).json({ error: "Usuário já existe" });

  const hash = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hash });
  await user.save();
  res.json({ message: "Usuário registrado com sucesso" });
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Senha incorreta" });

  const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: "7d" });
  res.json({ token });
});

// ==================== CHAT ====================
app.post("/chat/:chatId", authMiddleware, async (req, res) => {
  const { message } = req.body;
  let respostaFinal = "";

  const palavrasChaveWeb = [
    "hoje","agora","atualmente","momento atual","no momento",
    "últimas notícias","última hora","qual dia","que dia","data atual",
    "ano atual","hora atual","clima atualmente","previsão do tempo",
    "futuro","próximo","notícias recentes"
  ];

  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.userId });
    if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

    if (chat.title === "Novo Chat" && chat.messages.length === 0) {
      const novoTitulo = await gerarTituloChat(message);
      if (novoTitulo) chat.title = novoTitulo;
    }

    chat.messages.push({ role: "user", content: message });

    const perguntaFuturo = palavrasChaveWeb.some(p =>
      message.toLowerCase().includes(p)
    ) || /futuro/i.test(message) || /\b(202[5-9]|20[3-9][0-9])\b/.test(message);

    if (perguntaFuturo) {
      console.log("🌐 Pergunta detectada → SerpAPI");
      const result = await buscarNaWeb(message);
      respostaFinal = result
        ? `🌐 Da web: ${result.title} - ${result.snippet}`
        : "⚠️ Não encontrei nada na web.";
    } else {
      respostaFinal = await gerarRespostaGeminiComHistorico(chat.messages);

      if (!respostaFinal || respostaFinal.startsWith("⚠️")) {
        const result = await buscarNaWeb(message);
        if (result) {
          respostaFinal = `🌐 Da web: ${result.title} - ${result.snippet}`;
        }
      }
    }

    chat.messages.push({ role: "bot", content: respostaFinal });
    await chat.save();

    return res.json({ reply: respostaFinal, title: chat.title });
  } catch (err) {
    console.error("❌ Erro ao processar:", err);
    return res.status(500).json({ reply: "⚠️ Erro ao buscar informações.", title: "Erro no Chat" });
  }
});

// ==================== CHAT DB ====================
app.get("/chatdb/list", authMiddleware, async (req, res) => {
  const chats = await Chat.find({ userId: req.userId });
  res.json(chats);
});

app.post("/chatdb/new", authMiddleware, async (req, res) => {
  const chat = new Chat({ userId: req.userId, title: req.body.title || "Novo Chat", messages: [] });
  await chat.save();
  res.json(chat);
});

app.get("/chatdb/:chatId", authMiddleware, async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.userId });
  if (!chat) return res.status(404).json({ error: "Chat não encontrado" });
  res.json(chat.messages);
});

app.post("/chatdb/:chatId/save", authMiddleware, async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.userId });
  if (!chat) return res.status(404).json({ error: "Chat não encontrado" });
  chat.messages.push({ role: req.body.role, content: req.body.content });
  await chat.save();
  res.json({ ok: true });
});

app.delete("/chatdb/:chatId", authMiddleware, async (req, res) => {
  await Chat.deleteOne({ _id: req.params.chatId, userId: req.userId });
  res.json({ ok: true });
});

// ==================== SERVIDOR ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chat = require("../models/Chat.js"); // modelo do Mongo

// ==================== APP ====================
const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = "segredo123";

// ==================== MONGODB ====================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// ==================== AUTENTICAÇÃO ====================
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token ausente" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

app.post("/auth/login", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username obrigatório" });

  const token = jwt.sign({ username }, SECRET, { expiresIn: "1h" });
  return res.json({ token });
});

// ==================== GEMINI CONFIG ====================
const genAI = new GoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || "SUA_CHAVE_AQUI",
});

// ==================== DUCKDUCKGO FIX ====================
let searchFn;
try {
  const duck = require("duckduckgo-search");
  // pode exportar de 2 jeitos, testamos
  if (typeof duck === "function") {
    searchFn = duck;
  } else if (typeof duck.search === "function") {
    searchFn = duck.search;
  } else {
    console.error("❌ Nenhuma função válida encontrada no duckduckgo-search");
  }
} catch (err) {
  console.error("❌ Erro ao importar duckduckgo-search:", err);
}

// ==================== CHAT ENDPOINT ====================
app.post("/chat/:chatId", authMiddleware, async (req, res) => {
  const { message } = req.body;
  let respostaFinal = "";

  try {
    let results = [];

    if (searchFn) {
      try {
        results = await searchFn(message, { maxResults: 3 });
      } catch (e) {
        console.error("⚠️ Erro ao usar DuckDuckGo:", e);
      }
    }

    if (results && results.length > 0) {
      respostaFinal =
        `📡 Resultado da web:\n\n` +
        (results[0].snippet || results[0].title || results[0].url);
    } else {
      // fallback → Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(message);
      respostaFinal = result.response.text();
    }

    // salvar no chat
    const chat = await Chat.findById(req.params.chatId);
    if (chat) {
      chat.messages.push({ role: "user", content: message });
      chat.messages.push({ role: "assistant", content: respostaFinal });
      await chat.save();
    }
  } catch (err) {
    console.error("❌ Erro ao processar:", err);
    respostaFinal = "⚠️ Erro ao buscar informações.";
  }

  return res.json({ reply: respostaFinal });
});

// ==================== CHATDB ENDPOINTS ====================
app.get("/chatdb/list", authMiddleware, async (req, res) => {
  const chats = await Chat.find({ userId: req.user.username }).lean();
  res.json(chats);
});

app.post("/chatdb/new", authMiddleware, async (req, res) => {
  const newChat = new Chat({
    userId: req.user.username,
    messages: [],
    title: req.body.title || "Novo Chat",
  });
  await newChat.save();
  res.json(newChat);
});

app.get("/chatdb/:id", authMiddleware, async (req, res) => {
  const chat = await Chat.findById(req.params.id).lean();
  res.json(chat?.messages || []);
});

app.post("/chatdb/:id/save", authMiddleware, async (req, res) => {
  const { role, content } = req.body;
  const chat = await Chat.findById(req.params.id);
  if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

  chat.messages.push({ role, content });
  await chat.save();
  res.json({ success: true });
});

app.delete("/chatdb/:id", authMiddleware, async (req, res) => {
  await Chat.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ==================== SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server rodando na porta ${PORT}`)
);

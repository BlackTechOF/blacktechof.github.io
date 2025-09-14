const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const duckduckgo = require("duckduckgo-search"); // ✅ busca web
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const Chat = require("../models/Chat.js"); // ✅ agora certo

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = "segredo123";

// ==================== MONGODB ====================
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/techia", {
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
  } catch (err) {
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

// ==================== CHAT ENDPOINT ====================
app.post("/chat/:chatId", authMiddleware, async (req, res) => {
  const { message } = req.body;
  let respostaFinal = "";

  try {
    // 1) Buscar na web
    const results = await duckduckgo.search(message, { maxResults: 3 });

    if (results && results.length > 0) {
      respostaFinal = `📡 Resultado da web: ${results[0].snippet || results[0].title || results[0].url}`;
    } else {
      // 2) Gemini fallback
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
  try {
    const chats = await Chat.find({ userId: req.user.username }).lean();
    res.json(chats);
  } catch (err) {
    console.error("Erro em /chatdb/list:", err);
    res.status(500).json({ error: "Erro ao listar chats" });
  }
});

app.post("/chatdb/new", authMiddleware, async (req, res) => {
  try {
    const newChat = new Chat({
      userId: req.user.username,
      messages: [],
      title: req.body.title || "Novo Chat",
    });
    await newChat.save();
    res.json(newChat);
  } catch (err) {
    console.error("Erro em /chatdb/new:", err);
    res.status(500).json({ error: "Erro ao criar chat" });
  }
});

app.get("/chatdb/:id", authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id).lean();
    res.json(chat?.messages || []);
  } catch (err) {
    console.error("Erro em /chatdb/:id:", err);
    res.status(500).json({ error: "Erro ao buscar chat" });
  }
});

app.post("/chatdb/:id/save", authMiddleware, async (req, res) => {
  try {
    const { role, content } = req.body;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

    chat.messages.push({ role, content });
    await chat.save();
    res.json({ success: true });
  } catch (err) {
    console.error("Erro em /chatdb/:id/save:", err);
    res.status(500).json({ error: "Erro ao salvar mensagem" });
  }
});

app.delete("/chatdb/:id", authMiddleware, async (req, res) => {
  try {
    await Chat.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Erro em DELETE /chatdb/:id:", err);
    res.status(500).json({ error: "Erro ao deletar chat" });
  }
});

// ==================== SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server rodando na porta ${PORT}`));

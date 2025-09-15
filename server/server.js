// server.js - versão pronta para Render
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getJson } = require("serpapi"); // SerpAPI
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
const User = require("../models/User.js");
const Chat = require("../models/Chat.js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = process.env.SECRET || "segredo123";

// ==================== MONGODB ====================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB conectado"))
.catch(err => console.error("❌ Erro no MongoDB:", err));

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

// ==================== GEMINI CONFIG ====================
const genAI = new GoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ==================== AUTENTICAÇÃO ROTAS ====================
app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Preencha usuário e senha" });

  const existing = await User.findOne({ username });
  if (existing) return res.status(400).json({ error: "Usuário já existe" });

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed });
  await user.save();

  res.json({ message: "Registrado com sucesso" });
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Senha incorreta" });

  const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: "7d" });
  res.json({ token });
});

// Listar chats do usuário
app.get("/chatdb/list", authMiddleware, async (req, res) => {
  const chats = await Chat.find({ userId: req.userId });
  res.json(chats);
});

// Criar novo chat
app.post("/chatdb/new", authMiddleware, async (req, res) => {
  const { title } = req.body;
  const chat = new Chat({ title: title || "Novo Chat", userId: req.userId, messages: [] });
  await chat.save();
  res.json(chat);
});

// Buscar mensagens de um chat
app.get("/chatdb/:chatId", authMiddleware, async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.userId });
  if (!chat) return res.status(404).json({ error: "Chat não encontrado" });
  res.json(chat.messages);
});

// Salvar mensagem no chat
app.post("/chatdb/:chatId/save", authMiddleware, async (req, res) => {
  const { role, content } = req.body;
  const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.userId });
  if (!chat) return res.status(404).json({ error: "Chat não encontrado" });
  chat.messages.push({ role, content });
  await chat.save();
  res.json({ ok: true });
});

// Deletar chat
app.delete("/chatdb/:chatId", authMiddleware, async (req, res) => {
  await Chat.deleteOne({ _id: req.params.chatId, userId: req.userId });
  res.json({ ok: true });
});

// ==================== CHAT COM SERPAPI + GEMINI ====================
app.post("/chat/:chatId", authMiddleware, async (req, res) => {
  const { message } = req.body;
  let respostaFinal = "";

  try {
    // Se a pergunta envolve ano atual, futuro ou 2025 -> forçar busca web
    const anoAtual = new Date().getFullYear();
    const buscaWeb = /\b(2025|202[4-9]|[0-9]{4})\b/.test(message) || /\b(hoje|último|próximo|futuro|ano)\b/i.test(message);

    if (buscaWeb) {
      try {
        const results = await getJson({
          engine: "google",
          q: message,
          api_key: process.env.SERPAPI_KEY,
          hl: "pt-br",
          gl: "br"
        });

        if (results.organic_results && results.organic_results.length > 0) {
          const first = results.organic_results[0];
          respostaFinal = `${first.title} - ${first.snippet || first.snippet_highlighted || ""}`;
        }
      } catch (err) {
        console.warn("⚠️ Falha na busca web:", err.message);
      }
    }

    // Se não houve resultado da web -> Gemini
    if (!respostaFinal) {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(message);
      respostaFinal = result.response.text();
    }

    // Salvar no chat
    const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.userId });
    if (chat) {
      chat.messages.push({ role: "user", content: message });
      chat.messages.push({ role: "bot", content: respostaFinal });
      await chat.save();
    }

  } catch (err) {
    console.error("❌ Erro ao processar:", err);
    respostaFinal = "⚠️ Erro ao buscar informações.";
  }

  res.json({ reply: respostaFinal });
});

// ==================== PORTA DINÂMICA PARA RENDER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));



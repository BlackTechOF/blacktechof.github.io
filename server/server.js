// server/server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const duckduckgo = require("duckduckgo-search"); // ✅ busca web
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

// Registro de usuário
app.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Username e senha obrigatórios" });

    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ error: "Usuário já existe" });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashed });
    await newUser.save();

    res.json({ message: "✅ Usuário registrado com sucesso!" });
  } catch (err) {
    console.error("Erro em /auth/register:", err);
    res.status(500).json({ error: "Erro ao registrar usuário" });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Senha inválida" });

  const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: "1d" });
  res.json({ token });
});

// ==================== GEMINI CONFIG ====================
const genAI = new GoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY, // precisa estar no Render
});

// ==================== CHAT COM GEMINI + WEB ====================
app.post("/chat/:chatId", authMiddleware, async (req, res) => {
  const { message } = req.body;
  let respostaFinal = "";

  try {
    // 1) Buscar na web
    try {
      const results = await duckduckgo.search(message, { maxResults: 3 });
    } catch (err) {
      console.warn("⚠️ Falha na busca web:", err.message);
    }

    if (results && results.length > 0) {
      respostaFinal = `📡 Resultado da web: ${results[0].snippet || results[0].title}`;
    } else {
      // 2) Gemini fallback
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(message);
      respostaFinal = result.response.text();
    }

    // salvar no chat
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

  return res.json({ reply: respostaFinal });
});

// ==================== CHATDB ENDPOINTS ====================
app.get("/chatdb/list", authMiddleware, async (req, res) => {
  const chats = await Chat.find({ userId: req.userId }).select("_id title");
  res.json(chats);
});

app.post("/chatdb/new", authMiddleware, async (req, res) => {
  const newChat = new Chat({
    userId: req.userId,
    messages: [],
    title: req.body.title || "Novo Chat",
  });
  await newChat.save();
  res.json(newChat);
});

app.get("/chatdb/:id", authMiddleware, async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
  res.json(chat?.messages || []);
});

app.post("/chatdb/:id/save", authMiddleware, async (req, res) => {
  const { role, content } = req.body;
  const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
  if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

  chat.messages.push({ role, content });
  await chat.save();

  res.json({ success: true });
});

app.delete("/chatdb/:id", authMiddleware, async (req, res) => {
  await Chat.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.json({ success: true });
});

// ==================== START ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server rodando na porta ${PORT}`));


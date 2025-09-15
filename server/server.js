// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { getJson } = require("serpapi"); // ✅ SerpAPI
const { GoogleGenerativeAI } = require("@google/generative-ai");
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

  try {
    // 1) Tentar buscar na web (SerpAPI)
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({ prompt: message, temperature: 0.7 });
      respostaFinal = result.candidates?.[0]?.output || "⚠️ Não consegui gerar resposta.";
    } catch (err) {
      console.warn("⚠️ Falha ao gerar resposta Gemini:", err.message)
    }


    // 2) Se não encontrou nada, usar Gemini
    if (!respostaFinal) {
      try {
        const results = await getJson({
          engine: "google",
          q: message,
          api_key: process.env.SERPAPI_KEY,
          hl: "pt-br",
          gl: "br"
        });
        if (results.organic_results && results.organic_results.length > 0) {
          respostaFinal = `🌐 Da web: ${results.organic_results[0].title} - ${results.organic_results[0].snippet}`;
        }
      } catch (err) {
        console.warn("⚠️ Falha na busca web:", err.message);
      }
    }


    // 3) Salvar no chat
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


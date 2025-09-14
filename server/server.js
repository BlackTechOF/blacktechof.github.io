// server/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const Chat = require("../models/Chat.js");
const User = require("../models/User.js");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Conexão MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB conectado"))
.catch(err => console.error("❌ Erro MongoDB:", err));

// Configuração JWT e Gemini
const JWT_SECRET = process.env.JWT_SECRET || "chave_super_secreta";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware de autenticação
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Token não fornecido" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.user = decoded;
    next();
  });
}

/* ========== ROTAS AUTH ========== */
app.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Preencha usuário e senha" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();

    res.json({ message: "Usuário registrado com sucesso" });
  } catch (err) {
    console.error("Erro no register:", err);
    res.status(500).json({ error: "Erro ao registrar" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Senha incorreta" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro ao logar" });
  }
});

/* ========== ROTAS CHATS ========== */
app.get("/chatdb/list", authMiddleware, async (req, res) => {
  const chats = await Chat.find({ userId: req.user.id });
  res.json(chats);
});

app.post("/chatdb/new", authMiddleware, async (req, res) => {
  const { title } = req.body;
  const chat = new Chat({ userId: req.user.id, title, messages: [] });
  await chat.save();
  res.json(chat);
});

app.get("/chatdb/:id", authMiddleware, async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });
  if (!chat) return res.status(404).json({ error: "Chat não encontrado" });
  res.json(chat.messages);
});

app.delete("/chatdb/:id", authMiddleware, async (req, res) => {
  await Chat.deleteOne({ _id: req.params.id, userId: req.user.id });
  res.json({ message: "Chat deletado" });
});

app.post("/chatdb/:id/save", authMiddleware, async (req, res) => {
  const { role, content } = req.body;
  const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });
  if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

  chat.messages.push({ role, content });
  await chat.save();
  res.json({ success: true });
});

/* ========== ROTA DE CHAT COM GEMINI ========== */
app.post("/chat/:chatId", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Mensagem vazia" });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(message);
    const respostaFinal = result.response.text();

    res.json({ reply: respostaFinal });
  } catch (err) {
    console.error("Erro no Gemini:", err);
    res.status(500).json({ error: "Erro ao processar IA", detail: err.message });
  }
});

/* ========== START SERVER ========== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));


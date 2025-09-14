const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 🔍 DuckDuckGo
const duckduckgo = require("duckduckgo-search"); 

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ================= CONFIG =================
const JWT_SECRET = "seu_segredo";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// ================= MODELOS =================
const UserSchema = new mongoose.Schema({
  username: String,
  password: String
});

const ChatSchema = new mongoose.Schema({
  userId: String,
  title: String,
  messages: [{ role: String, content: String }]
});

const User = mongoose.model("User", UserSchema);
const Chat = mongoose.model("Chat", ChatSchema);

// ================= MIDDLEWARE =================
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(403).json({ error: "Token não fornecido" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Token inválido" });
    req.user = decoded;
    next();
  });
}

// ================= AUTENTICAÇÃO =================
app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  const user = new User({ username, password: hashed });
  await user.save();

  res.json({ message: "Usuário registrado!" });
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Senha incorreta" });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

// ================= CHAT =================
app.post("/chat/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    let reply = "";

    // 🔹 1. IA responde primeiro
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(message);
      reply = result.response.text();
    } catch (err) {
      console.error("Erro na IA:", err);
    }

    // 🔹 2. Se IA não responder bem → busca na web
    if (!reply || reply.trim() === "" || reply.includes("não sei")) {
      try {
        const results = await duckduckgo.search(message);
        if (results && results.length > 0) {
          // pega o melhor resumo
          reply = results[0].snippet || results[0].title || "Não encontrei nada relevante.";
        } else {
          reply = "❌ Não encontrei nada na web.";
        }
      } catch (err) {
        console.error("Erro ao buscar na web:", err);
        reply = "⚠️ Erro ao buscar informações na web.";
      }
    }

    // 🔹 Salvar no histórico
    const chat = await Chat.findById(id);
    if (chat) {
      chat.messages.push({ role: "user", content: message });
      chat.messages.push({ role: "bot", content: reply });
      await chat.save();
    }

    res.json({ reply });
  } catch (err) {
    console.error("Erro geral:", err);
    res.status(500).json({ error: "Erro no servidor" });
  }
});

// ================= CHAT DB =================
app.get("/chatdb/list", authMiddleware, async (req, res) => {
  const chats = await Chat.find({ userId: req.user.id });
  res.json(chats);
});

app.post("/chatdb/new", authMiddleware, async (req, res) => {
  const chat = new Chat({ userId: req.user.id, title: req.body.title, messages: [] });
  await chat.save();
  res.json(chat);
});

app.get("/chatdb/:id", authMiddleware, async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  res.json(chat ? chat.messages : []);
});

app.post("/chatdb/:id/save", authMiddleware, async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

  chat.messages.push(req.body);
  await chat.save();
  res.json({ message: "Mensagem salva" });
});

app.delete("/chatdb/:id", authMiddleware, async (req, res) => {
  await Chat.findByIdAndDelete(req.params.id);
  res.json({ message: "Chat deletado" });
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));

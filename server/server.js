const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fetch = require("node-fetch"); // npm install node-fetch@2
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// =================== IA GEMINI ===================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// =================== MONGODB ===================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB conectado"))
.catch(err => console.error("❌ Erro no MongoDB:", err));

// =================== MODELS ===================
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const ChatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: { type: String, default: "Novo Chat" },
  messages: [
    {
      role: { type: String, enum: ["user", "bot"], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    }
  ]
});

const User = mongoose.model("User", UserSchema);
const Chat = mongoose.model("Chat", ChatSchema);

// =================== AUTENTICAÇÃO ===================
const SECRET = process.env.SECRET || "segredo_forte";

// cadastro
app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();
    res.json({ message: "✅ Usuário registrado com sucesso!" });
  } catch (err) {
    res.status(400).json({ error: "Usuário já existe ou erro ao registrar" });
  }
});

// login
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Senha inválida" });

  const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: "1d" });
  res.json({ token });
});

// middleware de autenticação
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token necessário" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

// =================== BUSCA NA WEB ===================
async function buscaWeb(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.AbstractText) return data.AbstractText;
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      return data.RelatedTopics[0].Text;
    }
    return "❌ Não encontrei nada na web.";
  } catch (err) {
    console.error("Erro busca web:", err);
    return "⚠️ Erro ao buscar na web.";
  }
}

// =================== CHAT GEMINI + WEB ===================
app.post("/chat/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const chat = await Chat.findOne({ _id: id, userId: req.userId });
    if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

    // salva msg user
    chat.messages.push({ role: "user", content: message });
    await chat.save();

    // monta histórico
    const history = chat.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");

    let text;
    try {
      // tenta IA
      const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });
      const prompt = `
Você é um assistente útil.  
Responda sempre em Markdown.  

Histórico da conversa:
${history}

Responda à última mensagem do usuário.  
Se não tiver certeza ou a informação for sobre eventos recentes, apenas diga "não sei".
      `;

      const result = await model.generateContent(prompt);
      text = result.response.text();
    } catch (err) {
      console.error("Erro no Gemini:", err);
      text = "não sei";
    }

    // se IA não souber → tenta web
    if (!text || text.toLowerCase().includes("não sei") || text.includes("ainda não aconteceu")) {
      console.log("🌐 Buscando na web:", message);
      const webInfo = await buscaWeb(message);
      text = `🔎 Resultado da web: ${webInfo}`;
    }

    // salva msg bot
    chat.messages.push({ role: "bot", content: text });
    await chat.save();

    res.json({ reply: text });
  } catch (error) {
    console.error("❌ Erro na rota /chat/:id:", error);
    res.status(500).json({ reply: "Erro ao se comunicar com a IA." });
  }
});

// =================== CHATDB (Mongo) ===================
// criar novo chat
app.post("/chatdb/new", authMiddleware, async (req, res) => {
  const { title } = req.body;
  const chat = new Chat({ userId: req.userId, title: title || "Novo Chat", messages: [] });
  await chat.save();
  res.json(chat);
});

// listar chats
app.get("/chatdb/list", authMiddleware, async (req, res) => {
  const chats = await Chat.find({ userId: req.userId }).select("_id title");
  res.json(chats);
});

// obter histórico
app.get("/chatdb/:id", authMiddleware, async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
  if (!chat) return res.json([]);
  res.json(chat.messages);
});

// deletar chat
app.delete("/chatdb/:id", authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!chat) return res.status(404).json({ error: "Chat não encontrado" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar chat" });
  }
});

// =================== START ===================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

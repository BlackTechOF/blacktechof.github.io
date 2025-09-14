const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const search = require("duckduckgo-search"); // 🔎 DuckDuckGo
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

// =================== CHAT GEMINI + BUSCA WEB ===================
app.post("/chat/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const chat = await Chat.findOne({ _id: id, userId: req.userId });
    if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

    // 1. Salva mensagem do usuário
    chat.messages.push({ role: "user", content: message });
    await chat.save();

    // 2. Monta histórico
    const history = chat.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");

    // 3. IA com busca na web se necessário
    let botReply = "";
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });

    try {
      const result = await model.generateContent(`
Você é um assistente.  
Responda sempre em Markdown.  

Histórico da conversa:
${history}

Responda à última mensagem do usuário.
      `);

      botReply = result.response.text();
    } catch (err) {
      console.error("❌ Erro no Gemini:", err);
      botReply = "⚠️ Não consegui responder com a IA.";
    }

    // Se a IA não souber responder -> tenta buscar no DuckDuckGo
    if (botReply.includes("não sei") || botReply.includes("não tenho certeza")) {
      try {
        const results = await search(message, { safeSearch: "moderate" });
        if (results.length > 0) {
          botReply = `🔎 Resultado da web:\n\n${results[0].title}\n${results[0].description}`;
        } else {
          botReply = "❌ Não encontrei nada na web.";
        }
      } catch (err) {
        console.error("❌ Erro ao buscar na web:", err);
      }
    }

    // 4. Salva resposta do bot
    chat.messages.push({ role: "bot", content: botReply });
    await chat.save();

    res.json({ reply: botReply });
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

// listar chats do usuário
app.get("/chatdb/list", authMiddleware, async (req, res) => {
  const chats = await Chat.find({ userId: req.userId }).select("_id title");
  res.json(chats);
});

// obter histórico de um chat
app.get("/chatdb/:id", authMiddleware, async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
  if (!chat) return res.json([]);
  res.json(chat.messages);
});

// deletar um chat
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

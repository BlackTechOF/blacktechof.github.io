const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const { GoogleGenerativeAI } = require("@google/generative-ai");
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

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Senha inválida" });

  const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: "1d" });
  res.json({ token });
});

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

// =================== FUNÇÃO DE BUSCA NA WEB ===================
async function searchDuckDuckGo(query) {
  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // pega até 2 links principais
    let results = [];
    $("a.result__a").each((i, el) => {
      if (i < 2) results.push($(el).attr("href"));
    });

    let texts = [];
    for (let link of results) {
      try {
        const page = await fetch(link);
        const pageHtml = await page.text();
        const $$ = cheerio.load(pageHtml);
        let text = $$("body").text();
        texts.push(text.substring(0, 1000)); // pega só um pedaço p/ não pesar
      } catch (err) {
        console.error("❌ Erro ao abrir link:", err);
      }
    }

    return texts.join("\n\n");
  } catch (err) {
    console.error("❌ Erro na busca DuckDuckGo:", err);
    return "";
  }
}

// =================== CHAT COM MEMÓRIA E WEB ===================
app.post("/chat/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const chat = await Chat.findOne({ _id: id, userId: req.userId });
    if (!chat) return res.status(404).json({ error: "Chat não encontrado" });

    // salva mensagem do usuário
    chat.messages.push({ role: "user", content: message });
    await chat.save();

    // histórico
    const history = chat.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");

    // tenta responder só com a IA
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });
    let prompt = `
Você é um assistente em português.  
Data atual: ${new Date().toLocaleDateString("pt-BR")}  

Histórico da conversa:
${history}

Responda à última mensagem do usuário. Se não souber, diga claramente.
    `;

    let result = await model.generateContent(prompt);
    let text = result.response.text();

    // se a resposta da IA parecer inconclusiva → busca na web
    if (text.includes("não sei") || text.includes("não tenho informações") || text.length < 30) {
      const webData = await searchDuckDuckGo(message);
      if (webData) {
        prompt += `\n\nInformações da web:\n${webData}\n\nUse isso para responder de forma atualizada.`;
        result = await model.generateContent(prompt);
        text = result.response.text();
      }
    }

    // salva resposta do bot
    chat.messages.push({ role: "bot", content: text });
    await chat.save();

    res.json({ reply: text });
  } catch (error) {
    console.error("❌ Erro na rota /chat/:id:", error);
    res.status(500).json({ reply: "Erro ao se comunicar com a IA." });
  }
});

// =================== CHATDB ===================
app.post("/chatdb/new", authMiddleware, async (req, res) => {
  const { title } = req.body;
  const chat = new Chat({ userId: req.userId, title: title || "Novo Chat", messages: [] });
  await chat.save();
  res.json(chat);
});

app.get("/chatdb/list", authMiddleware, async (req, res) => {
  const chats = await Chat.find({ userId: req.userId }).select("_id title");
  res.json(chats);
});

app.get("/chatdb/:id", authMiddleware, async (req, res) => {
  const chat = await Chat.findOne({ _id: req.params.id, userId: req.userId });
  if (!chat) return res.json([]);
  res.json(chat.messages);
});

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

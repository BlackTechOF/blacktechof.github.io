const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

// =================== CHAT GEMINI ===================
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });

    const prompt = `
Responda usando Markdown.  
Se for código, use blocos \`\`\`.  

Pergunta do usuário:  
${message}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("❌ Erro na rota /chat:", error);
    res.status(500).json({ reply: "Erro ao se comunicar com a IA." });
  }
});

// =================== CHATDB (Mongo) ===================
// salvar mensagem
app.post("/chatdb/save", authMiddleware, async (req, res) => {
  const { role, content } = req.body;

  let chat = await Chat.findOne({ userId: req.userId });
  if (!chat) chat = new Chat({ userId: req.userId, messages: [] });

  chat.messages.push({ role, content });
  await chat.save();

  res.json({ success: true });
});

// carregar histórico
app.get("/chatdb/history", authMiddleware, async (req, res) => {
  const chat = await Chat.findOne({ userId: req.userId });
  res.json(chat ? chat.messages : []);
});

// =================== START ===================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

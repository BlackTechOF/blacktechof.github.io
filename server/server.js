const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const search = require("duckduckgo-search"); // 🔍 Busca DuckDuckGo

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = "segredo123";

// Simulação de banco (poderia ser MongoDB depois)
let users = [];
let chats = {};

// ================= AUTH =================
app.post("/auth/register", (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: "Usuário já existe" });
  }
  users.push({ username, password });
  res.json({ message: "Usuário registrado com sucesso" });
});

app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

  const token = jwt.sign({ username }, SECRET, { expiresIn: "2h" });
  res.json({ token });
});

// Middleware de autenticação
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Token ausente" });

  const token = auth.split(" ")[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// ================= CHATS =================
app.get("/chatdb/list", authMiddleware, (req, res) => {
  const userChats = Object.values(chats).filter(c => c.username === req.user.username);
  res.json(userChats);
});

app.post("/chatdb/new", authMiddleware, (req, res) => {
  const { title } = req.body;
  const id = uuidv4();
  chats[id] = { _id: id, title, username: req.user.username, messages: [] };
  res.json(chats[id]);
});

app.get("/chatdb/:id", authMiddleware, (req, res) => {
  const chat = chats[req.params.id];
  if (!chat || chat.username !== req.user.username) return res.status(404).json({ error: "Chat não encontrado" });
  res.json(chat.messages);
});

app.delete("/chatdb/:id", authMiddleware, (req, res) => {
  const chat = chats[req.params.id];
  if (!chat || chat.username !== req.user.username) return res.status(404).json({ error: "Chat não encontrado" });
  delete chats[req.params.id];
  res.json({ message: "Chat excluído" });
});

// ✅ NOVA ROTA: salvar mensagens
app.post("/chatdb/:id/save", authMiddleware, (req, res) => {
  const chat = chats[req.params.id];
  if (!chat || chat.username !== req.user.username) return res.status(404).json({ error: "Chat não encontrado" });

  const { role, content } = req.body;
  chat.messages.push({ role, content });
  res.json({ message: "Mensagem salva" });
});

// ================= CHAT IA + WEB SEARCH =================
app.post("/chat/:id", authMiddleware, async (req, res) => {
  const chat = chats[req.params.id];
  if (!chat || chat.username !== req.user.username) return res.status(404).json({ error: "Chat não encontrado" });

  const userMessage = req.body.message;
  let reply = "";

  try {
    // 🔎 Se a pergunta parecer sobre eventos atuais (quem ganhou, que dia é hoje, etc)
    if (/quem ganhou|campeão|que dia|hoje|atual/i.test(userMessage)) {
      const results = await duckduckgo.search(query);
      if (results && results.length > 0) {
        reply = results[0].snippet || results[0].title;
      } else {
        reply = "❌ Não encontrei nada atualizado na web.";
      }
    } else {
      // Resposta padrão quando não precisa da web
      reply = "Oi! Como posso ajudar?";
    }
  } catch (err) {
    console.error("Erro ao buscar na web:", err);
    reply = "⚠️ Erro ao buscar informações na web.";
  }

  chat.messages.push({ role: "bot", content: reply });
  res.json({ reply });
});

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server rodando na porta ${PORT}`));


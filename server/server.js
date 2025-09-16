// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { getJson } = require("serpapi"); // ✅ SerpAPI
const fetch = require("node-fetch"); // 🔥 REST Gemini
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

// ==================== GEMINI REST ====================
async function gerarRespostaGemini(mensagem) {
const modelos = ["gemini-2.5-flash", "gemini-1.5-flash"];
for (let modelo of modelos) {
try {
console.log("🔄 Tentando modelo:", modelo);
const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${process.env.GEMINI_API_KEY}`,
{
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
contents: [{ role: "user", parts: [{ text: mensagem }] }]
})
}
);

if (!response.ok) {
const erro = await response.text();
console.warn(`⚠️ Erro no modelo ${modelo}:`, erro);
continue; // tenta próximo modelo
}

const data = await response.json();
const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
if (texto) return texto;
} catch (err) {
console.error(`❌ Falha ao chamar ${modelo}:`, err);
}
}
return "⚠️ Não consegui gerar resposta.";
}

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

const palavrasChaveWeb = [
      "hoje", "agora", "atualmente", "momento atual", "no momento",
      "últimas notícias", "últimos acontecimentos", "recentemente", "última hora", "novidades",
      "qual dia", "que dia", "dia da semana", "data atual", "em que dia estamos", "que dia é hoje",
      "qual é a data", "dia de hoje",
      "qual ano", "que ano", "ano atual", "em que ano estamos", "ano de hoje",
      "hora atual", "que horas são", "horário agora", "hora de hoje",
      "tempo agora", "clima atualmente", "temperatura agora", "condições atuais", "previsão do tempo",
      "próximo", "futuro", "próximos eventos", "agenda", "feriado", "programação",
      "informação atual", "dados recentes", "estatísticas atuais", "atualizações", "notícias recentes",
      "novidades do dia", "o que está acontecendo", "acontecimentos recentes", "novidades atuais"
    ];

try {
// 🔎 1) Detectar se é pergunta sobre futuro (ano >= 2025 ou contém "futuro")
const regexAno = /\b(20[2-9][0-9])\b/; // pega 2020-2099
const matchAno = message.match(regexAno);
const perguntaFuturo = palavrasChaveWeb.some(palavra => 
  message.toLowerCase().includes(palavra)
) || /futuro/i.test(message) || /\b(202[5-9]|20[3-9][0-9])\b/.test(message);
if (perguntaFuturo) {
console.log("🌐 Pergunta futura detectada → usando SerpAPI");
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
} else {
respostaFinal = "⚠️ Não encontrei nada na web.";
}
} catch (err) {
console.warn("⚠️ Falha na busca web:", err.message);
respostaFinal = "⚠️ Erro ao buscar na web.";
}
} else {
// 🤖 2) Caso normal → tenta Gemini primeiro
respostaFinal = await gerarRespostaGemini(message);

// fallback se Gemini falhar
if (!respostaFinal || respostaFinal.startsWith("⚠️")) {
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






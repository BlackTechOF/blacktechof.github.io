const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const duckduckgo = require("duckduckgo-search"); // ✅ Lib de busca
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chat = require("../models/Chat.js");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = "segredo123";

// ==================== AUTENTICAÇÃO ====================
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token ausente" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

app.post("/auth/register", (req, res) => {
  return res.json({ message: "Registro OK (mock)" });
});

app.post("/auth/login", (req, res) => {
  const { username } = req.body;
  const token = jwt.sign({ username }, SECRET, { expiresIn: "1h" });
  return res.json({ token });
});

// ==================== GEMINI CONFIG ====================
const genAI = new GoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || "SUA_CHAVE_AQUI"
});

// ==================== CHAT ENDPOINT ====================
app.post("/chat/:chatId", authMiddleware, async (req, res) => {
  const { message } = req.body;
  let respostaFinal = "";

  try {
    // 1) Buscar na web com DuckDuckGo
    const results = await duckduckgo.search(message, { maxResults: 3 });

    if (results && results.length > 0) {
      respostaFinal = `📡 Resultado da web: ${results[0].snippet || results[0].title || results[0].url}`;
    } else {
      // 2) Se não achar nada → fallback para Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(message);
      respostaFinal = result.response.text();
    }
  } catch (err) {
    console.error("❌ Erro ao processar:", err);
    respostaFinal = "⚠️ Erro ao buscar informações.";
  }

  return res.json({ reply: respostaFinal });
});

// ==================== SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server rodando na porta ${PORT}`));



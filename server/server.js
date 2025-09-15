// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getJson } = require("serpapi"); // ✅ SerpAPI
const { GoogleGenerativeAI } = require("@google/generative-ai");
const mongoose = require("mongoose");
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

// ==================== CHAT COM SERPAPI + GEMINI ====================
app.post("/chat/:chatId", authMiddleware, async (req, res) => {
  const { message } = req.body;
  let respostaFinal = "";
  let buscouBing = false;

  try {
    const anoAtual = new Date().getFullYear();
    const anoRegex = /\b(20\d{2})\b/g;
    const anosNaPergunta = [...message.matchAll(anoRegex)].map(m => parseInt(m[1]));

    const precisaBing = anosNaPergunta.some(a => a >= anoAtual) || message.toLowerCase().includes("futuro");

    // ==================== 1) Busca web via SerpAPI se ano futuro ou 2025 ====================
    if (precisaBing) {
      try {
        const results = await getJson({
          engine: "bing",
          q: message,
          api_key: process.env.SERPAPI_KEY,
          hl: "pt-br",
          gl: "br"
        });

        if (results.organic_results && results.organic_results.length > 0) {
          respostaFinal = `🌐 Da web: ${results.organic_results[0].title} - ${results.organic_results[0].snippet}`;
          buscouBing = true;
        }
      } catch (err) {
        console.warn("⚠️ Falha na busca Bing:", err.message);
      }
    }

    // ==================== 2) Gemini só se não encontrou na web ====================
    if (!respostaFinal) {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(message);
      respostaFinal = result.response.text();
    }

    // ==================== 3) Se a resposta do Gemini for vaga, tentar Bing de novo ====================
    const respostasVagas = ["não sei", "não tenho informação", "não encontrei"];
    if (!buscouBing && respostasVagas.some(v => respostaFinal.toLowerCase().includes(v))) {
      try {
        const results = await getJson({
          engine: "bing",
          q: message,
          api_key: process.env.SERPAPI_KEY,
          hl: "pt-br",
          gl: "br"
        });

        if (results.organic_results && results.organic_results.length > 0) {
          respostaFinal = `🌐 Da web: ${results.organic_results[0].title} - ${results.organic_results[0].snippet}`;
        }
      } catch (err) {
        console.warn("⚠️ Segunda tentativa Bing falhou:", err.message);
      }
    }

    // ==================== 4) Salvar no chat ====================
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

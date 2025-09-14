import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { MongoClient, ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
const search = require("duckduckgo-search");
 // 🔎 DuckDuckGo search

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "segredo123";
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(MONGO_URI);
const dbName = "techia";

// ============ IA MOCK (troque por OpenAI, Gemini, etc.) ============
async function gerarRespostaComIA(prompt) {
  // Exemplo com OpenAI (caso queira usar)
  // const response = await fetch("https://api.openai.com/v1/chat/completions", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     "Authorization": `Bearer ${process.env.OPENAI_KEY}`
  //   },
  //   body: JSON.stringify({
  //     model: "gpt-4o-mini",
  //     messages: [{ role: "user", content: prompt }]
  //   })
  // });
  // const data = await response.json();
  // return data.choices[0].message.content.trim();

  // 🔹 Se não tiver chave, só retorna direto (pra testes)
  return `🤖 (IA simulada) ${prompt.slice(0, 150)}...`;
}

// ============ Busca na web ============
async function buscaWeb(query) {
  try {
    const results = await search(query, { maxResults: 5 });

    if (!results.length) {
      return "❌ Não encontrei nada relevante na web.";
    }

    const contexto = results
      .map(r => `${r.title}: ${r.description}`)
      .join("\n");

    const respostaIA = await gerarRespostaComIA(`
      Pergunta: ${query}
      Contexto da web:
      ${contexto}

      Responda de forma objetiva e direta com base no contexto.
      Se não achar nada útil, diga claramente que não encontrou.
    `);

    return respostaIA;
  } catch (err) {
    console.error("Erro buscaWeb:", err);
    return "⚠️ Erro ao buscar na web.";
  }
}

// ============ Middleware de autenticação ============
function autenticar(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token necessário" });

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch {
    res.status(403).json({ error: "Token inválido" });
  }
}

// ============ Rotas de Auth ============
app.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;
  const db = client.db(dbName);
  const users = db.collection("users");

  const existe = await users.findOne({ username });
  if (existe) return res.status(400).json({ error: "Usuário já existe" });

  const hash = await bcrypt.hash(password, 10);
  await users.insertOne({ username, password: hash });

  res.json({ message: "Usuário registrado com sucesso!" });
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const db = client.db(dbName);
  const users = db.collection("users");

  const user = await users.findOne({ username });
  if (!user) return res.status(400).json({ error: "Usuário não encontrado" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Senha incorreta" });

  const token = jwt.sign({ id: user._id, username }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({ token });
});

// ============ Rotas de Chat ============
app.post("/chatdb/new", autenticar, async (req, res) => {
  const db = client.db(dbName);
  const chats = db.collection("chats");

  const newChat = {
    userId: req.user.id,
    title: req.body.title || "Novo Chat",
    messages: [],
  };

  const result = await chats.insertOne(newChat);
  res.json({ ...newChat, _id: result.insertedId });
});

app.get("/chatdb/list", autenticar, async (req, res) => {
  const db = client.db(dbName);
  const chats = db.collection("chats");

  const list = await chats.find({ userId: req.user.id }).toArray();
  res.json(list);
});

app.get("/chatdb/:id", autenticar, async (req, res) => {
  const db = client.db(dbName);
  const chats = db.collection("chats");

  const chat = await chats.findOne({ _id: new ObjectId(req.params.id) });
  res.json(chat?.messages || []);
});

app.post("/chatdb/:id/save", autenticar, async (req, res) => {
  const db = client.db(dbName);
  const chats = db.collection("chats");

  const { role, content } = req.body;

  await chats.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $push: { messages: { role, content, date: new Date() } } }
  );

  res.json({ success: true });
});

// ============ Rota principal de chat ============
app.post("/chat/:id", autenticar, async (req, res) => {
  const { message } = req.body;

  let resposta;
  if (message.toLowerCase().includes("quem") || message.toLowerCase().includes("quando")) {
    resposta = await buscaWeb(message);
  } else {
    resposta = await gerarRespostaComIA(message);
  }

  // salvar no histórico
  const db = client.db(dbName);
  const chats = db.collection("chats");
  await chats.updateOne(
    { _id: new ObjectId(req.params.id) },
    {
      $push: {
        messages: [
          { role: "user", content: message, date: new Date() },
          { role: "bot", content: resposta, date: new Date() },
        ],
      },
    }
  );

  res.json({ reply: resposta });
});

// ============ Inicialização ============
app.listen(PORT, async () => {
  try {
    await client.connect();
    console.log("✅ Conectado ao MongoDB");
  } catch (err) {
    console.error("❌ Erro ao conectar MongoDB:", err);
  }
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});



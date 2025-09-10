const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });

    // 🔥 Instrução: peça respostas em Markdown
    const prompt = `
Responda usando Markdown. Se for código, use blocos \`\`\` para formatar corretamente.
Aqui está a pergunta do usuário:

${message}
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("Erro na rota /chat:", error);
    res.status(500).json({
      reply: "Ocorreu um erro ao se comunicar com a IA.",
      error: error.message,
    });
  }
});

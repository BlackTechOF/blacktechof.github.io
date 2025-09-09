const express = require("express");
const OpenAI = require("openai");
require("dotenv").config();
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { ImageAnnotatorClient } = require('@google-cloud/vision'); // Google Vision API

const app = express();
app.use(express.json());
app.use(cors());

const visionClient = new ImageAnnotatorClient({
  credentials: require("./testapifelipe-6689559d1366.json")
});


const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuração do Multer para upload de imagem
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Pasta onde as imagens serão armazenadas
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Renomeia a imagem
  },
});

const upload = multer({ storage: storage });

// Criação do cliente do Google Vision
const visionClient = new ImageAnnotatorClient();

// Rota para enviar mensagem de texto
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Você é um assistente amigável." },
        { role: "user", content: message },
      ],
    });

    res.json({
      reply: response.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      reply: "Ocorreu um erro ao se comunicar com a IA.",
      error: error.message, 
    });
  }
});

// Rota para enviar uma imagem e analisar com o Google Vision
app.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ reply: "Nenhuma imagem enviada!" });
    }

    // O arquivo foi recebido, agora podemos analisá-lo com o Google Vision
    const imagePath = path.join(__dirname, req.file.path);

    // Análise da imagem usando Google Vision API
    const [result] = await visionClient.textDetection(imagePath);
    const detections = result.textAnnotations;

    // Verificar se encontrou texto na imagem
    if (detections.length > 0) {
      const text = detections[0].description;
      res.json({
        reply: `Texto encontrado na imagem: ${text}`,
        imageUrl: `https://seu-dominio.com/${imagePath}`, // Retorna o caminho da imagem
      });
    } else {
      res.json({
        reply: "Não foi encontrado texto na imagem.",
        imageUrl: `https://seu-dominio.com/${imagePath}`,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: "Erro ao processar a imagem", error: error.message });
  }
});

// Servir arquivos estáticos (imagens, etc.)
app.use("/uploads", express.static("uploads"));

// Iniciar o servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});




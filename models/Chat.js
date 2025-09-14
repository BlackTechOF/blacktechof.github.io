const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // usuário dono do chat
  title: { type: String, default: "Novo Chat" },
  messages: [
    {
      role: { type: String, enum: ["user", "assistant"], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model("Chat", chatSchema);

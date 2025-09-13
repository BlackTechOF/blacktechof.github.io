const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: { type: String, default: "Novo Chat" }, // 🔥 título do chat
  messages: [
    {
      role: { type: String, enum: ["user", "bot"], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    }
  ]
});

module.exports = mongoose.model("Chat", ChatSchema);

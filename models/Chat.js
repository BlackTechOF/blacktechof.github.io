// models/Chat.js
const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, default: "Novo Chat" },
  messages: [
    {
      role: { type: String, enum: ["user", "bot"], required: true },
      content: { type: String, required: true }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Chat", ChatSchema);

// models/Chat.js
const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "bot"], required: true },
  content: { type: String, required: true }
}, { timestamps: true });

const ChatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, default: "Novo Chat" },
  messages: [MessageSchema]
}, { timestamps: true });

module.exports = mongoose.model("Chat", ChatSchema);

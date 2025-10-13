// models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // senha vai ser hash com bcrypt
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);

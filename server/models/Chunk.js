const mongoose = require("mongoose");
module.exports = mongoose.model("Chunk", new mongoose.Schema({
  docId: String, text: String, page: Number, embedding: [Number],
}));
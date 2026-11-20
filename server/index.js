require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();
const express = require("express"), cors = require("cors"), multer = require("multer");
const mongoose = require("mongoose");
const Chunk = require("./models/Chunk");
const { extractPages, chunkPages, embed, cosine, generate } = require("./utils/rag");

const app = express();
app.use(cors(), express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const docId = Date.now().toString();
    const chunks = chunkPages(await extractPages(req.file.buffer));
    for (const c of chunks) {
      await Chunk.create({ docId, ...c, embedding: await embed(c.text) });
    }
    res.json({ docId, chunks: chunks.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/ask", async (req, res) => {
  try {
    const { docId, question } = req.body;
    const qEmb = await embed(question);
    const chunks = await Chunk.find({ docId }).lean();
    const top = chunks
      .map((c) => ({ ...c, score: cosine(qEmb, c.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    const context = top.map((c) => `[Page ${c.page}] ${c.text}`).join("\n\n");
    const prompt = `Answer ONLY from the context. If not found, say "Not in document". Mention page numbers.\n\nContext:\n${context}\n\nQuestion: ${question}`;
    const result = await generate(prompt);

    res.json({
      answer: result.response.text(),
      sources: top.map((c) => ({ page: c.page, text: c.text.slice(0, 150) })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

mongoose.connect(process.env.MONGO_URI).then(() =>
 app.listen(process.env.PORT || 5000, () => console.log("Server running"))); 
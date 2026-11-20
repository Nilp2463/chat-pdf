const { PDFParse } = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embedder = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
const models = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-2.5-flash-lite"].map(
  (m) => genAI.getGenerativeModel({ model: m })
);

async function generate(prompt) {
  for (const m of models) {
    for (let i = 0; i < 2; i++) {
      try {
        return await m.generateContent(prompt);
      } catch (e) {
        if (!/503|429|404/.test(e.message)) throw e;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
  throw new Error("Gemini is busy, try again in a minute");
}

async function extractPages(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const r = await parser.getText();
    return r.pages.map((p) => p.text);
  } finally {
    await parser.destroy();
  }
}

function chunkPages(pages, size = 800, overlap = 100) {
  const out = [];
  pages.forEach((t, i) => {
    for (let s = 0; s < t.length; s += size - overlap) {
      const c = t.slice(s, s + size).trim();
      if (c) out.push({ text: c, page: i + 1 });
    }
  });
  return out;
}

async function embed(text) {
  const r = await embedder.embedContent(text);
  return r.embedding.values;   
}

function cosine(a, b) {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
  return d / (Math.sqrt(na) * Math.sqrt(nb));
}

module.exports = { extractPages, chunkPages, embed, cosine, generate };
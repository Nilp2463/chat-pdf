import { useState, useRef, useEffect } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function App() {
  const [docId, setDocId] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setMessages([]);
    const fd = new FormData();
    fd.append("pdf", file);
    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocId(data.docId);
      setFileName(file.name);
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
    setUploading(false);
  }

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim() || !docId || loading) return;
    const q = question;
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages((m) => [...m, { role: "bot", text: data.answer, sources: data.sources }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: "Error: " + err.message }]);
    }
    setLoading(false);
  }

  return (
    <div className="app">
      <h1>Chat with PDF</h1>
      <label className="upload">
        {uploading ? "Processing PDF..." : docId ? `Loaded: ${fileName} (click to change)` : "Upload a PDF"}
        <input type="file" accept="application/pdf" onChange={handleUpload} hidden disabled={uploading} />
      </label>

      <div className="chat">
        {messages.length === 0 && <p className="hint">{docId ? "Ask anything about your PDF." : "Upload a PDF to start."}</p>}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <p>{m.text}</p>
            {m.sources?.length > 0 && (
              <details>
                <summary>Sources</summary>
                {m.sources.map((s, j) => (
                  <div key={j} className="source"><b>Page {s.page}:</b> {s.text}...</div>
                ))}
              </details>
            )}
          </div>
        ))}
        {loading && <div className="msg bot"><p>Thinking...</p></div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleAsk} className="ask">
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question..." disabled={!docId} />
        <button disabled={!docId || loading}>Send</button>
      </form>
    </div>
  );
}
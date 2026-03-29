import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../config";

function QueryBox({ setSelectedNodeInGraph }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const formatResponse = (text) => {
    if (!text) return "No information available.";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/(#[0-9]+)/g, '<span style="color: #2563eb; font-weight: bold;">$1</span>')
      .replace(/\n/g, "<br />");
  };

  const handleSubmit = async () => {
    if (!question.trim() || loading) return;

    const userMsg = question;
    setQuestion("");
    setMessages((prev) => [...prev, { type: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg }),
      });

      if (!res.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await res.json();

      // --- CRITICAL SAFETY CHECK ---
      // Agar 'data.answer' undefined hai, toh ye fallback message dikhayega
      const finalResponse = data.answer || "I'm sorry, I couldn't process that request. Please try again.";
      const aiText = formatResponse(finalResponse);
      
      setMessages((prev) => [...prev, { type: "ai", text: aiText }]);

      if (data.nodeIds && Array.isArray(data.nodeIds)) {
        setSelectedNodeInGraph(data.nodeIds);
      } else {
        setSelectedNodeInGraph([]);
      }

    } catch (err) {
      console.error("Fetch error:", err);
      setMessages((prev) => [
        ...prev, 
        { type: "ai", text: "<strong>System Note:</strong> Connection lost. Please check if the backend is running." }
      ]);
      setSelectedNodeInGraph([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.chatArea}>
        {messages.map((m, i) => (
          <div key={i} style={m.type === "user" ? styles.userBlock : styles.aiBlock}>
            {m.type === "ai" && (
              <div style={styles.aiHeader}>
                <img src="/logo.jpg" style={styles.avatar} alt="AI" />
                <div>
                  <div style={styles.aiName}>Dodge AI</div>
                  <div style={styles.aiSub}>ERP Analyst</div>
                </div>
              </div>
            )}
            <div 
              style={m.type === "user" ? styles.userBubble : styles.aiText} 
              dangerouslySetInnerHTML={{ __html: m.text }} 
            />
            {m.type === "user" && <img src="/logo1.jpg" style={styles.userAvatar} alt="user" />}
          </div>
        ))}
        {loading && <div style={styles.statusText}>Analyzing...</div>}
        <div ref={chatEndRef} />
      </div>

      <div style={styles.inputWrapper}>
        <div style={styles.inputCard}>
          <div style={styles.statusHeader}>
            <div style={loading ? styles.dotPulse : styles.dot} />
            <span style={styles.statusLabel}>{loading ? "Tracing ERP Flow..." : "Dodge AI Active"}</span>
          </div>
          <div style={styles.inputArea}>
            <textarea
              placeholder="Analyze anything"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              style={styles.textarea}
            />
            <div style={styles.bottomRow}>
              <button 
                onClick={handleSubmit} 
                disabled={loading || !question.trim()} 
                style={{ ...styles.button, background: question.trim() ? "#1a1a1a" : "#ccc" }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", height: "100%", background: "#fafafa" },
  chatArea: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" },
  userBlock: { alignSelf: "flex-end", display: "flex", alignItems: "flex-end", gap: "8px", maxWidth: "80%" },
  userBubble: { background: "#111", color: "#fff", padding: "10px 14px", borderRadius: "14px", fontSize: "14px" },
  aiBlock: { alignSelf: "flex-start", maxWidth: "80%" },
  aiHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" },
  aiName: { fontWeight: "600", fontSize: "14px", color: "#111" },
  aiSub: { fontSize: "11px", color: "#888" },
  aiText: { 
    fontSize: "14px", 
    color: "#222", 
    background: "#fff", 
    padding: "12px", 
    borderRadius: "12px", 
    border: "1px solid #eee", 
    lineHeight: "1.6",
    whiteSpace: "pre-line"
  },
  avatar: { width: "28px", height: "28px", borderRadius: "50%" },
  userAvatar: { width: "28px", height: "28px", borderRadius: "50%" },
  inputWrapper: { padding: "15px", background: "#fff", borderTop: "1px solid #eee" },
  inputCard: { border: "1px solid #e5e7eb", borderRadius: "14px", background: "#fff" },
  statusHeader: { background: "#f9fafb", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #eee" },
  dot: { width: "8px", height: "8px", background: "#22c55e", borderRadius: "50%" },
  dotPulse: { width: "8px", height: "8px", background: "#f59e0b", borderRadius: "50%", animation: "pulse 1.5s infinite" },
  statusLabel: { fontSize: "11px", color: "#666", fontWeight: "600" },
  inputArea: { padding: "10px" },
  textarea: { width: "100%", height: "45px", border: "none", outline: "none", resize: "none", fontSize: "14px" },
  bottomRow: { display: "flex", justifyContent: "flex-end", marginTop: "5px" },
  button: { padding: "6px 15px", borderRadius: "8px", border: "none", color: "#fff", cursor: "pointer", fontWeight: "600" },
  statusText: { fontSize: "12px", color: "#999", fontStyle: "italic", marginLeft: "20px" }
};

export default QueryBox;
import { useState, useEffect, useRef } from "react";

function QueryBox({ setSelectedNodeInGraph }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const formatResponse = (text) => {
    if (!text) return "";
    let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    const idRegex = /\b\d{5,}\b/g;
    formatted = formatted.replace(idRegex, (match) => `<strong>${match}</strong>`);
    return formatted;
  };

const handleSubmit = async () => {
    if (!question.trim()) return;
    const userMsg = question;
    setQuestion("");
    setMessages((prev) => [...prev, { type: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg }),
      });

      const data = await res.json();
      console.log("RAW BACKEND DATA:", data); 

      const formattedAnswer = formatResponse(data?.answer);
      setMessages((prev) => [...prev, { type: "ai", text: formattedAnswer }]);

      // DESI JUGAAD: Agar backend nodeIds nahi bhej raha, toh chat text se chura lo
      let finalIds = data.nodeIds || [];
      if (finalIds.length === 0 && data.answer) {
        const foundIds = data.answer.match(/\b\d{5,}\b/g); // Match 5+ digit numbers
        if (foundIds) {
          finalIds = foundIds.map(id => {
            // Aapke graph ke prefix yahan match karo
            if (id.startsWith('32')) return `customer-${id}`;
            if (id.startsWith('55')) return `order-${id}`;
            if (id.startsWith('44')) return `payment-${id}`;
            return id;
          });
        }
      }

      if (finalIds.length > 0) {
        console.log("🚀 HIGHLIGHTING NODES:", finalIds);
        setSelectedNodeInGraph(finalIds); 
      }
    } catch (err) {
      console.error("FETCH ERROR:", err);
      setMessages((prev) => [...prev, { type: "ai", text: "Error fetching response." }]);
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
                  <div style={styles.aiSub}>Graph Agent</div>
                </div>
              </div>
            )}
            <div style={m.type === "user" ? styles.userBubble : styles.aiText} dangerouslySetInnerHTML={{ __html: m.text }} />
            {m.type === "user" && <img src="/logo1.jpg" style={styles.userAvatar} alt="user" />}
          </div>
        ))}
        {loading && <div style={styles.statusText}>Dodge AI is analyzing...</div>}
        <div ref={chatEndRef} />
      </div>

      <div style={styles.inputWrapper}>
        <div style={styles.inputCard}>
          <div style={styles.statusHeader}>
            <div style={loading ? styles.dotPulse : styles.dot} />
            <span style={styles.statusLabel}>{loading ? "Processing..." : "Dodge AI is awaiting instructions"}</span>
          </div>
          <div style={styles.inputArea}>
            <textarea placeholder="Analyze anything" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} style={styles.textarea} />
            <div style={styles.bottomRow}>
              <button onClick={handleSubmit} disabled={loading || !question.trim()} style={{ ...styles.button, background: question.trim() ? "#1a1a1a" : "#ccc" }}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
const styles = {
  container: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#fafafa" },
  chatArea: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" },
  userBlock: { alignSelf: "flex-end", display: "flex", alignItems: "flex-end", gap: "8px", maxWidth: "75%" },
  userBubble: { background: "#111", color: "#fff", padding: "10px 14px", borderRadius: "14px", fontSize: "14px" },
  aiBlock: { alignSelf: "flex-start", maxWidth: "75%" },
  aiHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" },
  aiName: { fontWeight: "600", fontSize: "14px", color: "#111" },
  aiSub: { fontSize: "11px", color: "#888" },
  aiText: { fontSize: "14px", color: "#222", background: "#fff", padding: "10px 14px", borderRadius: "12px", border: "1px solid #eee", lineHeight: "1.6" },
  avatar: { width: "28px", height: "28px", borderRadius: "50%" },
  userAvatar: { width: "28px", height: "28px", borderRadius: "50%" },
  inputWrapper: { padding: "12px 20px", background: "#fff", borderTop: "1px solid #eee" },
  inputCard: { border: "1px solid #e5e7eb", borderRadius: "14px", background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" },
  statusHeader: { background: "#f9fafb", padding: "8px 12px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #eee" },
  dot: { width: "8px", height: "8px", background: "#22c55e", borderRadius: "50%" },
  dotPulse: { width: "8px", height: "8px", background: "#f59e0b", borderRadius: "50%", animation: "pulse 1.5s infinite" },
  statusLabel: { fontSize: "12px", color: "#666", fontWeight: "500" },
  inputArea: { padding: "10px" },
  textarea: { width: "100%", height: "50px", border: "none", outline: "none", resize: "none", fontSize: "14px", fontFamily: "inherit" },
  bottomRow: { display: "flex", justifyContent: "flex-end", marginTop: "6px" },
  button: { padding: "8px 18px", borderRadius: "10px", border: "none", background: "#111", color: "#fff", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  statusText: { fontSize: "12px", color: "#999", marginTop: "4px", fontStyle: "italic" }
};

export default QueryBox;

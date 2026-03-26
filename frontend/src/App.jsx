import { useState, useRef, useCallback } from "react";
import QueryBox from "./components/QueryBox";
import GraphView from "./components/GraphView";
import { Minimize2, Maximize2, PanelLeft, Layers } from "lucide-react";

function App() {
  const [highlightIds, setHighlightIds] = useState([]);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [queryNodes, setQueryNodes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const graphRef = useRef(null);

  // Optimized Highlight Handler
  const handleHighlightFromChat = useCallback((nodeIds) => {
    console.log("APP RECEIVED IDs:", nodeIds); 

    if (!nodeIds || nodeIds.length === 0) {
      setHighlightIds([]);
      setQueryNodes([]);
      setCurrentNodeId(null);
      setCurrentIndex(0);
      return;
    }

    const ids = nodeIds.map(id => String(id));
    
    // Sabse pehle saare nodes ko highlight list mein daalo (Tracing ke liye)
    setHighlightIds(ids);
    setQueryNodes(ids);
    setCurrentIndex(0);
    
    // Current focus pehla node hoga
    setCurrentNodeId(ids[0]);

    // Graph ko focus karne ke liye thoda delay (rendering safety)
    setTimeout(() => {
      if (graphRef.current?.focusNode) {
        graphRef.current.focusNode(ids[0]);
      }
    }, 100);
  }, []);

  const goNext = () => {
    if (currentIndex + 1 >= queryNodes.length) return;
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    const nextNodeId = queryNodes[nextIndex];
    setCurrentNodeId(nextNodeId);
    graphRef.current?.focusNode(nextNodeId);
  };

  const goPrev = () => {
    if (currentIndex - 1 < 0) return;
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    const prevNodeId = queryNodes[prevIndex];
    setCurrentNodeId(prevNodeId);
    graphRef.current?.focusNode(prevNodeId);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <PanelLeft size={18} />
          <div style={styles.verticalDivider} />
          <span style={styles.breadcrumb}>
            <span style={{ color: "#70757a" }}>Mapping</span>
            <span style={{ margin: "0 8px", color: "#70757a" }}>/</span>
            <span style={{ color: "#1a1a1a", fontWeight: "600" }}>Order to Cash</span>
          </span>
        </div>
      </div>
      
      <div style={styles.main}>
        {!isMinimized && (
          <div style={styles.graphBox}>
            <div style={styles.topBtnsLeft}>
              <button style={btnStyle} onClick={() => setIsMinimized(true)}>
                <Minimize2 size={16} /> Minimize
              </button>
              <button 
                style={{ ...btnStyle, background: showOverlay ? "#000" : "#fff", color: showOverlay ? "#fff" : "#000" }} 
                onClick={() => setShowOverlay(!showOverlay)}
              >
                <Layers size={16} /> {showOverlay ? "Hide Overlay" : "Show Overlay"}
              </button>
            </div>

            {/* Passing all necessary props to GraphView */}
            <GraphView 
              ref={graphRef} 
              view="detailed" 
              highlightIds={highlightIds} 
              showOverlay={showOverlay} 
              currentNodeId={currentNodeId} 
            />

            {/* Navigation UI for multiple highlighted nodes */}
            {queryNodes.length > 1 && (
              <div style={styles.navContainer}>
                <div style={styles.navBtns}>
                  <button onClick={goPrev} disabled={currentIndex === 0} style={navBtnStyle}>Prev</button>
                  <span style={styles.navCount}>{currentIndex + 1} / {queryNodes.length}</span>
                  <button onClick={goNext} disabled={currentIndex === queryNodes.length - 1} style={navBtnStyle}>Next</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={styles.rightPanel}>
          {isMinimized && (
            <div style={{ padding: "10px" }}>
              <button style={btnStyle} onClick={() => setIsMinimized(false)}>
                <Maximize2 size={16} /> Expand Graph
              </button>
            </div>
          )}
          
          <div style={styles.chatHeaderArea}>
            <div style={styles.chatTitleSection}>
              <h3 style={styles.chatTitle}>Chat with Graph</h3>
              <p style={styles.chatSubtitle}>Order to Cash System</p>
            </div>
            <div style={styles.agentInfoRow}>
              <div style={styles.avatarBox}>
                <img src="/logo.jpg" style={styles.avatarImg} alt="Dodge AI" />
              </div>
              <div>
                <div style={styles.agentNameText}>Dodge AI</div>
                <div style={styles.agentRoleText}>ERP Graph Agent</div>
              </div>
            </div>
            <div style={styles.welcomeMessage}>
              Hi! I can help you analyze the <span style={{fontWeight: '700'}}>Order to Cash</span> process.
            </div>
          </div>

          <div style={styles.bottomSection}>
            {/* Prop name matches handleHighlightFromChat */}
            <QueryBox setSelectedNodeInGraph={handleHighlightFromChat} />
          </div>
        </div>
      </div>
    </div>
  );
}
// STYLES
const btnStyle = { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", fontSize: "12px", cursor: "pointer", fontWeight: "600" };
const navBtnStyle = { padding: "4px 12px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "12px" };
const styles = {
  container: { height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: 'Inter, sans-serif' },
  header: { height: "52px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", padding: "0 20px" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  verticalDivider: { width: "1px", height: "20px", background: "#e2e8f0" },
  breadcrumb: { fontSize: "14px" },
  main: { flex: 1, display: "flex", overflow: "hidden" },
  graphBox: { flex: 1, position: "relative", background: "#fff", margin: "10px", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" },
  topBtnsLeft: { position: "absolute", top: "20px", left: "20px", zIndex: 100, display: "flex", gap: "10px" },
  rightPanel: { width: "400px", display: "flex", flexDirection: "column", background: "#fff", borderLeft: "1px solid #e2e8f0" },
  chatHeaderArea: { padding: "20px", borderBottom: "1px solid #f1f5f9" },
  chatTitleSection: { marginBottom: "20px" },
  chatTitle: { fontSize: "16px", margin: 0, fontWeight: "600", color: "#1a1a1a" },
  chatSubtitle: { fontSize: "13px", margin: "4px 0 0 0", color: "#70757a" },
  agentInfoRow: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" },
  avatarBox: { width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", border: "1px solid #eee" },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  agentNameText: { fontSize: "14px", fontWeight: "700", color: "#1a1a1a" },
  agentRoleText: { fontSize: "12px", color: "#70757a" },
  welcomeMessage: { fontSize: "14px", color: "#1a1a1a", lineHeight: "1.5", marginTop: "12px" },
  navContainer: { position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 10 },
  navBtns: { background: "#fff", padding: "8px 16px", borderRadius: "50px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  navCount: { fontSize: "13px", fontWeight: "700" },
  bottomSection: { flex: 1, overflow: "hidden" }
};

export default App;
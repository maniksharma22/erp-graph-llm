import { useState, useRef, useCallback, useEffect } from "react";
import QueryBox from "./components/QueryBox";
import GraphView from "./components/GraphView";
import { Minimize2, Maximize2, PanelLeft, Layers } from "lucide-react";
import { API_BASE_URL } from "./config";

function App() {
  const [highlightIds, setHighlightIds] = useState([]);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [graphData, setGraphData] = useState(null);
  const [actualCount, setActualCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [matchedNodes, setMatchedNodes] = useState([]);

  const graphRef = useRef(null);

  useEffect(() => {
    const loadGraph = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/graph?view=detailed`);
        const data = await res.json();
        setGraphData(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadGraph();
  }, []);


 const handleHighlightFromChat = useCallback((nodeIds) => {
  if (!nodeIds || nodeIds.length === 0) {
    setHighlightIds([]);
    setMatchedNodes([]);
    return;
  }

  const cleanIds = nodeIds.map(id => String(id).trim());
  setHighlightIds(cleanIds);

  setTimeout(() => {
    if (graphRef.current?.focusNodes) {
      const found = graphRef.current.focusNodes(cleanIds); 
      if (found && found.length > 0) {
        setMatchedNodes(found); 
        setCurrentIndex(0);    
        setCurrentNodeId(found[0].id); 
      }
    }
  }, 100); 
}, []);

  const goNext = () => {
    if (currentIndex + 1 < matchedNodes.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setCurrentNodeId(matchedNodes[nextIdx].id);
      if (graphRef.current?.focusNode) graphRef.current.focusNode(matchedNodes[nextIdx].id);
    }
  };

  const goPrev = () => {
    if (currentIndex - 1 >= 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setCurrentNodeId(matchedNodes[prevIdx].id);
      if (graphRef.current?.focusNode) graphRef.current.focusNode(matchedNodes[prevIdx].id);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ cursor: "pointer", display: "flex", color: isSidebarOpen ? "#1a1a1a" : "#3b82f6" }}>
            <PanelLeft size={18} />
          </div>
          <div style={styles.verticalDivider} />
          <span style={styles.breadcrumb}>
            <span style={{ color: "#70757a" }}>Mapping</span>
            <span style={{ margin: "0 8px", color: "#70757a" }}>/</span>
            <span style={{ color: "#1a1a1a", fontWeight: "600" }}>Order to Cash</span>
          </span>
        </div>
      </div>

      <div style={styles.main}>
        <div style={{
          ...styles.graphBox,
          flex: isMinimized ? "1 1 100%" : (isSidebarOpen ? "0 0 calc(100% - 480px)" : "1 1 100%"),
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          margin: isMinimized || !isSidebarOpen ? "0px" : "10px",
          borderRadius: isMinimized || !isSidebarOpen ? "0px" : "12px"
        }}>
          <div style={styles.topBtnsLeft}>
            <button style={btnStyle} onClick={() => setIsMinimized(!isMinimized)}>
              {isMinimized ? <><Maximize2 size={16} /> Maximize Chat</> : <><Minimize2 size={16} /> Minimize Chat</>}
            </button>
            <button style={{ ...btnStyle, background: showOverlay ? "#000" : "#fff", color: showOverlay ? "#fff" : "#000" }} onClick={() => setShowOverlay(!showOverlay)}>
              <Layers size={16} /> {showOverlay ? "Hide Granular Overlay" : "Show Granular Overlay"}
            </button>
          </div>

          {graphData && <GraphView ref={graphRef} view="detailed" data={graphData} highlightIds={highlightIds} currentNodeId={currentNodeId} showOverlay={showOverlay} onCountChange={setActualCount} />}

          {highlightIds.length > 0 && matchedNodes.length > 1 && (
            <div style={styles.navContainer}>
              <div style={styles.navBtns}>
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  style={{ ...navBtnStyle, opacity: currentIndex === 0 ? 0.5 : 1 }}
                >
                  Prev
                </button>

                {/* Divider line for clean look */}
                <div style={{ width: "1px", height: "16px", background: "#e2e8f0" }} />

                <button
                  onClick={goNext}
                  disabled={currentIndex >= matchedNodes.length - 1}
                  style={{ ...navBtnStyle, opacity: currentIndex >= matchedNodes.length - 1 ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {!isMinimized && isSidebarOpen && (
          <div style={styles.rightPanel}>
            <div style={styles.chatHeaderArea}>
              <div style={styles.chatTitleSection}>
                <h3 style={styles.chatTitle}>Chat with Graph</h3>
                <p style={styles.chatSubtitle}>Order to Cash System</p>
              </div>
              <div style={styles.agentInfoRow}>
                <div style={styles.avatarBox}><img src="/logo.jpg" style={styles.avatarImg} alt="Dodge AI" /></div>
                <div><div style={styles.agentNameText}>Dodge AI</div><div style={styles.agentRoleText}>ERP Graph Agent</div></div>
              </div>
              <div style={styles.welcomeMessage}>Hi! I can help you analyze the <span style={{ fontWeight: "700" }}>Order to Cash</span> process.</div>
            </div>
            <div style={styles.bottomSection}><QueryBox setSelectedNodeInGraph={handleHighlightFromChat} /></div>
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle = { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", fontSize: "12px", cursor: "pointer", fontWeight: "600" };
const navBtnStyle = {
  padding: "6px 16px",
  borderRadius: "6px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600",
  color: "#1a1a1a",
  transition: "all 0.2s ease"
};
const styles = {
  container: { height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "Inter, sans-serif" },
  header: { height: "52px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", padding: "0 20px" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  verticalDivider: { width: "1px", height: "20px", background: "#e2e8f0" },
  breadcrumb: { fontSize: "16px" },
  main: { flex: 1, display: "flex", overflow: "hidden" },
  graphBox: { position: "relative", background: "#fff", overflow: "hidden", transition: "all 0.3s ease", display: "flex", flexDirection: "column" },
  topBtnsLeft: { position: "absolute", top: "20px", left: "20px", zIndex: 100, display: "flex", gap: "10px" },
  rightPanel: { flex: "0 0 480px", display: "flex", flexDirection: "column", background: "#fff", borderLeft: "1px solid #e2e8f0", overflow: "hidden", },
  chatHeaderArea: { padding: "15px 20px 10px 20px", borderBottom: "1px solid #f1f5f9" },
  chatTitleSection: { marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid #f1f5f9" },
  chatTitle: { fontSize: "18px", margin: 0, fontWeight: "600", color: "#1a1a1a" },
  chatSubtitle: { fontSize: "13px", margin: "4px 0 0 0", color: "#70757a" },
  agentInfoRow: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" },
  avatarBox: { width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", border: "1px solid #eee" },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  agentNameText: { fontSize: "18px", fontWeight: "700", color: "#1a1a1a" },
  agentRoleText: { fontSize: "13px", color: "#70757a" },
  welcomeMessage: { fontSize: "16px", color: "#1a1a1a", lineHeight: "1.5", marginTop: "12px" },
  navContainer: { position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 10 },
  navBtns: {
    background: "#fff",
    padding: "6px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)"
  },
  navCount: { fontSize: "13px", fontWeight: "700" },
  bottomSection: { flex: 1, overflow: "hidden" },
};

export default App;

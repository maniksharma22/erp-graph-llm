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
    const allNodeIds = graphData?.nodes?.map(n => String(n.id).trim()) || [];
    console.log("App received IDs from Chat:", nodeIds);

    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      setHighlightIds([]);
      setCurrentIndex(0);
      setCurrentNodeId(null);
      return;
    }

    const finalIds = [...new Set(nodeIds.map(id => String(id).trim()).filter(id => allNodeIds.includes(id)))];
    setHighlightIds(finalIds);
    setShowOverlay(true);
    setCurrentIndex(0);
    setCurrentNodeId(finalIds[0]);

    if (graphRef.current?.focusNodes) {
      graphRef.current.focusNodes(finalIds);
    } else if (graphRef.current?.focusNode) {
      graphRef.current.focusNode(finalIds[0]);
    }
 }, [graphData]);

  const goNext = () => {
    if (currentIndex + 1 < highlightIds.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setCurrentNodeId(highlightIds[nextIdx]);
      if (graphRef.current?.focusNext) {
        graphRef.current.focusNext();
      }
    }
  };

  const goPrev = () => {
    if (currentIndex - 1 >= 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setCurrentNodeId(highlightIds[prevIdx]);
      if (graphRef.current?.focusPrev) {
        graphRef.current.focusPrev();
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: isSidebarOpen ? "#1a1a1a" : "#3b82f6",
              transition: "color 0.2s",

            }}
          >
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
        <div
          style={{
            ...styles.graphBox,
            flex: isSidebarOpen ? "0 0 calc(100% - 500px)" : "1 1 100%",
            margin: isSidebarOpen ? "10px" : "0px",
            borderRadius: isSidebarOpen ? "12px" : "0px"
          }}
        >
          <div style={styles.topBtnsLeft}>
            {!isMinimized && (
              <>
                <button style={btnStyle} onClick={() => setIsMinimized(true)}>
                  <Minimize2 size={16} /> Minimize
                </button>
                <button
                  style={{
                    ...btnStyle,
                    background: showOverlay ? "#000" : "#fff",
                    color: showOverlay ? "#fff" : "#000",
                  }}
                  onClick={() => setShowOverlay(!showOverlay)}
                >
                  <Layers size={16} /> {showOverlay ? "Hide Granular Overlay" : "Show Granular Overlay"}
                </button>
              </>
            )}
          </div>

          {graphData && !isMinimized && (
            <GraphView
              ref={graphRef}
              view="detailed"
              data={graphData}
              highlightIds={highlightIds}
              currentNodeId={currentNodeId}
              showOverlay={showOverlay}
              onCountChange={setActualCount}
            />
          )}

          {highlightIds.length > 0 && !isMinimized && (
            <div style={styles.navContainer}>
              <div style={styles.navBtns}>
                <button onClick={goPrev} disabled={currentIndex === 0} style={navBtnStyle}>Prev</button>
                <span style={styles.navCount}>
                  {highlightIds.length > 0 ? currentIndex + 1 : 0} / {highlightIds.length}
                </span>
                <button
                  onClick={goNext}
                  disabled={currentIndex >= highlightIds.length - 1}
                  style={navBtnStyle}
                >Next</button>
              </div>
            </div>
          )}
        </div>

        {isSidebarOpen && (
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
                Hi! I can help you analyze the <span style={{ fontWeight: "700" }}>Order to Cash</span> process.
              </div>
            </div>
            <div style={styles.bottomSection}>
              <QueryBox setSelectedNodeInGraph={handleHighlightFromChat} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const btnStyle = { display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", fontSize: "12px", cursor: "pointer", fontWeight: "600" };
const navBtnStyle = { padding: "4px 12px", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "12px" };

const styles = {
  container: { height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "Inter, sans-serif" },
  header: { height: "52px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", padding: "0 20px" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  verticalDivider: { width: "1px", height: "20px", background: "#e2e8f0" },
  breadcrumb: { fontSize: "16px" },
  main: { flex: 1, display: "flex", overflow: "hidden", height: "100%", minHeight: 0 },
  graphBox: { flex: 1, position: "relative", background: "#fff", overflow: "hidden", transition: "all 0.3s ease", display: "flex", flexDirection: "column", width: "auto", height: "100%", minHeight: 0 },
  topBtnsLeft: { position: "absolute", top: "20px", left: "20px", zIndex: 100, display: "flex", gap: "10px" },
  rightPanel: { width: "500px", display: "flex", flexDirection: "column", background: "#fff", borderLeft: "1px solid #e2e8f0" },
  chatHeaderArea: { padding: "20px", borderBottom: "1px solid #f1f5f9" },
  chatTitleSection: { marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #f1f5f9" },
  chatTitle: { fontSize: "20px", margin: 0, fontWeight: "600", color: "#1a1a1a" },
  chatSubtitle: { fontSize: "14px", margin: "4px 0 0 0", color: "#70757a" },
  agentInfoRow: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" },
  avatarBox: { width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", border: "1px solid #eee" },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  agentNameText: { fontSize: "18px", fontWeight: "700", color: "#1a1a1a" },
  agentRoleText: { fontSize: "13px", color: "#70757a" },
  welcomeMessage: { fontSize: "16px", color: "#1a1a1a", lineHeight: "1.5", marginTop: "12px" },
  navContainer: { position: "absolute", bottom: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 10 },
  navBtns: { background: "#fff", padding: "8px 16px", borderRadius: "50px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  navCount: { fontSize: "13px", fontWeight: "700" },
  bottomSection: { flex: 1, overflow: "hidden" },
};

export default App;
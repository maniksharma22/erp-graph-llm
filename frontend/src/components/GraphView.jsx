import { useState, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback } from "react";
import ReactFlow, { 
  Controls, 
  Background, 
  ReactFlowProvider, 
  useReactFlow, 
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges 
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import { API_BASE_URL } from "../config"; // ✅ Config se URL import kiya

const nodeWidth = 200;
const nodeHeight = 60;

const getLayoutedElements = (nodes, edges) => {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 100, ranksep: 300 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => g.setNode(n.id, { width: nodeWidth, height: nodeHeight }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const pos = g.node(n.id);
    return { 
      ...n, 
      position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
      targetPosition: 'left',
      sourcePosition: 'right'
    };
  });
};

const InnerGraph = forwardRef(({ currentNodeId, highlightIds = [], showOverlay = true }, ref) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);
  const { setCenter, fitView, getViewport } = useReactFlow();

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  useEffect(() => {
    const loadData = async () => {
      try {
        // ✅ Ab ye fetch hamesha sahi Render URL par jayega
        const url = `${API_BASE_URL}/api/graph?view=detailed`;
        const res = await fetch(url);
        const data = await res.json();
        
        const initialNodes = data.nodes.map(n => ({
          id: String(n.id),
          data: { label: n.label, meta: n.meta || {} },
          position: { x: 0, y: 0 }
        }));

        const initialEdges = data.edges.map((e, i) => ({
          id: `e-${i}`,
          source: String(e.source),
          target: String(e.target),
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
        }));

        setNodes(getLayoutedElements(initialNodes, initialEdges));
        setEdges(initialEdges);
        setTimeout(() => fitView({ padding: 0.5 }), 100);
      } catch (err) { console.error("GRAPH FETCH ERROR:", err); }
    };
    loadData();
  }, [fitView]);

  const isMatch = (nodeId, searchIds) => {
    if (!nodeId || !searchIds) return false;
    const targets = Array.isArray(searchIds) ? searchIds : [searchIds];
    return targets.some(id => String(nodeId).includes(String(id).split('-').pop()));
  };

  useImperativeHandle(ref, () => ({
    focusNode: (id) => {
      const node = nodes.find(n => isMatch(n.id, id));
      if (node) setCenter(node.position.x + nodeWidth/2, node.position.y + nodeHeight/2, { zoom: 1.2, duration: 800 });
    }
  }));

  const activeNode = useMemo(() => 
    nodes.find(n => n.id === hoveredNode || isMatch(n.id, highlightIds)),
    [nodes, hoveredNode, highlightIds]
  );

  const getBoxStyle = () => {
    if (!activeNode) return { display: 'none' };
    const { x: vX, y: vY, zoom } = getViewport();
    return {
      position: 'absolute',
      left: `${(activeNode.position.x + nodeWidth) * zoom + vX + 20}px`,
      top: `${activeNode.position.y * zoom + vY - 20}px`,
      width: "280px",
      background: "white",
      borderRadius: "12px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
      zIndex: 1000,
      border: "1px solid #3b82f6",
      pointerEvents: "none"
    };
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes.map(n => {
          const highlighted = isMatch(n.id, highlightIds) || n.id === hoveredNode;
          return {
            ...n,
            style: {
              background: '#fff', borderRadius: '8px', padding: '10px', width: nodeWidth,
              border: highlighted ? '3px solid #3b82f6' : '1px solid #cbd5e1',
              boxShadow: highlighted ? '0 0 20px rgba(59, 130, 246, 0.4)' : 'none',
              fontWeight: 'bold', textAlign: 'center'
            }
          }
        })}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={(_, n) => setHoveredNode(n.id)}
        onNodeMouseLeave={() => setHoveredNode(null)}
      >
        <Background variant="dots" gap={12} size={1} />
        <Controls />
      </ReactFlow>

      {activeNode && (
        <div style={getBoxStyle()}>
          <div style={{ background: '#3b82f6', color: 'white', padding: '10px', borderRadius: '10px 10px 0 0' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{activeNode.data.label}</div>
          </div>
          <div style={{ padding: '10px' }}>
            {Object.entries(activeNode.data.meta || {}).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
                <span style={{ color: '#64748b', fontWeight: 'bold' }}>{k.toUpperCase()}:</span>
                <span style={{ fontWeight: 'bold' }}>{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default forwardRef((props, ref) => (
  <ReactFlowProvider><InnerGraph ref={ref} {...props} /></ReactFlowProvider>
));
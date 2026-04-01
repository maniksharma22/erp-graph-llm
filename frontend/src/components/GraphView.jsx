import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback, useMemo } from "react";
import ReactFlow, {
  Controls,
  Background,
  ReactFlowProvider,
  MarkerType,
  useReactFlow,
  MiniMap,
  Handle,
  Position,
  BezierEdge
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

const NODE_WIDTH = 250;
const NODE_HEIGHT = 70;

const matchNode = (node, highlightIds) => {
  if (!highlightIds || highlightIds.length === 0) return false;

  const nodeId = String(node.id).toLowerCase();
  const nodeValue = String(node.data?.value || "").toLowerCase();

  return highlightIds.some(hId => {
    const search = String(hId).toLowerCase().trim();
    return nodeId.includes(search) || nodeValue.includes(search);
  });
};

const CustomNode = ({ data, style }) => (
  <div style={{
    ...style,
    minWidth: NODE_WIDTH,
    minHeight: NODE_HEIGHT,
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "12px",
    borderRadius: "8px",
    visibility: "visible",
    opacity: style?.opacity ?? 1
  }}>
    <Handle type="target" position={Position.Left} style={{ visibility: "hidden" }} />
    <div style={{ pointerEvents: "none" }}>
      {data.label}
    </div>
    <Handle type="source" position={Position.Right} style={{ visibility: "hidden" }} />
  </div>
);

const nodeTypes = { custom: CustomNode };
const edgeTypes = {
  customBezier: BezierEdge,
};

const layoutElements = (nodes, edges) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "LR", nodesep: 100, ranksep: 520 });

  nodes.forEach((n) => {
    dagreGraph.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((e) => {
    dagreGraph.setEdge(e.source, e.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((n) => {
    const nodeWithPosition = dagreGraph.node(n.id);
    return {
      ...n,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });
};

const createNode = (id, type, value, accentColor, rawData) => ({
  id,
  type: 'custom',
  data: {
    label: (
      <div style={{ display: "flex", flexDirection: "column", pointerEvents: "none" }}>
        <div style={{ fontSize: "10px", color: accentColor, fontWeight: "800", textTransform: "uppercase", marginBottom: "2px" }}>{type}</div>
        <div style={{ fontSize: "12px", color: "#1e293b", fontWeight: "700", lineHeight: "1.2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      </div>
    ),
    type,
    value,
    accentColor,
    rawData,
  },
  style: {
    border: `1.5px solid ${accentColor}`,
    width: NODE_WIDTH,
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
  },
});

const createEdge = (source, target) => ({
  id: `e-${source}-${target}`,
  source,
  target,
  type: 'customBezier',
  animated: true,
  style: {
    stroke: "#94a3b8",
    strokeWidth: 2,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#94a3b8"
  },
});

const GraphContent = forwardRef((props, ref) => {
  const { highlightIds = [], currentNodeId, onCountChange, showOverlay = true } = props;
  const relevantHighlightIds = useMemo(() =>
    highlightIds.map(id => String(id).trim()),
    [highlightIds]
  );
  const { fitView, setCenter, getNode } = useReactFlow();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);
  const cursorRef = useRef({ x: 0, y: 0 });
  const tooltipRef = useRef(null);
  const [focusIndex, setFocusIndex] = useState(0);

  const highlightedNodesList = useMemo(() => {
    if (!relevantHighlightIds || relevantHighlightIds.length === 0 || nodes.length === 0) return [];
    return nodes.filter((n) => matchNode(n, relevantHighlightIds));
  }, [nodes, relevantHighlightIds]);

  useEffect(() => {
    if (nodes.length > 0 && highlightIds.length > 0) {
      console.log("Re-evaluating highlights after nodes load");
    }
  }, [nodes]);

  useEffect(() => {
    console.log("highlightIds:", highlightIds);
    console.log("matched:", highlightedNodesList);
  }, [highlightIds, highlightedNodesList]);

  useEffect(() => {
    if (onCountChange) {
      onCountChange(highlightedNodesList.length);
    }
  }, [highlightedNodesList]);

  useEffect(() => {
    setFocusIndex(0);
  }, [highlightedNodesList]);


  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:10000/api/graph?view=detailed");
      const data = await response.json();
      if (!data || !data.orders) return;

      const nodeMap = new Map();
      const edgeMap = new Map();

      // Trackers to prevent duplicate nodes for the same entity
      const processedCustomers = new Set();
      const processedAddresses = new Set();
      const processedOrders = new Set();

      const safeAddNode = (id, type, val, color, raw) => {
        if (!id || id.includes('undefined')) return;
        if (!nodeMap.has(id)) {
          nodeMap.set(id, createNode(id, type, val, color, raw));
        }
      };

      const safeAddEdge = (src, tgt) => {
        if (!src || !tgt || src.includes('undefined') || tgt.includes('undefined')) return;
        const edgeId = `e-${src}-${tgt}`; // Unique ID for each path
        if (!edgeMap.has(edgeId)) {
          edgeMap.set(edgeId, createEdge(src, tgt));
        }
      };

      const uniqueCustomerIds = [...new Set(data.orders.map(o => String(o.soldToParty)))];

      const matchedOrders = data.orders.filter(o =>
        highlightIds.includes(String(o.salesOrder))
      );

      const ordersToRender = relevantHighlightIds.length > 0
        ? data.orders.filter(o =>
          relevantHighlightIds.some(id =>
            id.includes(String(o.salesOrder)) || id.includes(String(o.soldToParty))
          )
        )
        : data.orders.slice(0, 15);
      ordersToRender.forEach((order) => {
        const oId = String(order.salesOrder);
        const cId = String(order.soldToParty);

        if (!processedCustomers.has(cId)) {
          const addr = (data.addresses || []).find(a => String(a.businessPartner) === cId);
          safeAddNode(`cust-${cId}`, "Customer", cId, "#10b981", { ...order, ...addr });
          processedCustomers.add(cId);
        }

        if (!processedOrders.has(oId)) {
          safeAddNode(`order-${oId}`, "Sales Order", oId, "#3b82f6", order);
          safeAddEdge(`cust-${cId}`, `order-${oId}`);
          processedOrders.add(oId);
        }

        const pay = (data.payments || []).find(p => String(p.salesOrder) === oId);
        if (pay) {
          const payId = `pay-${pay.accountingDocument}`;
          safeAddNode(payId, "Payment", pay.accountingDocument, "#22c55e", pay);
          safeAddEdge(`order-${oId}`, payId);
        }

        const items = (data.orderItems || []).filter(it => String(it.salesOrder) === oId);
        items.forEach(item => {
          const prodId = String(item.product || item.material);
          const pNodeId = `prod-${oId}-${prodId}`;
          const desc = (data.descriptions || []).find(d => String(d.product) === prodId);
          safeAddNode(pNodeId, "Product", desc ? desc.productDescription : prodId, "#ec4899", item);
          safeAddEdge(`order-${oId}`, pNodeId);

          const plantId = String(item.plant);
          if (plantId !== 'undefined') {
            const plantNodeId = `plant-${oId}-${plantId}`;
            safeAddNode(plantNodeId, "Plant", plantId, "#f43f5e", item);
            safeAddEdge(pNodeId, plantNodeId);

            const sloc = (data.storageLocs || []).find(s => String(s.plant) === plantId);
            if (sloc) {
              const slocId = `sloc-${oId}-${plantId}-${sloc.storageLocation}`;
              safeAddNode(slocId, "Storage Loc", sloc.storageLocation, "#06b6d4", sloc);
              safeAddEdge(plantNodeId, slocId);
            }
          }
        });

        const del = (data.deliveries || []).find(d => String(d.salesOrder) === oId);
        if (del) {
          const dId = `del-${del.outboundDelivery}`;
          safeAddNode(dId, "Delivery", del.outboundDelivery, "#8b5cf6", del);
          safeAddEdge(`order-${oId}`, dId);

          const bill = (data.billings || []).find(b => String(b.outboundDelivery) === del.outboundDelivery);
          if (bill) {
            const bId = `bill-${bill.billingDocument}`;
            safeAddNode(bId, "Invoice", bill.billingDocument, "#f59e0b", bill);
            safeAddEdge(dId, bId);

            const journal = (data.journals || []).find(j => String(j.referenceDocument) === bill.billingDocument);
            if (journal) {
              const jId = `journal-${journal.accountingDocument}`;
              safeAddNode(jId, "Journal Entry", journal.accountingDocument, "#ef4444", journal);
              safeAddEdge(bId, jId);
            }
          }
        }
      });

      const layoutedNodes = layoutElements(Array.from(nodeMap.values()), Array.from(edgeMap.values()));
      setNodes(layoutedNodes);
      setEdges(Array.from(edgeMap.values()));
      setTimeout(() => fitView({ padding: 0.5, duration: 1000 }), 200);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  }, [fitView]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (highlightIds.length > 1 && nodes.length > 0) {
      const highlightedNodes = nodes.filter(n => matchNode(n, relevantHighlightIds));
      if (highlightedNodes.length > 0) {
        fitView({
          nodes: highlightedNodes,
          padding: 0.3,
          duration: 800
        });
      }
    }
  }, [highlightIds, nodes, fitView]);

  useEffect(() => {
    setFocusIndex(0);
  }, [highlightIds]);

  useImperativeHandle(ref, () => ({
    focusNodes: (ids) => {
      const cleanIds = ids.map(id => String(id).trim());
      const matched = nodes.filter(n => matchNode(n, cleanIds));
      if (matched.length > 0) {
        fitView({ nodes: matched, padding: 0.4, duration: 400 });
        setHoveredNode(matched[0]);
      }
      return matched;
    },
    focusNode: (nodeId) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, { zoom: 1.6, duration: 800 });
        setHoveredNode(node);
      }
    },
    getNodeScreenPos: (nodeId) => {
      const el = document.querySelector(`[data-id="${nodeId}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        return { x: rect.right + 20, y: rect.top };
      }
      return null;
    }
  }));

  const styledNodes = useMemo(() => {
    const hasHighlights = relevantHighlightIds.length > 0;
    return nodes.map((n) => {
      const isHighlighted = hasHighlights && matchNode(n, relevantHighlightIds);
      return {
        ...n,
        style: {
          ...n.style,
          opacity: !hasHighlights ? 1 : (isHighlighted ? 1 : 0.05),
          boxShadow: isHighlighted ? `0 0 25px ${n.data.accentColor}` : "none",
          border: isHighlighted ? `3px solid ${n.data.accentColor}` : n.style.border,
          zIndex: isHighlighted ? 1000 : 1
        },
      };
    });
  }, [nodes, relevantHighlightIds]);

  const styledEdges = useMemo(() => {
    const hasHighlights = relevantHighlightIds.length > 0;
    return edges.map((e) => {
      const sNode = nodes.find(n => n.id === e.source);
      const tNode = nodes.find(n => n.id === e.target);
      const isPathActive = hasHighlights && matchNode(sNode, relevantHighlightIds) && matchNode(tNode, relevantHighlightIds);

      return {
        ...e,
        animated: isPathActive,
        style: {
          stroke: isPathActive ? "#3b82f6" : (hasHighlights ? "#f1f5f9" : "#cbd5e1"),
          strokeWidth: isPathActive ? 4 : 2,
          opacity: hasHighlights ? (isPathActive ? 1 : 1.8) : 1.6,
        },
      };
    });
  }, [edges, nodes, relevantHighlightIds]);

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative", flex: 1 }}
      onMouseMove={(e) => {
        cursorRef.current = { x: e.clientX, y: e.clientY };
        if (hoveredNode && tooltipRef.current && highlightIds.length === 0) {
          tooltipRef.current.style.left = `${e.clientX + 20}px`;
          tooltipRef.current.style.top = `${e.clientY + 20}px`;
        }
      }}
    >
      <div style={{ width: "100%", height: "100%" }}>
        <ReactFlow
          nodes={styledNodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeMouseEnter={(_, node) => setHoveredNode(node)}
          onNodeMouseLeave={() => { if (highlightIds.length === 0) setHoveredNode(null); }}
          onNodeClick={(event, node) => setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, { zoom: 1.5, duration: 800 })}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant="dots" gap={20} color="#e2e8f0" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeStrokeColor={(n) => n.data.accentColor}
            nodeColor={(n) => n.data.accentColor}
            style={{ height: 120, background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px" }}
            zoomable
            pannable
          />
        </ReactFlow>
      </div>
      {hoveredNode && showOverlay && (
        <div style={{
          position: "fixed",
          left: (document.querySelector(`[data-id="${hoveredNode.id}"]`)?.getBoundingClientRect().right || 0) + 10,
          top: (document.querySelector(`[data-id="${hoveredNode.id}"]`)?.getBoundingClientRect().top || 0) - 20,
          zIndex: 9999,
          display: "flex",
          pointerEvents: "none"
        }}>
          {/* Connector Line */}
          <div style={{ width: "30px", height: "2px", background: hoveredNode.data.accentColor, marginTop: "40px" }} />
          
          {/* Details Box */}
          <div style={{
            pointerEvents: "auto", 
            width: "320px", 
            background: "#fff", 
            borderRadius: "12px", 
            padding: "16px",
            border: `2px solid ${hoveredNode.data.accentColor}`, 
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
          }}>
            <div style={{ fontWeight: "800", color: hoveredNode.data.accentColor, marginBottom: "10px" }}>
              {hoveredNode.data.type} Details
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {Object.entries(hoveredNode.data.rawData || {}).map(([k, v]) => (
                  v && typeof v !== 'object' && (
                    <tr key={k}>
                      <td style={{ color: "#64748b", padding: "4px 0", fontSize: "12px" }}>{k}</td>
                      <td style={{ textAlign: "right", fontWeight: "600", fontSize: "12px" }}>{String(v)}</td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )} 
    </div> 
  );
}); 

      export default function GraphView(props) {
  return (
      <div style={{ width: "100%", height: "100vh", flex: 1, display: "flex" }}>
        <ReactFlowProvider>
          <GraphContent {...props} />
        </ReactFlowProvider>
      </div>
      );
}

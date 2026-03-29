<<<<<<< HEAD
import React, { useMemo, useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import ReactFlow, { 
  Controls, 
  Background, 
  MiniMap, 
  ReactFlowProvider, 
  MarkerType, 
  useReactFlow 
=======
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback, useMemo } from "react";
import ReactFlow, {
  Controls,
  Background,
  ReactFlowProvider,
  MarkerType,
  useReactFlow
>>>>>>> f8820e3 (updated api url and env settings)
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

const g = new dagre.graphlib.Graph();
g.setDefaultEdgeLabel(() => ({}));

const layoutElements = (nodes, edges) => {
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 500 });
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } };
  });
};

const createNode = (id, type, value, accentColor, rawData) => ({
  id,
<<<<<<< HEAD
  data: { 
    type, 
    value, 
    accentColor, 
    rawData, 
=======
  data: {
    type,
    value,
    accentColor,
    rawData,
>>>>>>> f8820e3 (updated api url and env settings)
    label: (
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: "9px", color: accentColor, fontWeight: "800", textTransform: "uppercase" }}>{type}</div>
        <div style={{ fontSize: "12px", color: "#1e293b", fontWeight: "700" }}>{value}</div>
      </div>
    ),
  },
  style: {
    padding: "12px",
    borderRadius: "8px",
    background: "#ffffff",
    border: `1.5px solid ${accentColor}`, 
    width: NODE_WIDTH,
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
<<<<<<< HEAD
    transition: "all 0.3s ease",
=======
    transition: "opacity 0.5s ease, box-shadow 0.5s ease"
>>>>>>> f8820e3 (updated api url and env settings)
  },
});

const createEdge = (source, target) => ({
  id: `e-${source}-${target}`, 
  source,
  target,
  animated: true,
  style: { stroke: "#94a3b8", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
});

<<<<<<< HEAD
const GraphContent = forwardRef(({ highlightIds = [] }, ref) => {
  const { fitView, setNodes, setEdges } = useReactFlow();
=======
// FIXED: showOverlay prop added here
const GraphContent = forwardRef(({ highlightIds = [], showOverlay = true }, ref) => {
  const { fitView, setCenter, getNode } = useReactFlow();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
>>>>>>> f8820e3 (updated api url and env settings)
  const [hoveredNode, setHoveredNode] = useState(null);
  const cursorRef = useRef({ x: 0, y: 0 });
  const tooltipRef = useRef(null);
  const [focusIndex, setFocusIndex] = useState(0);

<<<<<<< HEAD
  const { initialNodes, initialEdges } = useMemo(() => {
    let rawNodes = [];
    let rawEdges = [];
=======
  const highlightedNodesList = useMemo(() => {
    return nodes.filter(n => highlightIds.includes(n.id));
  }, [nodes, highlightIds]);
>>>>>>> f8820e3 (updated api url and env settings)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:10000/api/graph?view=detailed");
      const data = await response.json();
      if (!data || !data.orders) return;

      const nodeMap = new Map();
      const edgeMap = new Map();

<<<<<<< HEAD
      const delivery = deliveries[index];
      if (delivery) {
        const delId = String(delivery.outboundDelivery || `DEL-${index}`);
        rawNodes.push(createNode(`del-${delId}`, "Delivery", delId, "#8b5cf6", delivery));
        rawEdges.push(createEdge(`order-${orderId}`, `del-${delId}`));
=======
      const safeAddNode = (id, type, val, color, raw) => {
        if (!id || id.includes('undefined')) return;
        if (!nodeMap.has(id)) nodeMap.set(id, createNode(id, type, val, color, raw));
      };
>>>>>>> f8820e3 (updated api url and env settings)

      const safeAddEdge = (src, tgt) => {
        if (!src || !tgt || src.includes('undefined') || tgt.includes('undefined')) return;
        const edgeId = `e-${src}-${tgt}`;
        if (!edgeMap.has(edgeId)) edgeMap.set(edgeId, createEdge(src, tgt));
      };

      data.orders.slice(0, 10).forEach((order) => {
        const oId = String(order.salesOrder);
        const cId = String(order.soldToParty);

        safeAddNode(`cust-${cId}`, "Customer", cId, "#10b981", order);
        safeAddNode(`order-${oId}`, "Sales Order", oId, "#3b82f6", order);
        safeAddEdge(`cust-${cId}`, `order-${oId}`);

        const addr = (data.addresses || []).find(a => String(a.businessPartner) === cId);
        if (addr) {
          const addrId = `addr-${cId}-${addr.cityName || 'loc'}`;
          safeAddNode(addrId, "Address", addr.cityName || "Location", "#64748b", addr);
          safeAddEdge(`cust-${cId}`, addrId);
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
          const plantId = String(item.plant || item.productionPlant);
          if (prodId) {
            const pNodeId = `prod-${oId}-${prodId}`;
            const desc = (data.descriptions || []).find(d => String(d.product) === prodId);
            const productLabel = desc ? `${prodId}\n${desc.productDescription}` : prodId;
            safeAddNode(pNodeId, "Product", productLabel, "#ec4899", item);
            safeAddEdge(`order-${oId}`, pNodeId);

            if (plantId !== 'undefined') {
              const plantNodeId = `plant-${plantId}`;
              const plantData = (data.plants || []).find(p => String(p.plant) === plantId);
              safeAddNode(plantNodeId, "Plant", plantData?.plantName || plantId, "#f43f5e", plantData);
              safeAddEdge(pNodeId, plantNodeId);

              const sloc = (data.storageLocs || []).find(s => String(s.plant) === plantId && String(s.product) === prodId);
              if (sloc) {
                const slocId = `sloc-${plantId}-${sloc.storageLocation}`;
                safeAddNode(slocId, "Storage Loc", sloc.storageLocation, "#06b6d4", sloc);
                safeAddEdge(plantNodeId, slocId);
              }
            }
          }
        });

        const del = (data.deliveries || []).find(d => String(d.salesOrder) === oId);
        if (del) {
          const delId = String(del.outboundDelivery);
          safeAddNode(`del-${delId}`, "Delivery", delId, "#8b5cf6", del);
          safeAddEdge(`order-${oId}`, `del-${delId}`);
          const bill = (data.billings || []).find(b => String(b.outboundDelivery) === delId);
          if (bill) {
            const billId = String(bill.billingDocument);
            safeAddNode(`bill-${billId}`, "Invoice", billId, "#f59e0b", bill);
            safeAddEdge(`del-${delId}`, `bill-${billId}`);
          }
        }
      });

      const layoutedNodes = layoutElements(Array.from(nodeMap.values()), Array.from(edgeMap.values()));
      setNodes(layoutedNodes);
      setEdges(Array.from(edgeMap.values()));
      setTimeout(() => fitView({ padding: 0.2 }), 200);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  }, [fitView]);

  useEffect(() => {
<<<<<<< HEAD
    setNodes(initialNodes);
    setEdges(initialEdges);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);
=======
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (highlightIds.length > 0) {
      const firstNode = nodes.find(n => n.id === highlightIds[0]);
      if (firstNode) setHoveredNode(firstNode);
    }
  }, [highlightIds, nodes]);
>>>>>>> f8820e3 (updated api url and env settings)

  useImperativeHandle(ref, () => ({
    focusNode: (nodeId) => {
      const node = getNode(nodeId);
      if (node) {
        setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, { zoom: 1.6, duration: 800 });
      }
    },
    focusNext: () => {
      if (highlightedNodesList.length === 0) return;
      const nextIndex = (focusIndex + 1) % highlightedNodesList.length;
      setFocusIndex(nextIndex);
      const n = highlightedNodesList[nextIndex];
      setHoveredNode(n); // Ensure data updates in box
      setCenter(n.position.x + NODE_WIDTH / 2, n.position.y + NODE_HEIGHT / 2, { zoom: 1.6, duration: 800 });
    },
    focusPrev: () => {
      if (highlightedNodesList.length === 0) return;
      const prevIndex = (focusIndex - 1 + highlightedNodesList.length) % highlightedNodesList.length;
      setFocusIndex(prevIndex);
      const n = highlightedNodesList[prevIndex];
      setHoveredNode(n); // Ensure data updates in box
      setCenter(n.position.x + NODE_WIDTH / 2, n.position.y + NODE_HEIGHT / 2, { zoom: 1.6, duration: 800 });
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

<<<<<<< HEAD
  // ✅ HIGHLIGHTING SYNC
  useEffect(() => {
    if (!highlightIds) return;
    setNodes((nds) => nds.map((n) => {
      const isMatch = highlightIds.some(id => String(n.data.value).includes(id) || n.id.includes(id));
=======
 const styledNodes = useMemo(() => {
    return nodes.map((n) => {
      const isHighlighted = highlightIds.includes(n.id);
      
      const finalOpacity = (!showOverlay || highlightIds.length === 0) ? 1 : (isHighlighted ? 1 : 0.05);

>>>>>>> f8820e3 (updated api url and env settings)
      return {
        ...n,
        style: {
          ...n.style,
<<<<<<< HEAD
          border: isMatch ? "3px solid #f59e0b" : `1.5px solid ${n.data.accentColor}`,
          boxShadow: isMatch ? "0 0 20px #f59e0b" : "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          transform: isMatch ? "scale(1.1)" : "scale(1)",
          zIndex: isMatch ? 1000 : 1
        },
      };
    }));

    if (highlightIds.length > 0) {
      setTimeout(() => fitView({ duration: 800, padding: 0.4 }), 200);
    }
  }, [highlightIds, setNodes, fitView]);

  return (
    <div 
      style={{ width: "100%", height: "100%", position: "relative" }} 
      onMouseMove={(e) => setCursorPos({ x: e.clientX, y: e.clientY })}
    >
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        onNodeMouseEnter={(_, node) => setHoveredNode(node)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant="dots" gap={20} color="#e2e8f0" />
        <Controls showInteractive={false} style={{ border: "1px solid #e2e8f0" }} />
      </ReactFlow>

      {hoveredNode && (
        <div style={{
          position: "fixed",
          left: cursorPos.x + 20,
          top: cursorPos.y + 20,
          width: "300px",
          background: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
          padding: "16px",
          border: `2px solid ${hoveredNode.data.accentColor}`,
          zIndex: 9999,
          pointerEvents: "none",
          fontSize: "12px"
        }}>
=======
          opacity: finalOpacity,
          boxShadow: (isHighlighted && showOverlay) ? `0 0 25px ${n.data.accentColor}` : n.style.boxShadow,
          zIndex: isHighlighted ? 1000 : 1,
          transition: "opacity 0.4s ease, box-shadow 0.4s ease"
        },
      };
    });
  }, [nodes, highlightIds, showOverlay]);

  const styledEdges = useMemo(() => {
    return edges.map((e) => ({
      ...e,
      style: { 
        ...e.style, 
        opacity: (!showOverlay || highlightIds.length === 0) ? 1 : 0.02 
      },
    }));
  }, [edges, highlightIds, showOverlay]);

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      onMouseMove={(e) => {
        cursorRef.current = { x: e.clientX, y: e.clientY };
        if (hoveredNode && tooltipRef.current) {
          // Normal mode follows mouse, highlight mode is updated via getNodeScreenPos in App.js logic
          if (highlightIds.length === 0) {
            tooltipRef.current.style.left = `${e.clientX + 20}px`;
            tooltipRef.current.style.top = `${e.clientY + 20}px`;
          }
        }
      }}
    >
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodeMouseEnter={(_, node) => setHoveredNode(node)}
        onNodeMouseLeave={() => { if (highlightIds.length === 0) setHoveredNode(null); }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant="dots" gap={20} color="#e2e8f0" />
        <Controls showInteractive={false} />
      </ReactFlow>

      {/* FIXED: Respects showOverlay from App.js toggle */}
      {hoveredNode && showOverlay && (
        <div
          ref={tooltipRef}
          style={{
            position: "fixed", width: "300px", background: "#fff", borderRadius: "12px",
            display: showOverlay ? "block" : "none",
            boxShadow: "0 10px 20px rgba(0,0,0,0.15)", padding: "16px",
            border: `2px solid ${hoveredNode.data.accentColor}`, zIndex: 9999,
            pointerEvents: "none", fontSize: "12px", transition: "opacity 0.3s ease"
          }}
        >
>>>>>>> f8820e3 (updated api url and env settings)
          <div style={{ fontWeight: "700", color: hoveredNode.data.accentColor, marginBottom: "8px" }}>
            {hoveredNode.data.type} — {hoveredNode.data.value}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {Object.entries(hoveredNode.data.rawData || {}).map(([k, v]) => {
                if (typeof v === "object" || v === null) return null;
                return (
                  <tr key={k}>
                    <td style={{ fontWeight: "500", padding: "2px 4px", color: "#64748b" }}>{k}</td>
                    <td style={{ textAlign: "right", padding: "2px 4px", fontWeight: "600" }}>{String(v)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

export default function GraphView(props) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlowProvider>
        <GraphContent {...props} />
      </ReactFlowProvider>
    </div>
  );
}

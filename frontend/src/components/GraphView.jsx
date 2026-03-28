import React, { useMemo, useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import ReactFlow, { 
  Controls, 
  Background, 
  MiniMap, 
  ReactFlowProvider, 
  MarkerType, 
  useReactFlow 
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

import orders from "../data/sales_orders.json";
import billing1 from "../data/billing_document_items/part-20251119-133432-233.json";
import billing2 from "../data/billing_document_items/part-20251119-133432-978.json";
import deliveries1 from "../data/outbound_delivery_items/part-20251119-133431-439.json";
import deliveries2 from "../data/outbound_delivery_items/part-20251119-133431-626.json";
import payments from "../data/payments_accounts_receivable.json";

const billings = [...billing1, ...billing2];
const deliveries = [...deliveries1, ...deliveries2];

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

const g = new dagre.graphlib.Graph();
g.setDefaultEdgeLabel(() => ({}));

const layoutElements = (nodes, edges) => {
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 180 });
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
  data: { 
    type, 
    value, 
    accentColor, 
    rawData, 
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
    transition: "all 0.3s ease",
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

const GraphContent = forwardRef(({ highlightIds = [] }, ref) => {
  const { fitView, setNodes, setEdges } = useReactFlow();
  const [hoveredNode, setHoveredNode] = useState(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const { initialNodes, initialEdges } = useMemo(() => {
    let rawNodes = [];
    let rawEdges = [];

    orders.slice(0, 15).forEach((order, index) => {
      const orderId = String(order.salesOrder);
      const customerId = String(order.soldToParty);

      rawNodes.push(createNode(`cust-${customerId}`, "Customer", customerId, "#10b981", order));
      rawNodes.push(createNode(`order-${orderId}`, "Sales Order", orderId, "#3b82f6", order));
      rawEdges.push(createEdge(`cust-${customerId}`, `order-${orderId}`));

      const delivery = deliveries[index];
      if (delivery) {
        const delId = String(delivery.outboundDelivery || `DEL-${index}`);
        rawNodes.push(createNode(`del-${delId}`, "Delivery", delId, "#8b5cf6", delivery));
        rawEdges.push(createEdge(`order-${orderId}`, `del-${delId}`));

        const bill = billings[index];
        if (bill) {
          const billId = String(bill.billingDocument);
          rawNodes.push(createNode(`bill-${billId}`, "Invoice", billId, "#f59e0b", bill));
          rawEdges.push(createEdge(`del-${delId}`, `bill-${billId}`));

          const pay = payments[index];
          if (pay) {
            const payId = String(pay.accountingDocument);
            rawNodes.push(createNode(`pay-${payId}`, "Payment", payId, "#ef4444", pay));
            rawEdges.push(createEdge(`bill-${billId}`, `pay-${payId}`));
          }
        }
      }
    });

    const uniqueNodes = Array.from(new Map(rawNodes.map((n) => [n.id, n])).values());
    return { initialNodes: layoutElements(uniqueNodes, rawEdges), initialEdges: rawEdges };
  }, []);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

  useImperativeHandle(ref, () => ({
    focusNode: (nodeId) => {
      const nodeEl = document.querySelector(`[data-id="${nodeId}"]`);
      nodeEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
  }));

  // ✅ HIGHLIGHTING SYNC
  useEffect(() => {
    if (!highlightIds) return;
    setNodes((nds) => nds.map((n) => {
      const isMatch = highlightIds.some(id => String(n.data.value).includes(id) || n.id.includes(id));
      return {
        ...n,
        style: {
          ...n.style,
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
          <div style={{ fontWeight: "700", color: hoveredNode.data.accentColor, marginBottom: "8px" }}>
            {hoveredNode.data.type} — {hoveredNode.data.value}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {Object.entries(hoveredNode.data.rawData).map(([k, v]) => {
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

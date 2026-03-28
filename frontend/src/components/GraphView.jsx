import React, { useMemo, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  MarkerType,
  useNodesState,
  useEdgesState,
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
        <div style={{ fontSize: "9px", color: accentColor, fontWeight: "800", textTransform: "uppercase" }}>
          {type}
        </div>
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
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
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
        const delId = String(delivery.outboundDelivery || delivery.referenceSDDocument || `DEL-${index}`);
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

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Expose focusNode
  useImperativeHandle(ref, () => ({
    focusNode: (nodeId) => {
      const nodeEl = document.querySelector(`[data-id="${nodeId}"]`);
      nodeEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
  }));

  // === HIGHLIGHT NODES BASED ON QUERY ===
  useEffect(() => {
    if (!highlightIds || highlightIds.length === 0) {
      setHoveredNode(null);
      setNodes((nds) =>
        nds.map((n) => ({ ...n, style: { ...n.style, border: `1.5px solid ${n.data.accentColor}`, transform: "scale(1)", zIndex: 1 } }))
      );
      return;
    }

    setNodes((nds) =>
      nds.map((n) => {
        const isMatch = highlightIds.some((id) => n.id.includes(id) || String(n.data.value).includes(id));
        return {
          ...n,
          style: {
            ...n.style,
            border: isMatch ? "3px solid #f59e0b" : `1.5px solid ${n.data.accentColor}`,
            boxShadow: isMatch ? "0 0 20px #f59e0b" : "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            transform: isMatch ? "scale(1.1)" : "scale(1)",
            zIndex: isMatch ? 1000 : 1,
          },
        };
      })
    );

    // Show tooltip for first highlighted node
    const firstNodeId = highlightIds[0];
    const node = nodes.find((n) => n.id.includes(firstNodeId) || String(n.data.value).includes(firstNodeId));
    if (node) setHoveredNode(node);
  }, [highlightIds, nodes, setNodes]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={(e, node) => {
          setHoveredNode(node);
          setCursorPos({ x: e.clientX, y: e.clientY });
        }}
        onNodeMouseLeave={() => setHoveredNode(null)}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant="dots" gap={20} color="#e2e8f0" />
        <Controls showInteractive={false} style={{ boxShadow: "none", border: "1px solid #e2e8f0" }} />
        <MiniMap nodeStrokeWidth={3} maskColor="rgb(248, 250, 252, 0.7)" style={{ border: "1px solid #e2e8f0", borderRadius: "8px" }} />
      </ReactFlow>

      {hoveredNode && (
        <div
          style={{
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
            fontSize: "12px",
            color: "#1e293b",
          }}
        >
          <div style={{ fontWeight: "700", color: hoveredNode.data.accentColor, marginBottom: "8px" }}>
            {hoveredNode.data.type} — {hoveredNode.data.value}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {Object.entries(hoveredNode.data.rawData).map(([k, v]) => {
                if (typeof v === "object" || v === null) return null;
                return (
                  <tr key={k}>
                    <td style={{ fontWeight: "500", padding: "2px 4px", color: "#64748b" }}>{k.replace(/([A-Z])/g, " $1")}</td>
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
import type { ApiGraphNode, ApiGraphEdge } from "./api";
import { formatINR } from "./api";

export interface LayoutNode {
  id: string;
  role: "entry" | "mule" | "hub" | "exit" | "other" | string;
  x: number;
  y: number;
  label: string;
}

export interface LayoutEdge {
  fromIndex: number;
  toIndex: number;
  amount: string;
  id: string;
  source: string;
  target: string;
  rawAmount: number;
  hopIndex?: number;
}

export function computeGraphLayout(
  nodes: ApiGraphNode[],
  edges: ApiGraphEdge[],
  typology?: string
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  if (!nodes || nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const idToIndex = new Map<string, number>();
  nodes.forEach((n, idx) => idToIndex.set(n.id, idx));

  // If Cycle typology, arrange in a circle/ellipse
  const isCycle = typology?.toLowerCase().includes("cycle");
  if (isCycle && nodes.length > 2) {
    const cx = 370;
    const cy = 188;
    const rx = 240;
    const ry = 110;
    const layoutNodes: LayoutNode[] = nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      return {
        id: n.id,
        role: n.role || (i === 0 ? "entry" : "mule"),
        x: Math.round(cx + rx * Math.cos(angle)),
        y: Math.round(cy + ry * Math.sin(angle)),
        label: n.label || n.id,
      };
    });

    const layoutEdges: LayoutEdge[] = edges
      .map((e) => {
        const fromIndex = idToIndex.get(e.source);
        const toIndex = idToIndex.get(e.target);
        if (fromIndex === undefined || toIndex === undefined) return null;
        return {
          fromIndex,
          toIndex,
          amount: formatINR(e.amount),
          id: e.id,
          source: e.source,
          target: e.target,
          rawAmount: e.amount,
          hopIndex: e.hop_index,
        };
      })
      .filter((e): e is LayoutEdge => e !== null);

    return { nodes: layoutNodes, edges: layoutEdges };
  }

  // Layered DAG layout
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    outDegree.set(n.id, 0);
  });
  edges.forEach((e) => {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    outDegree.set(e.source, (outDegree.get(e.source) || 0) + 1);
  });

  // Assign columns 0 (entry), 1 (mules), 2 (hubs), 3 (exit)
  const columns: ApiGraphNode[][] = [[], [], [], []];

  nodes.forEach((n) => {
    const inDeg = inDegree.get(n.id) || 0;
    const outDeg = outDegree.get(n.id) || 0;

    if (n.role === "entry" || (inDeg === 0 && outDeg > 0)) {
      columns[0].push(n);
    } else if (n.role === "exit" || (outDeg === 0 && inDeg > 0)) {
      columns[3].push(n);
    } else if (n.role === "hub" || outDeg >= 2 || inDeg >= 2) {
      columns[2].push(n);
    } else {
      columns[1].push(n);
    }
  });

  // Fallback if any column has 0 nodes, adjust layout
  const columnX = [75, 245, 455, 645];
  const layoutNodes: LayoutNode[] = [];

  columns.forEach((colNodes, colIdx) => {
    const count = colNodes.length;
    const x = columnX[colIdx];
    colNodes.forEach((node, i) => {
      let y: number;
      if (count === 1) {
        y = 188;
      } else {
        const top = 50;
        const bottom = 325;
        const step = (bottom - top) / (count - 1);
        y = Math.round(top + i * step);
      }
      layoutNodes.push({
        id: node.id,
        role: node.role,
        x,
        y,
        label: node.label || node.id,
      });
    });
  });

  // Re-index by new order in layoutNodes
  const finalIdToIndex = new Map<string, number>();
  layoutNodes.forEach((n, idx) => finalIdToIndex.set(n.id, idx));

  const layoutEdges: LayoutEdge[] = edges
    .map((e) => {
      const fromIndex = finalIdToIndex.get(e.source);
      const toIndex = finalIdToIndex.get(e.target);
      if (fromIndex === undefined || toIndex === undefined) return null;
      return {
        fromIndex,
        toIndex,
        amount: formatINR(e.amount),
        id: e.id,
        source: e.source,
        target: e.target,
        rawAmount: e.amount,
        hopIndex: e.hop_index,
      };
    })
    .filter((e): e is LayoutEdge => e !== null);

  return { nodes: layoutNodes, edges: layoutEdges };
}


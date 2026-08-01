import { TRIGGER_LABELS, generateId, matchTrigger } from "./program.ts";
import {
  Flow,
  FlowEdgeTriggerType,
  FlowNode,
  FlowNodeType,
} from "../interfaces/flow.ts";

export function flowEdgeLabel(trigger: {
  type: FlowEdgeTriggerType;
  value: string;
}): string {
  if (trigger.type === "fallback") return "any other message";
  return `${TRIGGER_LABELS[trigger.type]} "${trigger.value}"`;
}

export function matchFlowTrigger(
  trigger: { type: FlowEdgeTriggerType; value: string },
  message: string
): boolean {
  if (trigger.type === "fallback") return true;
  return matchTrigger(trigger, message);
}

export function createFlowNode(
  type: FlowNodeType,
  position?: { x: number; y: number }
): FlowNode {
  return {
    id: generateId(),
    type,
    position: position ?? { x: 0, y: 0 },
    data: { label: type === "start" ? "Start" : "New State", replies: [] },
  };
}

export function createFlow(name = "New Flow"): Flow {
  return {
    id: generateId(),
    name,
    startNodeId: "",
    nodes: [],
    edges: [],
  };
}

export function executeFlow(
  flow: Flow,
  message: string,
  currentNodeId: string
): { replies: string[]; nextNodeId: string } | undefined {
  const currentNode = flow.nodes.find((n) => n.id === currentNodeId);
  if (!currentNode) return undefined;
  for (const edge of flow.edges) {
    // Only consider transitions leaving the current node.
    if (edge.source !== currentNodeId) continue;
    if (!matchFlowTrigger(edge.data.trigger, message)) continue;
    // Defensive: skip edges whose target node is missing and keep scanning.
    const target = flow.nodes.find((n) => n.id === edge.target);
    if (!target) continue;
    return { replies: target.data.replies, nextNodeId: edge.target };
  }
  return undefined;
}

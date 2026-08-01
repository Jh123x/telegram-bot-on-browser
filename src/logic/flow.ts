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

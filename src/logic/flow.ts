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
    // Copy so callers cannot mutate the flow's stored node data.
    return { replies: [...target.data.replies], nextNodeId: edge.target };
  }
  return undefined;
}

// Tracks the current node per chat user so conversation state persists across
// messages. User id maps to the node id they are currently in.
export class FlowRuntime {
  private currentNodes = new Map<number, string>();

  constructor(private flow: Flow) {}

  // Clears the stored state for a single user, sending them back to the start.
  reset(userId: number): void {
    this.currentNodes.delete(userId);
  }

  // Evaluates a message from the user's current node (or the start node for a
  // brand-new user). On a transition stores the user's new node and returns the
  // target state's replies as a single string / array / undefined. On no match
  // the user's state is unchanged and undefined is returned.
  handleMessage(
    userId: number,
    message: string
  ): string | string[] | undefined {
    const current = this.currentNodes.get(userId) ?? this.flow.startNodeId;
    const step = executeFlow(this.flow, message, current);
    if (!step) return undefined;
    this.currentNodes.set(userId, step.nextNodeId);
    if (step.replies.length === 0) return undefined;
    if (step.replies.length === 1) return step.replies[0];
    return step.replies;
  }
}
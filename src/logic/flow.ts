import { TRIGGER_LABELS, generateId, interpolate, matchTrigger } from "./program.ts";
import {
  Flow,
  FlowEdgeTriggerType,
  FlowNode,
  FlowNodeType,
} from "../interfaces/flow.ts";
import type { FlowSample } from "./flowSamples.ts";

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
    // Replies may reference the raw message via {msg}.
    const replies = step.replies.map((reply) => interpolate(reply, { msg: message }));
    if (replies.length === 0) return undefined;
    if (replies.length === 1) return replies[0];
    return replies;
  }
}

// Validates a flow's structure, returning a list of human-readable error
// strings (empty array = valid). Duplicate node ids report one error per id.
export function validateFlow(flow: Flow): string[] {
  const errors: string[] = [];

  if (flow.name.trim() === "") {
    errors.push("Flow name is required");
  }

  const startNodes = flow.nodes.filter((n) => n.type === "start");
  if (startNodes.length === 0) {
    errors.push("Flow must have a start node");
  } else if (startNodes.length > 1) {
    errors.push("Flow can only have one start node");
  }

  const seen = new Set<string>();
  for (const node of flow.nodes) {
    if (seen.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`);
    } else {
      seen.add(node.id);
    }
  }

  const nodeIds = new Set(flow.nodes.map((n) => n.id));
  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id} references a missing node`);
    }
  }

  if (startNodes.length === 1 && nodeIds.has(startNodes[0].id)) {
    for (const edge of flow.edges) {
      if (edge.target === startNodes[0].id) {
        errors.push("Start node cannot have incoming edges");
      }
    }
  }

  return errors;
}

// Deep-copies a sample's flow with FRESH ids for the flow, every node, and
// every edge so loading a sample twice creates two independent flows. The
// startNodeId is remapped to the freshly generated start node.
export function flowFromSample(sample: FlowSample): Flow {
  const nodes = sample.flow.nodes.map((node) => ({
    ...node,
    id: generateId(),
    position: { ...node.position },
    data: { label: node.data.label, replies: [...node.data.replies] },
  }));
  const oldToNew = new Map<string, string>();
  sample.flow.nodes.forEach((node, i) => {
    oldToNew.set(node.id, nodes[i].id);
  });
  const edges = sample.flow.edges.map((edge) => ({
    id: generateId(),
    source: oldToNew.get(edge.source) ?? edge.source,
    target: oldToNew.get(edge.target) ?? edge.target,
    data: {
      trigger: { ...edge.data.trigger },
    },
  }));
  const startNode = nodes.find((node) => node.type === "start");
  return {
    id: generateId(),
    name: sample.name,
    startNodeId: startNode ? startNode.id : "",
    nodes,
    edges,
  };
}
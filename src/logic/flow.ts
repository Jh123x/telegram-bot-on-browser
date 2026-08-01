import {
  Flow,
  FlowEdgeTriggerType,
  FlowNode,
  FlowNodeType,
  FlowTriggerType,
} from "../interfaces/flow.ts";
import type { FlowSample } from "./flowSamples.ts";

export const TRIGGER_TYPES: FlowTriggerType[] = [
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "notEquals",
  "notContains",
];

export const TRIGGER_LABELS: Record<FlowTriggerType, string> = {
  equals: "message equals",
  contains: "message contains",
  startsWith: "message starts with",
  endsWith: "message ends with",
  notEquals: "message does not equal",
  notContains: "message does not contain",
};

export function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Replaces every {key} token in the template with variables[key] when present.
// Tokens with no matching key are left as-is (including "{prev}" if it is not
// in the map). An empty template returns an empty string.
export function interpolate(
  template: string,
  variables: Record<string, string>
): string {
  if (template === "") return "";
  return template.replace(/\{([^}]+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : match
  );
}

function matchTrigger(
  trigger: { type: FlowTriggerType; value: string },
  message: string
): boolean {
  switch (trigger.type) {
    case "equals":
      return message.trim() === trigger.value.trim();
    case "contains":
      return message.includes(trigger.value);
    case "startsWith":
      return message.startsWith(trigger.value);
    case "endsWith":
      return message.endsWith(trigger.value);
    case "notEquals":
      return message.trim() !== trigger.value.trim();
    case "notContains":
      return !message.includes(trigger.value);
    default:
      return false;
  }
}

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
  // brand-new user). On a matched transition the user's state always advances
  // to the target node; the return value distinguishes matched from unmatched:
  //   - undefined  -> no transition matched, the user's state is unchanged
  //   - []         -> a transition matched but the target state has no replies
  //   - string     -> a matched transition whose target state has a single reply
  //   - string[]   -> a matched transition whose target state has several replies
  // Returning [] (rather than undefined) for matched-but-silent transitions lets
  // callers stop their rule chain: the message WAS consumed by this flow even
  // though it produced no reply, so no other flow should pick it up.
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
    if (replies.length === 0) return [];
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

  // startNodeId must be consistent with the flow's actual node structure.
  if (flow.startNodeId !== "") {
    if (!nodeIds.has(flow.startNodeId)) {
      errors.push(`Start node id "${flow.startNodeId}" points to a missing node`);
    } else if (
      startNodes.length === 1 &&
      flow.startNodeId !== startNodes[0].id
    ) {
      errors.push("startNodeId must point to the start node");
    }
  }

  // A source node may only have one fallback edge: the first one in edge-order
  // always matches, so any additional fallbacks are unreachable dead branches.
  const fallbackCounts = new Map<string, number>();
  for (const edge of flow.edges) {
    if (edge.data.trigger.type === "fallback") {
      fallbackCounts.set(edge.source, (fallbackCounts.get(edge.source) ?? 0) + 1);
    }
  }
  for (const [source, count] of fallbackCounts) {
    if (count > 1) {
      errors.push(
        `Node ${source} has multiple fallback edges; only the first is reachable`
      );
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
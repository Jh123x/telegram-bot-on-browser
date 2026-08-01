import {
  Flow,
  FlowNodeCategory,
  FlowNodeData,
  FlowNodeType,
  FlowTriggerType,
  SendNodeType,
  TransformNodeType,
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

export const TRANSFORM_TYPES: TransformNodeType[] = [
  "lowercase",
  "uppercase",
  "trim",
  "replace",
  "extractRegex",
];

export const SEND_TYPES: SendNodeType[] = ["send", "random"];

export const ALL_NODE_TYPES: FlowNodeType[] = [
  "start",
  ...TRANSFORM_TYPES,
  ...TRIGGER_TYPES,
  ...SEND_TYPES,
];

// Maps a concrete node type to its category. Start is its own category; every
// transform/trigger/send type maps to its respective group.
export function nodeCategory(type: FlowNodeType): FlowNodeCategory {
  if (type === "start") return "start";
  if ((TRANSFORM_TYPES as string[]).includes(type)) return "transform";
  if ((TRIGGER_TYPES as string[]).includes(type)) return "condition";
  if ((SEND_TYPES as string[]).includes(type)) return "send";
  return "send";
}

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
// Tokens with no matching key are left as-is. An empty template returns an
// empty string.
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

// Interpolates a list of reply templates with the current message. Module
// level so loop closures never capture loop-scoped variables (no-loop-func).
function interpolateReplies(replies: string[], message: string): string[] {
  return replies.map((reply) => interpolate(reply, { msg: message }));
}

// Evaluates a trigger against a message. equals/notEquals trim both sides;
// the contains/startsWith/endsWith/notContains checks are raw string ops.
export function matchTrigger(
  type: FlowTriggerType,
  value: string,
  message: string
): boolean {
  switch (type) {
    case "equals":
      return message.trim() === value.trim();
    case "contains":
      return message.includes(value);
    case "startsWith":
      return message.startsWith(value);
    case "endsWith":
      return message.endsWith(value);
    case "notEquals":
      return message.trim() !== value.trim();
    case "notContains":
      return !message.includes(value);
    default:
      return false;
  }
}

// Applies a concrete transform to a message. replace with an empty (or
// undefined) find leaves the message unchanged; an invalid extractRegex
// pattern yields an empty string.
export function applyTransform(
  type: TransformNodeType,
  data: FlowNodeData,
  message: string
): string {
  switch (type) {
    case "lowercase":
      return message.toLowerCase();
    case "uppercase":
      return message.toUpperCase();
    case "trim":
      return message.trim();
    case "replace":
      if (data.find === "" || data.find === undefined) return message;
      return message
        .split(data.find)
        .join(data.replacement ?? "");
    case "extractRegex":
      try {
        const m = message.match(new RegExp(data.pattern ?? ""));
        return m ? m[0] : "";
      } catch {
        return "";
      }
    default:
      return message;
  }
}

// Labels a condition edge by its source handle. Edges without a handle
// (start/transform/plain connections) carry no label.
export function flowEdgeLabel(
  sourceHandle: "if" | "else" | undefined
): string | undefined {
  if (sourceHandle === "if" || sourceHandle === "else") return sourceHandle;
  return undefined;
}

// React Flow fires "dimensions" changes after measuring nodes. Applying them
// to the app's own node state and persisting makes React Flow re-adopt the
// nodes (without their measured size), which resets the internal measurement
// and leaves nodes stuck at `visibility: hidden`. These bookkeeping changes
// must be dropped before applying/persisting node changes.
export function dropNodeDimensionChanges<T extends { type: string }>(
  changes: T[]
): T[] {
  return changes.filter((change) => change.type !== "dimensions");
}

// Removes a node and every edge connected to it (the same semantics as the
// canvas Delete key: a node cannot stay wired to a graph it is no longer in).
// Deleting the start node also clears startNodeId so validation reports it.
export function removeFlowNode(flow: Flow, nodeId: string): Flow {
  return {
    ...flow,
    nodes: flow.nodes.filter((n) => n.id !== nodeId),
    edges: flow.edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    ),
    startNodeId: flow.startNodeId === nodeId ? "" : flow.startNodeId,
  };
}

// Removes a single edge by id; nodes are untouched.
export function removeFlowEdge(flow: Flow, edgeId: string): Flow {
  return { ...flow, edges: flow.edges.filter((e) => e.id !== edgeId) };
}

// Humanized condition-node default labels.
const CONDITION_DEFAULT_LABELS: Record<FlowTriggerType, string> = {
  equals: "Equals",
  notEquals: "Not Equals",
  startsWith: "Starts With",
  endsWith: "Ends With",
  contains: "Contains",
  notContains: "Not Contains",
};

export function createFlowNode(
  type: FlowNodeType,
  position?: { x: number; y: number }
): Flow["nodes"][number] {
  const base = {
    id: generateId(),
    type,
    position: position ?? { x: 0, y: 0 },
  };
  switch (type) {
    case "start":
      return { ...base, data: { label: "Start" } };
    case "lowercase":
      return { ...base, data: { label: "Lowercase" } };
    case "uppercase":
      return { ...base, data: { label: "Uppercase" } };
    case "trim":
      return { ...base, data: { label: "Trim" } };
    case "replace":
      return {
        ...base,
        data: { label: "Replace", find: "", replacement: "" },
      };
    case "extractRegex":
      return { ...base, data: { label: "Extract Regex", pattern: "" } };
    case "equals":
    case "notEquals":
    case "startsWith":
    case "endsWith":
    case "contains":
    case "notContains":
      return {
        ...base,
        data: { label: CONDITION_DEFAULT_LABELS[type], value: "" },
      };
    case "send":
      return { ...base, data: { label: "New Send", replies: [] } };
    case "random":
      return { ...base, data: { label: "Random", replies: [] } };
  }
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

// Walks the flow graph starting at flow.startNodeId, applying transforms and
// evaluating conditions, until a send node is reached. Returns the send
// node's replies interpolated with the (possibly transformed) message, or
// undefined if the walk cannot reach a send node (dead end, cycle, missing
// start, missing branch edge).
export function executeFlow(
  flow: Flow,
  message: string
): string[] | undefined {
  if (flow.startNodeId === "") return undefined;

  const nodesById = new Map(flow.nodes.map((n) => [n.id, n]));
  let current = nodesById.get(flow.startNodeId);
  if (!current) return undefined;

  const edgesOut = new Map<string, Flow["edges"]>();
  for (const edge of flow.edges) {
    const list = edgesOut.get(edge.source) ?? [];
    list.push(edge);
    edgesOut.set(edge.source, list);
  }

  let currentMessage = message;
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current.id)) return undefined; // cycle guard
    visited.add(current.id);

    const category = nodeCategory(current.type);

    if (category === "start") {
      const outgoing = edgesOut.get(current.id) ?? [];
      if (outgoing.length === 0) return undefined;
      const next = nodesById.get(outgoing[0].target);
      if (!next) return undefined;
      // start transitions are unconditional; follow the first outgoing edge
      current = next;
      continue;
    }

    if (category === "transform") {
      currentMessage = applyTransform(
        current.type as TransformNodeType,
        current.data,
        currentMessage
      );
      const outgoing = edgesOut.get(current.id) ?? [];
      if (outgoing.length === 0) return undefined;
      const next = nodesById.get(outgoing[0].target);
      if (!next) return undefined;
      current = next;
      continue;
    }

    if (category === "condition") {
      const matched = matchTrigger(
        current.type as FlowTriggerType,
        current.data.value ?? "",
        currentMessage
      );
      const handle = matched ? "if" : "else";
      const outgoing = edgesOut.get(current.id) ?? [];
      const branch = outgoing.find((e) => e.sourceHandle === handle);
      if (!branch) return undefined;
      const next = nodesById.get(branch.target);
      if (!next) return undefined;
      current = next;
      continue;
    }

    // send category (send / random)
    const replies = interpolateReplies(
      current.data.replies ?? [],
      currentMessage
    );
    if (current.type === "random") {
      if (replies.length === 0) return [];
      return [replies[Math.floor(Math.random() * replies.length)]];
    }
    return replies;
  }

  return undefined;
}

// Thin stateless wrapper around executeFlow. Keeps the handleMessage(userId,
// message) signature for callers; userId is ignored because every message is
// evaluated from the flow's start node.
export class FlowRuntime {
  constructor(private flow: Flow) {}

  // Evaluates the message from the start node every time.
  //   - undefined  -> no send node reached (caller falls through to next rule)
  //   - []         -> a send node was reached but has empty replies (consumed)
  //   - string     -> a send node reached with a single reply
  //   - string[]   -> a send node reached with several replies
  handleMessage(
    _userId: number,
    message: string
  ): string | string[] | undefined {
    const replies = executeFlow(this.flow, message);
    if (replies === undefined) return undefined;
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

  // A start or transform node has exactly one deterministic output; any extra
  // outgoing edges are unreachable dead branches.
  for (const node of flow.nodes) {
    if (node.type === "start" || nodeCategory(node.type) === "transform") {
      const outgoing = flow.edges.filter((e) => e.source === node.id);
      if (outgoing.length > 1) {
        errors.push(
          `Node ${node.id} has multiple outgoing edges; only the first is reachable`
        );
      }
    }
  }

  // A condition node has exactly one if branch and one else branch.
  for (const node of flow.nodes) {
    if (nodeCategory(node.type) === "condition") {
      const outgoing = flow.edges.filter((e) => e.source === node.id);
      const ifCount = outgoing.filter((e) => e.sourceHandle === "if").length;
      const elseCount = outgoing.filter((e) => e.sourceHandle === "else").length;
      if (ifCount > 1) {
        errors.push(
          `Node ${node.id} has multiple if edges; only the first is reachable`
        );
      }
      if (elseCount > 1) {
        errors.push(
          `Node ${node.id} has multiple else edges; only the first is reachable`
        );
      }
    }
  }

  // A send node (send or random) is terminal and cannot lead anywhere.
  for (const node of flow.nodes) {
    if (nodeCategory(node.type) === "send") {
      const outgoing = flow.edges.filter((e) => e.source === node.id);
      if (outgoing.length > 0) {
        errors.push(
          `Node ${node.id} is a send node and cannot have outgoing edges`
        );
      }
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
// every edge so loading a sample twice creates two independent flows. Node
// data (label and the flat optional fields) and edge sourceHandle are
// deep-copied too. The startNodeId is remapped to the freshly generated start
// node.
export function flowFromSample(sample: FlowSample): Flow {
  const nodes = sample.flow.nodes.map((node) => {
    const data: FlowNodeData = { label: node.data.label };
    if (node.data.value !== undefined) data.value = node.data.value;
    if (node.data.find !== undefined) data.find = node.data.find;
    if (node.data.replacement !== undefined)
      data.replacement = node.data.replacement;
    if (node.data.pattern !== undefined) data.pattern = node.data.pattern;
    if (node.data.replies !== undefined) data.replies = [...node.data.replies];
    return {
      ...node,
      id: generateId(),
      position: { ...node.position },
      data,
    };
  });
  const oldToNew = new Map<string, string>();
  sample.flow.nodes.forEach((node, i) => {
    oldToNew.set(node.id, nodes[i].id);
  });
  const edges = sample.flow.edges.map((edge) => ({
    id: generateId(),
    source: oldToNew.get(edge.source) ?? edge.source,
    target: oldToNew.get(edge.target) ?? edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
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

export type FlowTriggerType =
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "notEquals"
  | "notContains";

export type TransformNodeType =
  | "lowercase"
  | "uppercase"
  | "trim"
  | "replace"
  | "extractRegex"
  | "randomNumber";

export type SendNodeType = "send" | "random" | "poll";

// Every concrete node type. The category is derived via nodeCategory() in
// logic/flow.ts; the type itself IS the operation (no per-node type selectors).
export type FlowNodeType =
  | "start"
  | TransformNodeType
  | FlowTriggerType
  | SendNodeType;

export type FlowNodeCategory = "start" | "transform" | "condition" | "send";

// A structured poll reply produced by a "poll" send node. The runtime turns
// this into a real Telegram sendPoll call.
export interface PollReply {
  kind: "poll";
  question: string;
  options: string[];
}

export interface FlowNodeData {
  label: string;
  value?: string; // condition nodes: the trigger value to match
  find?: string; // "replace" transform: text to find
  replacement?: string; // "replace" transform: replacement text
  pattern?: string; // "extractRegex" transform: regex pattern
  min?: string; // "randomNumber" transform: inclusive lower bound
  max?: string; // "randomNumber" transform: inclusive upper bound
  replies?: string[]; // "send" / "random" nodes: one message per line
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: "if" | "else"; // condition-node outputs only
}

export interface Flow {
  id: string;
  name: string;
  startNodeId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

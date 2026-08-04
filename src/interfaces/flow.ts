export type FlowTriggerType =
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "notEquals"
  | "notContains"
  | "notStartsWith"
  | "notEndsWith";

export type TransformNodeType =
  | "lowercase"
  | "uppercase"
  | "trim"
  | "replace"
  | "extractRegex"
  | "randomNumber"
  | "concatFront"
  | "concatBack"
  | "template";

export type SendNodeType = "send" | "poll";

// Every concrete node type. The category is derived via nodeCategory() in
// logic/flow.ts; the type itself IS the operation (no per-node type selectors).
export type FlowNodeType =
  | "start"
  | TransformNodeType
  | FlowTriggerType
  | SendNodeType;

export type FlowNodeCategory = "start" | "transform" | "condition" | "send";

// A structured poll reply produced by a "poll" send node. The runtime turns
// this into a real Telegram sendPoll call. The optional fields mirror the
// Telegram Bot API sendPoll parameters (camelCase here, snake_case there).
export interface PollReply {
  kind: "poll";
  question: string;
  options: string[];
  type?: "regular" | "quiz"; // default "regular"
  isAnonymous?: boolean; // default true
  allowsMultipleAnswers?: boolean; // default false (regular polls only)
  correctOptionId?: number; // quiz only: 0-based index of the correct option
  explanation?: string; // quiz only: shown when the answer is wrong
  openPeriod?: number; // seconds until the poll closes (5-600)
}

export interface FlowNodeData {
  label: string;
  value?: string; // condition nodes: the trigger value to match
  find?: string; // "replace" transform: text to find
  replacement?: string; // "replace" transform: replacement text
  pattern?: string; // "extractRegex" transform: regex pattern
  min?: string; // "randomNumber" transform: inclusive lower bound
  max?: string; // "randomNumber" transform: inclusive upper bound
  text?: string; // "concatFront" / "concatBack" transforms: text to add
  template?: string; // "template" transform: text with {msg} tokens
  pollType?: string; // "poll" node: "regular" | "quiz"
  isAnonymous?: string; // "poll" node: "true" | "false"
  allowsMultipleAnswers?: string; // "poll" node: "true" | "false"
  correctOptionId?: string; // "poll" node (quiz): 0-based index of the correct option
  explanation?: string; // "poll" node (quiz): text shown when the answer is wrong
  openPeriod?: string; // "poll" node: seconds until the poll closes
  replies?: string[]; // "send" node: one message per line
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

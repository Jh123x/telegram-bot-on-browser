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

export type SendNodeType = "send" | "poll" | "sendTo" | "question";

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

// A reply produced by a "sendTo" node: a message sent to a DIFFERENT user
// than the one who triggered the flow. `to` is the target username (without
// the @) parsed from the first @mention in the message; the transport layer
// resolves it to a chat id and sends `text` there, so the original sender is
// never revealed to the target.
export interface TargetedReply {
  kind: "sendTo";
  to: string;
  text: string;
}

// A reply produced by a "question" node: the node asks `prompt` and the
// runtime registers per-user pending state so the NEXT message from that
// user is checked against `answers` (case-insensitive, trimmed) instead of
// running the flow again. `{answer}` in correctReply/wrongReply is
// interpolated with the FIRST accepted answer.
export interface QuestionReply {
  kind: "question";
  prompt: string;
  answers: string[];
  correctReply: string;
  wrongReply: string;
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
  template?: string; // "template" transform: f-string style template
  confirm?: string; // "sendTo" node: confirmation sent to the original sender
  prompt?: string; // "question" node: the question text
  answers?: string[]; // "question" node: accepted answers (case-insensitive)
  correctReply?: string; // "question" node: reply when the answer matches
  wrongReply?: string; // "question" node: reply when the answer does not match
  pollType?: string; // "poll" node: "regular" | "quiz"
  isAnonymous?: string; // "poll" node: "true" | "false"
  allowsMultipleAnswers?: string; // "poll" node: "true" | "false"
  correctOptionId?: string; // "poll" node (quiz): 0-based index of the correct option
  explanation?: string; // "poll" node (quiz): text shown when the answer is wrong
  openPeriod?: string; // "poll" node: seconds until the poll closes
  replies?: string[]; // "send" / "sendTo" nodes: one message per line
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

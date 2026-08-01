export type FlowTriggerType =
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "notEquals"
  | "notContains";

export type FlowNodeType = "start" | "transform" | "condition" | "send";

export type TransformType =
  | "lowercase"
  | "uppercase"
  | "trim"
  | "replace"
  | "extractRegex";

export interface TransformData {
  type: TransformType;
  find: string; // used by "replace"
  replacement: string; // used by "replace"
  pattern: string; // used by "extractRegex"
}

export interface FlowNodeData {
  label: string;
  replies?: string[]; // send nodes
  transform?: TransformData; // transform nodes
  trigger?: { type: FlowTriggerType; value: string }; // condition nodes
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

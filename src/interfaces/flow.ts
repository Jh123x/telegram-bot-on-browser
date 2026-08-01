export type FlowTriggerType =
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "notEquals"
  | "notContains";

export type FlowNodeType = "start" | "state";

export interface FlowNodeData {
  label: string;
  // Messages sent to the user when this state is entered. One message per line.
  replies: string[];
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
}

// Uses the locally-defined FlowTriggerType (equals/contains/startsWith/
// endsWith/notEquals/notContains) plus "fallback" = matches any message.
export type FlowEdgeTriggerType = FlowTriggerType | "fallback";

export interface FlowEdgeData {
  trigger: { type: FlowEdgeTriggerType; value: string };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  data: FlowEdgeData;
}

export interface Flow {
  id: string;
  name: string;
  startNodeId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

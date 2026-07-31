export type TriggerType = "equals" | "contains" | "startsWith" | "endsWith";
export type LogicType = "lengthGreater" | "lengthLess" | "matchesRegex";
export type TransformType = "uppercase" | "lowercase" | "trim" | "replace";
export type ActionType = "reply" | "random" | "echo";
export type BlockCategory = "logic" | "transform" | "action";

export interface Trigger {
  type: TriggerType;
  value: string;
}

export interface Block {
  id: string;
  category: BlockCategory;
  kind: LogicType | TransformType | ActionType;
  value: string;
  value2: string;
  fallback: string;
}

export interface Program {
  id: string;
  name: string;
  trigger: Trigger;
  blocks: Block[];
}

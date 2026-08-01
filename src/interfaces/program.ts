export type TriggerType =
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "notEquals"
  | "notContains";
export type LogicType =
  | "lengthGreater"
  | "lengthLess"
  | "matchesRegex"
  | "lengthEquals"
  | "isNumber"
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "notEquals"
  | "notContains"
  | "notStartsWith"
  | "notEndsWith"
  | "notLengthGreater"
  | "notLengthLess"
  | "notLengthEquals"
  | "notMatchesRegex"
  | "notIsNumber";
export type TransformType =
  | "uppercase"
  | "lowercase"
  | "trim"
  | "replace"
  | "concat"
  | "capitalize"
  | "titleCase"
  | "reverse"
  | "remove";
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
  outputVar?: string;
}

export interface Program {
  id: string;
  name: string;
  trigger: Trigger;
  blocks: Block[];
}

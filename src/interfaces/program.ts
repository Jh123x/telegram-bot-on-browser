export type TriggerType = "equals" | "contains" | "startsWith";
export type ActionType = "reply" | "random" | "echo";

export interface Trigger {
  type: TriggerType;
  value: string;
}

export interface Action {
  id: string;
  type: ActionType;
  value: string;
}

export interface Program {
  id: string;
  name: string;
  trigger: Trigger;
  actions: Action[];
}

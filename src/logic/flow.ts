import { TRIGGER_LABELS, matchTrigger } from "./program.ts";
import { FlowEdgeTriggerType } from "../interfaces/flow.ts";

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

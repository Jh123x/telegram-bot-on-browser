import {
  Action,
  ActionType,
  Program,
  Trigger,
  TriggerType,
} from "../interfaces/program.ts";

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  equals: "message equals",
  contains: "message contains",
  startsWith: "message starts with",
};

export const ACTION_LABELS: Record<ActionType, string> = {
  reply: "reply with text",
  random: "reply random choice",
  echo: "echo the message",
};

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createAction(type: ActionType, value = ""): Action {
  return { id: generateId(), type, value };
}

export function createProgram(name = "New Program"): Program {
  return {
    id: generateId(),
    name,
    trigger: { type: "equals", value: "" },
    actions: [],
  };
}

export function matchTrigger(trigger: Trigger, message: string): boolean {
  switch (trigger.type) {
    case "equals":
      return message.trim() === trigger.value.trim();
    case "contains":
      return message.includes(trigger.value);
    case "startsWith":
      return message.startsWith(trigger.value);
    default:
      return false;
  }
}

export function randomChoice(
  options: string[],
  random: () => number = Math.random
): string | undefined {
  if (options.length === 0) return undefined;
  const index = Math.min(
    options.length - 1,
    Math.floor(random() * options.length)
  );
  return options[index];
}

export function executeActions(
  actions: Action[],
  message: string,
  random: () => number = Math.random
): string[] {
  const responses: string[] = [];
  for (const action of actions) {
    switch (action.type) {
      case "reply":
        responses.push(action.value);
        break;
      case "random": {
        const options = action.value
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        const choice = randomChoice(options, random);
        if (choice !== undefined) responses.push(choice);
        break;
      }
      case "echo":
        responses.push(message);
        break;
    }
  }
  return responses;
}

export function compileProgram(
  program: Program
): (message: string) => string[] {
  return (message: string) => {
    if (!matchTrigger(program.trigger, message)) return [];
    return executeActions(program.actions, message);
  };
}

export function findMatchingProgram(
  programs: Program[],
  message: string
): Program | undefined {
  return programs.find((program) => matchTrigger(program.trigger, message));
}

export function validateProgram(program: Program): string[] {
  const errors: string[] = [];
  if (program.name.trim() === "") errors.push("Program name is required");
  if (program.trigger.value.trim() === "")
    errors.push("Trigger value is required");
  if (program.actions.length === 0) errors.push("Add at least one action");
  for (const action of program.actions) {
    if (
      (action.type === "reply" || action.type === "random") &&
      action.value.trim() === ""
    )
      errors.push("Reply actions need text");
  }
  return errors;
}

import {
  ActionType,
  Block,
  BlockCategory,
  LogicType,
  Program,
  TransformType,
  Trigger,
  TriggerType,
} from "../interfaces/program.ts";

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  equals: "message equals",
  contains: "message contains",
  startsWith: "message starts with",
  endsWith: "message ends with",
};

export const LOGIC_LABELS: Record<LogicType, string> = {
  lengthGreater: "message length is greater than",
  lengthLess: "message length is less than",
  matchesRegex: "message matches regex",
};

export const TRANSFORM_LABELS: Record<TransformType, string> = {
  uppercase: "make uppercase",
  lowercase: "make lowercase",
  trim: "trim whitespace",
  replace: "replace text",
};

export const ACTION_LABELS: Record<ActionType, string> = {
  reply: "reply with text",
  random: "reply random choice",
  echo: "echo the message",
};

export const BLOCK_CATEGORY_LABELS: Record<BlockCategory, string> = {
  logic: "Logic",
  transform: "Transform",
  action: "Action",
};

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createBlock(
  category: BlockCategory,
  kind: LogicType | TransformType | ActionType
): Block {
  return {
    id: generateId(),
    category,
    kind,
    value: "",
    value2: "",
    fallback: "",
  };
}

export function createProgram(name = "New Program"): Program {
  return {
    id: generateId(),
    name,
    trigger: { type: "equals", value: "" },
    blocks: [],
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
    case "endsWith":
      return message.endsWith(trigger.value);
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

export function applyTransform(block: Block, data: string): string {
  switch (block.kind) {
    case "uppercase":
      return data.toUpperCase();
    case "lowercase":
      return data.toLowerCase();
    case "trim":
      return data.trim();
    case "replace":
      return data.split(block.value).join(block.value2);
    default:
      return data;
  }
}

export function checkLogic(block: Block, message: string): boolean {
  switch (block.kind) {
    case "lengthGreater": {
      const n = Number(block.value);
      if (!Number.isFinite(n)) return false;
      return message.length > n;
    }
    case "lengthLess": {
      const n = Number(block.value);
      if (!Number.isFinite(n)) return false;
      return message.length < n;
    }
    case "matchesRegex":
      try {
        return new RegExp(block.value).test(message);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function executeBlocks(
  blocks: Block[],
  message: string,
  random: () => number = Math.random
): string[] {
  let data = message;
  const replies: string[] = [];
  for (const block of blocks) {
    if (block.category === "logic") {
      if (!checkLogic(block, message)) {
        if (block.fallback !== "") replies.push(block.fallback);
        break;
      }
    } else if (block.category === "transform") {
      data = applyTransform(block, data);
    } else {
      // action
      switch (block.kind) {
        case "reply":
          replies.push(block.value);
          break;
        case "random": {
          const options = block.value
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
          const choice = randomChoice(options, random);
          if (choice !== undefined) replies.push(choice);
          break;
        }
        case "echo":
          replies.push(data);
          break;
      }
    }
  }
  return replies;
}

export function executeProgram(
  program: Program,
  message: string,
  random: () => number = Math.random
): string[] {
  if (!matchTrigger(program.trigger, message)) return [];
  return executeBlocks(program.blocks, message, random);
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
  if (program.blocks.length === 0) errors.push("Add at least one block");
  for (const block of program.blocks) {
    if (block.category === "logic") {
      if (block.kind === "matchesRegex") {
        try {
          new RegExp(block.value);
        } catch {
          errors.push("Logic block needs a valid regex");
        }
      } else if (
        block.kind === "lengthGreater" ||
        block.kind === "lengthLess"
      ) {
        if (!Number.isFinite(Number(block.value)))
          errors.push("Logic block needs a number");
      }
    } else if (block.category === "transform") {
      if (block.kind === "replace" && block.value.trim() === "")
        errors.push("Replace block needs text to find");
    } else {
      // action
      if (
        (block.kind === "reply" || block.kind === "random") &&
        block.value.trim() === ""
      )
        errors.push("Reply actions need text");
    }
  }
  return errors;
}

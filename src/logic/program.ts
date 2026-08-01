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

export const TRIGGER_TYPES: TriggerType[] = [
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "notEquals",
  "notContains",
];
export const LOGIC_TYPES: LogicType[] = [
  "lengthGreater",
  "lengthLess",
  "matchesRegex",
  "lengthEquals",
  "isNumber",
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "notEquals",
  "notContains",
];
export const TRANSFORM_TYPES: TransformType[] = [
  "uppercase",
  "lowercase",
  "trim",
  "replace",
  "concat",
  "capitalize",
  "titleCase",
  "reverse",
  "remove",
];
export const ACTION_TYPES: ActionType[] = ["reply", "random", "echo"];

// Logic kinds whose validation requires a numeric block value.
const REQUIRES_NUMERIC = new Set<LogicType>(["lengthGreater", "lengthLess", "lengthEquals"]);

// Logic kinds whose validation requires a non-empty text block value.
const REQUIRES_TEXT = new Set<LogicType>([
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "notEquals",
  "notContains",
]);

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  equals: "message equals",
  contains: "message contains",
  startsWith: "message starts with",
  endsWith: "message ends with",
  notEquals: "message does not equal",
  notContains: "message does not contain",
};

export const LOGIC_LABELS: Record<LogicType, string> = {
  lengthGreater: "message length is greater than",
  lengthLess: "message length is less than",
  matchesRegex: "message matches regex",
  lengthEquals: "message length equals",
  isNumber: "message is a number",
  equals: "message equals",
  contains: "message contains",
  startsWith: "message starts with",
  endsWith: "message ends with",
  notEquals: "message does not equal",
  notContains: "message does not contain",
};

export const TRANSFORM_LABELS: Record<TransformType, string> = {
  uppercase: "make uppercase",
  lowercase: "make lowercase",
  trim: "trim whitespace",
  replace: "replace text",
  concat: "concat text",
  capitalize: "capitalize first letter",
  titleCase: "capitalize each word",
  reverse: "reverse text",
  remove: "remove text",
};

export const ACTION_LABELS: Record<ActionType, string> = {
  reply: "reply with text",
  random: "reply random choice",
  echo: "echo the current message",
};

export const BLOCK_CATEGORY_LABELS: Record<BlockCategory, string> = {
  logic: "Logic",
  transform: "Transform",
  action: "Action",
};

// Plain, human-readable descriptions of what each block type does. Used by
// the palette as an informational reference (blocks are added via card
// buttons, so the palette no longer renders draggable elements).
export const BLOCK_DESCRIPTIONS: {
  trigger: Record<TriggerType, string>;
  logic: Record<LogicType, string>;
  transform: Record<TransformType, string>;
  action: Record<ActionType, string>;
} = {
  trigger: {
    equals: "Runs when the message is exactly the trigger value.",
    contains: "Runs when the message includes the trigger value.",
    startsWith: "Runs when the message begins with the trigger value.",
    endsWith: "Runs when the message ends with the trigger value.",
    notEquals: "Runs when the message is not exactly the trigger value.",
    notContains: "Runs when the message does not include the trigger value.",
  },
  logic: {
    lengthGreater: "Passes when the message is longer than the number.",
    lengthLess: "Passes when the message is shorter than the number.",
    matchesRegex: "Passes when the message matches the regular expression.",
    lengthEquals: "Passes when the message length equals the number.",
    isNumber: "Passes when the message is a number.",
    equals: "Passes when the message is exactly the value.",
    contains: "Passes when the message includes the value.",
    startsWith: "Passes when the message begins with the value.",
    endsWith: "Passes when the message ends with the value.",
    notEquals: "Passes when the message is not exactly the value.",
    notContains: "Passes when the message does not include the value.",
  },
  transform: {
    uppercase: "Changes the message to UPPERCASE.",
    lowercase: "Changes the message to lowercase.",
    trim: "Removes spaces at the start and end.",
    replace: "Replaces matching text with new text.",
    concat: "Adds text before or after the message.",
    capitalize: "Capitalizes the first letter.",
    titleCase: "Capitalizes the first letter of each word.",
    reverse: "Reverses the text.",
    remove: "Removes matching text.",
  },
  action: {
    reply: "Sends a fixed reply.",
    random: "Picks one reply from a list.",
    echo: "Sends the message as it is now.",
  },
};

export function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
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
    case "notEquals":
      return message.trim() !== trigger.value.trim();
    case "notContains":
      return !message.includes(trigger.value);
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
    case "concat":
      return (block.value2 ?? "") + data + (block.value ?? "");
    case "capitalize":
      return data.charAt(0).toUpperCase() + data.slice(1);
    case "titleCase":
      return data.replace(/\b\w/g, (c) => c.toUpperCase());
    case "reverse":
      return [...data].reverse().join("");
    case "remove":
      return data.split(block.value).join("");
    default:
      return data;
  }
}

// Replaces every {key} token in the template with variables[key] when present.
// Tokens with no matching key are left as-is (including "{prev}" if it is not
// in the map). An empty template returns an empty string.
export function interpolate(
  template: string,
  variables: Record<string, string>
): string {
  if (template === "") return "";
  return template.replace(/\{([^}]+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : match
  );
}

// Splits a random-choice block's value into non-empty lines and interpolates
// each line with the variables in scope. Lives at module level so the block
// loop never declares closures over loop variables.
function interpolateOptions(
  value: string,
  variables: Record<string, string>
): string[] {
  return value
    .split("\n")
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .map((line: string) => interpolate(line, variables));
}

// Pure preview of the value that would flow out of a transform node. Used by
// the visual data-flow pipeline. Non-transform blocks (and replace with an
// empty find) pass the input through unchanged.
export function transformPreview(
  block: Block,
  input: string = "Hello World"
): string {
  if (block.category !== "transform") return input;
  if (block.kind === "replace" && block.value.trim() === "") return input;
  return applyTransform(block, input);
}

// A hint describing what value/label flows out of a node in the pipeline.
export type NodeHint =
  | { category: "transform"; text: string; outputVar?: string }
  | { category: "logic"; fallback: string }
  | { category: "action"; text: string };

// Pure preview of the data-flow pipeline using the default "Hello World" user
// message. Returns a hint describing what flows out of each node, plus the
// value that flowed into each node (used for the echo preview).
export function computeFlowPreview(
  blocks: Block[]
): { hints: Map<string, NodeHint>; flowingByBlock: Map<string, string> } {
  const hints = new Map<string, NodeHint>();
  const flowingByBlock = new Map<string, string>();
  let flowing = "Hello World";
  for (const b of blocks) {
    flowingByBlock.set(b.id, flowing);
    if (b.category === "transform") {
      flowing = transformPreview(b, flowing);
      hints.set(b.id, {
        category: "transform",
        text: flowing,
        outputVar: b.outputVar,
      });
    } else if (b.category === "logic") {
      hints.set(b.id, { category: "logic", fallback: b.fallback });
    } else {
      let text: string;
      if (b.kind === "reply") {
        text = `reply: ${b.value || "(empty)"}`;
      } else if (b.kind === "random") {
        const opts = b.value
          .split("\n")
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
        text =
          opts.length > 0
            ? `random: ${opts.map((o) => `"${o}"`).join(", ")}`
            : "random: (no options)";
      } else {
        text = `echo: ${flowing}`;
      }
      hints.set(b.id, { category: "action", text });
    }
  }
  return { hints, flowingByBlock };
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
    case "lengthEquals": {
      const n = Number(block.value);
      if (!Number.isFinite(n)) return false;
      return message.length === n;
    }
    case "isNumber":
      return (
        message.trim() !== "" && Number.isFinite(Number(message.trim()))
      );
    case "equals":
      return message.trim() === block.value.trim();
    case "contains":
      return message.includes(block.value);
    case "startsWith":
      return message.startsWith(block.value);
    case "endsWith":
      return message.endsWith(block.value);
    case "notEquals":
      return message.trim() !== block.value.trim();
    case "notContains":
      return !message.includes(block.value);
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
  const variables: Record<string, string> = {};
  const replies: string[] = [];
  for (const block of blocks) {
    const vars = { prev: data, ...variables };
    if (block.category === "logic") {
      // Gates evaluate the message as it flows (after earlier transforms),
      // matching the {prev} variable and the visual pipeline.
      if (!checkLogic(block, data)) {
        if (block.fallback !== "") {
          replies.push(interpolate(block.fallback, vars));
        }
        break;
      }
    } else if (block.category === "transform") {
      // concat interpolates its value/value2 with {variables} before applying,
      // so users can splice message text or named outputs into the combined
      // result. By contrast, replace/remove treat their value as literal find
      // text (no interpolation), so this branch only special-cases concat.
      if (block.kind === "concat") {
        data = applyTransform(
          {
            ...block,
            value: interpolate(block.value ?? "", vars),
            value2: interpolate(block.value2 ?? "", vars),
          },
          data
        );
      } else {
        data = applyTransform(block, data);
      }
      if (block.outputVar && block.outputVar !== "") {
        variables[block.outputVar] = data;
      }
    } else {
      // action
      switch (block.kind) {
        case "reply":
          replies.push(interpolate(block.value, vars));
          break;
        case "random": {
          const options = interpolateOptions(block.value, vars);
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
      } else if (REQUIRES_NUMERIC.has(block.kind)) {
        if (!Number.isFinite(Number(block.value)))
          errors.push("Logic block needs a number");
      } else if (REQUIRES_TEXT.has(block.kind)) {
        if (block.value.trim() === "")
          errors.push("Logic block needs text to compare");
      }
    } else if (block.category === "transform") {
      if (block.kind === "replace" && block.value.trim() === "")
        errors.push("Replace block needs text to find");
      if (block.kind === "remove" && block.value.trim() === "")
        errors.push("Remove block needs text to remove");
      if (
        block.kind === "concat" &&
        block.value.trim() === "" &&
        block.value2.trim() === ""
      )
        errors.push("Concat block needs text to append or prepend");
      if (block.outputVar && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(block.outputVar))
        errors.push("Variable name must be letters, numbers or underscores");
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

// Pure helper: swaps a block with its immediate neighbor (up for -1, down for
// +1). Returns a new array, or the input reference when the block is missing
// or the target index would be out of bounds.
export function moveBlock(
  blocks: Block[],
  blockId: string,
  direction: -1 | 1
): Block[] {
  const index = blocks.findIndex((b) => b.id === blockId);
  if (index === -1) return blocks;
  const target = index + direction;
  if (target < 0 || target >= blocks.length) return blocks;
  const next = blocks.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// Pure helper: removes a block from its current position and re-inserts it at
// the requested index (clamped to valid bounds). Returns a new array, or the
// input reference when the block is missing or already at the target index.
export function moveBlockToIndex(
  blocks: Block[],
  blockId: string,
  targetIndex: number
): Block[] {
  const index = blocks.findIndex((b) => b.id === blockId);
  if (index === -1) return blocks;
  const target = Math.max(0, Math.min(targetIndex, blocks.length - 1));
  if (target === index) return blocks;
  const next = blocks.slice();
  const [block] = next.splice(index, 1);
  next.splice(target, 0, block);
  return next;
}

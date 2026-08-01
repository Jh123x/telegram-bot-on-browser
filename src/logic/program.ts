import {
  Block,
  Program,
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

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  equals: "message equals",
  contains: "message contains",
  startsWith: "message starts with",
  endsWith: "message ends with",
  notEquals: "message does not equal",
  notContains: "message does not contain",
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
    case "notStartsWith":
      return !message.startsWith(block.value);
    case "notEndsWith":
      return !message.endsWith(block.value);
    case "notLengthGreater": {
      const n = Number(block.value);
      if (!Number.isFinite(n)) return false;
      return !(message.length > n);
    }
    case "notLengthLess": {
      const n = Number(block.value);
      if (!Number.isFinite(n)) return false;
      return !(message.length < n);
    }
    case "notLengthEquals": {
      const n = Number(block.value);
      if (!Number.isFinite(n)) return false;
      return !(message.length === n);
    }
    case "notMatchesRegex":
      try {
        return !new RegExp(block.value).test(message);
      } catch {
        return false;
      }
    case "notIsNumber":
      return !(
        message.trim() !== "" && Number.isFinite(Number(message.trim()))
      );
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

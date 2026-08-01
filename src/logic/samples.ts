import { Block, Program } from "../interfaces/program.ts";
import { generateId } from "./program.ts";

export interface ProgramSample {
  name: string;
  trigger: Program["trigger"];
  blocks: Block[];
}

// Module-local builder that fills in the repeated `value2`/`fallback` defaults
// and a fresh id (programFromSample regenerates ids anyway, but this keeps each
// sample self-contained).
const sb = (
  category: Block["category"],
  kind: Block["kind"],
  value = "",
  extra: Partial<Block> = {}
): Block => ({
  id: generateId(),
  category,
  kind,
  value,
  value2: "",
  fallback: "",
  ...extra,
});

export const SAMPLE_PROGRAMS: ProgramSample[] = [
  {
    name: "Welcome",
    trigger: { type: "equals", value: "/start" },
    blocks: [
      sb("action", "reply", "Welcome! I'm a browser bot 🤖"),
    ],
  },
  {
    name: "Coin Flip",
    trigger: { type: "equals", value: "/flip" },
    blocks: [
      sb("action", "random", "Heads\nTails"),
    ],
  },
  {
    name: "Help",
    trigger: { type: "contains", value: "help" },
    blocks: [
      sb("action", "reply", "Try /start, /flip, /shout, or say 'say hello'."),
    ],
  },
  {
    name: "Echo Clean",
    trigger: { type: "startsWith", value: "say " },
    blocks: [
      sb("transform", "replace", "say "),
      sb("action", "echo"),
    ],
  },
  {
    name: "Shout",
    trigger: { type: "contains", value: "shout" },
    blocks: [
      sb("transform", "uppercase"),
      sb("action", "echo"),
    ],
  },
  {
    name: "Shout Back",
    trigger: { type: "contains", value: "shout" },
    blocks: [
      sb("transform", "uppercase", "", { outputVar: "shouted" }),
      sb("action", "reply", "You shouted: {shouted}!"),
    ],
  },
  {
    name: "Short Replies",
    trigger: { type: "startsWith", value: "/short" },
    blocks: [
      sb("logic", "lengthLess", "10", {
        fallback: "Too long! Keep it under 10 characters.",
      }),
      sb("transform", "replace", "/short "),
      sb("action", "echo"),
    ],
  },
  {
    name: "Only Numbers",
    trigger: { type: "startsWith", value: "/num " },
    blocks: [
      sb("transform", "remove", "/num "),
      sb("logic", "isNumber", "", { fallback: "That's not a number!" }),
      sb("action", "echo"),
    ],
  },
  {
    name: "Title Case",
    trigger: { type: "startsWith", value: "/title " },
    blocks: [
      sb("transform", "remove", "/title "),
      sb("transform", "titleCase"),
      sb("action", "echo"),
    ],
  },
  {
    name: "Palindrome",
    trigger: { type: "startsWith", value: "/reverse " },
    blocks: [
      sb("transform", "remove", "/reverse "),
      sb("transform", "reverse"),
      sb("action", "echo"),
    ],
  },
  {
    name: "Capitalize",
    trigger: { type: "startsWith", value: "/cap " },
    blocks: [
      sb("transform", "remove", "/cap "),
      sb("transform", "capitalize"),
      sb("action", "echo"),
    ],
  },
];

export function programFromSample(sample: ProgramSample): Program {
  return {
    id: generateId(),
    name: sample.name,
    trigger: { ...sample.trigger },
    blocks: sample.blocks.map((block) => ({
      ...block,
      id: generateId(),
    })),
  };
}

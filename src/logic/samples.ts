import { Program } from "../interfaces/program.ts";
import { generateId } from "./program.ts";

export interface ProgramSample {
  name: string;
  trigger: Program["trigger"];
  blocks: {
    id: string;
    category: Program["blocks"][number]["category"];
    kind: Program["blocks"][number]["kind"];
    value: string;
    value2: string;
    fallback: string;
  }[];
}

export const SAMPLE_PROGRAMS: ProgramSample[] = [
  {
    name: "Welcome",
    trigger: { type: "equals", value: "/start" },
    blocks: [
      {
        id: "sample-welcome",
        category: "action",
        kind: "reply",
        value: "Welcome! I'm a browser bot 🤖",
        value2: "",
        fallback: "",
      },
    ],
  },
  {
    name: "Coin Flip",
    trigger: { type: "equals", value: "/flip" },
    blocks: [
      {
        id: "sample-flip",
        category: "action",
        kind: "random",
        value: "Heads\nTails",
        value2: "",
        fallback: "",
      },
    ],
  },
  {
    name: "Help",
    trigger: { type: "contains", value: "help" },
    blocks: [
      {
        id: "sample-help",
        category: "action",
        kind: "reply",
        value: "Try /start, /flip, /shout, or say 'say hello'.",
        value2: "",
        fallback: "",
      },
    ],
  },
  {
    name: "Echo Clean",
    trigger: { type: "startsWith", value: "say " },
    blocks: [
      {
        id: "sample-echo-clean",
        category: "transform",
        kind: "replace",
        value: "say ",
        value2: "",
        fallback: "",
      },
      {
        id: "sample-echo-clean-2",
        category: "action",
        kind: "echo",
        value: "",
        value2: "",
        fallback: "",
      },
    ],
  },
  {
    name: "Shout",
    trigger: { type: "contains", value: "shout" },
    blocks: [
      {
        id: "sample-shout",
        category: "transform",
        kind: "uppercase",
        value: "",
        value2: "",
        fallback: "",
      },
      {
        id: "sample-shout-2",
        category: "action",
        kind: "echo",
        value: "",
        value2: "",
        fallback: "",
      },
    ],
  },
  {
    name: "Short Replies",
    trigger: { type: "startsWith", value: "/short" },
    blocks: [
      {
        id: "sample-short",
        category: "logic",
        kind: "lengthLess",
        value: "10",
        value2: "",
        fallback: "Too long! Keep it under 10 characters.",
      },
      {
        id: "sample-short-1",
        category: "transform",
        kind: "replace",
        value: "/short ",
        value2: "",
        fallback: "",
      },
      {
        id: "sample-short-2",
        category: "action",
        kind: "echo",
        value: "",
        value2: "",
        fallback: "",
      },
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

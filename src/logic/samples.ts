import { Program } from "../interfaces/program.ts";
import { generateId } from "./program.ts";

export interface ProgramSample {
  name: string;
  trigger: Program["trigger"];
  actions: {
    id: string;
    type: Program["actions"][number]["type"];
    value: string;
  }[];
}

export const SAMPLE_PROGRAMS: ProgramSample[] = [
  {
    name: "Welcome",
    trigger: { type: "equals", value: "/start" },
    actions: [{ id: "sample-welcome", type: "reply", value: "Welcome! I'm a browser bot 🤖" }],
  },
  {
    name: "Coin Flip",
    trigger: { type: "equals", value: "/flip" },
    actions: [{ id: "sample-flip", type: "random", value: "Heads\nTails" }],
  },
  {
    name: "Help",
    trigger: { type: "contains", value: "help" },
    actions: [{ id: "sample-help", type: "reply", value: "Try /start, /flip, or say 'say hello'." }],
  },
  {
    name: "Echo",
    trigger: { type: "startsWith", value: "say " },
    actions: [{ id: "sample-echo", type: "echo", value: "" }],
  },
];

export function programFromSample(sample: ProgramSample): Program {
  return {
    id: generateId(),
    name: sample.name,
    trigger: { ...sample.trigger },
    actions: sample.actions.map((action) => ({
      ...action,
      id: generateId(),
    })),
  };
}

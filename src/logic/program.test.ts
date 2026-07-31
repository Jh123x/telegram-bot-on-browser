import {
  Trigger,
  Action,
  Program,
  ActionType,
  TriggerType,
} from "../interfaces/program";
import {
  matchTrigger,
  executeActions,
  compileProgram,
  findMatchingProgram,
  validateProgram,
  createProgram,
  createAction,
  generateId,
} from "../logic/program";
import {
  ProgramSample,
  SAMPLE_PROGRAMS,
  programFromSample,
} from "../logic/samples";
import { test, expect } from "@jest/globals";

describe("matchTrigger", () => {
  test("equals: exact match is true", () => {
    const trigger: Trigger = { type: "equals", value: "hello" };
    expect(matchTrigger(trigger, "hello")).toBe(true);
  });

  test("equals: surrounding whitespace is trimmed", () => {
    const trigger: Trigger = { type: "equals", value: "hello" };
    expect(matchTrigger(trigger, "  hello ")).toBe(true);
  });

  test("equals: different message is false", () => {
    const trigger: Trigger = { type: "equals", value: "hello" };
    expect(matchTrigger(trigger, "hello!")).toBe(false);
  });

  test("contains: message containing the value is true", () => {
    const trigger: Trigger = { type: "contains", value: "help" };
    expect(matchTrigger(trigger, "please help me")).toBe(true);
  });

  test("contains: value not in message is false", () => {
    const trigger: Trigger = { type: "contains", value: "help" };
    expect(matchTrigger(trigger, "goodbye")).toBe(false);
  });

  test("startsWith: message starting with value is true", () => {
    const trigger: Trigger = { type: "startsWith", value: "say " };
    expect(matchTrigger(trigger, "say hello")).toBe(true);
  });

  test("startsWith: message not starting with value is false", () => {
    const trigger: Trigger = { type: "startsWith", value: "say " };
    expect(matchTrigger(trigger, "sayhello")).toBe(false);
  });
});

describe("executeActions", () => {
  test("reply action returns its value", () => {
    const actions: Action[] = [{ id: "a1", type: "reply", value: "hi" }];
    expect(executeActions(actions, "ignored")).toEqual(["hi"]);
  });

  test("random action with random 0 picks first line", () => {
    const actions: Action[] = [
      { id: "a1", type: "random", value: "first\nsecond\nthird" },
    ];
    expect(executeActions(actions, "ignored", () => 0)).toEqual(["first"]);
  });

  test("random action with random 0.99 picks last line", () => {
    const actions: Action[] = [
      { id: "a1", type: "random", value: "first\nsecond\nthird" },
    ];
    expect(executeActions(actions, "ignored", () => 0.99)).toEqual(["third"]);
  });

  test("random action splits on newlines, trims lines and drops empty ones", () => {
    const actions: Action[] = [
      { id: "a1", type: "random", value: "  one  \n\n  two  \n" },
    ];
    expect(executeActions(actions, "ignored", () => 0)).toEqual(["one"]);
    expect(executeActions(actions, "ignored", () => 0.99)).toEqual(["two"]);
  });

  test("random action with no valid lines returns []", () => {
    const actions: Action[] = [
      { id: "a1", type: "random", value: "\n  \n" },
    ];
    expect(executeActions(actions, "ignored", () => 0)).toEqual([]);
  });

  test("echo action returns the message", () => {
    const actions: Action[] = [{ id: "a1", type: "echo", value: "" }];
    expect(executeActions(actions, "hello there")).toEqual(["hello there"]);
  });

  test("multiple actions produce responses in order", () => {
    const actions: Action[] = [
      { id: "a1", type: "reply", value: "one" },
      { id: "a2", type: "echo", value: "" },
      { id: "a3", type: "reply", value: "three" },
    ];
    expect(executeActions(actions, "msg")).toEqual(["one", "msg", "three"]);
  });

  test("empty actions return []", () => {
    expect(executeActions([], "msg")).toEqual([]);
  });
});

describe("compileProgram", () => {
  test("matching message -> action responses", () => {
    const program: Program = {
      id: "p1",
      name: "Greet",
      trigger: { type: "equals", value: "hi" },
      actions: [{ id: "a1", type: "reply", value: "hello!" }],
    };
    const fn = compileProgram(program);
    expect(fn("hi")).toEqual(["hello!"]);
  });

  test("non-matching message -> []", () => {
    const program: Program = {
      id: "p1",
      name: "Greet",
      trigger: { type: "equals", value: "hi" },
      actions: [{ id: "a1", type: "reply", value: "hello!" }],
    };
    const fn = compileProgram(program);
    expect(fn("bye")).toEqual([]);
  });
});

describe("findMatchingProgram", () => {
  test("returns first program whose trigger matches", () => {
    const programs: Program[] = [
      { id: "p1", name: "A", trigger: { type: "equals", value: "yes" }, actions: [] },
      { id: "p2", name: "B", trigger: { type: "equals", value: "hello" }, actions: [] },
    ];
    const result = findMatchingProgram(programs, "hello");
    expect(result).toBe(programs[1]);
  });

  test("returns undefined when none match", () => {
    const programs: Program[] = [
      { id: "p1", name: "A", trigger: { type: "equals", value: "yes" }, actions: [] },
    ];
    expect(findMatchingProgram(programs, "no")).toBeUndefined();
  });
});

describe("validateProgram", () => {
  const validProgram = (): Program => ({
    id: "p1",
    name: "My Program",
    trigger: { type: "equals", value: "/start" },
    actions: [{ id: "a1", type: "reply", value: "hi" }],
  });

  test("errors when name is empty", () => {
    const program = validProgram();
    program.name = "   ";
    expect(validateProgram(program)).toContain("Program name is required");
  });

  test("errors when trigger value is empty", () => {
    const program = validProgram();
    program.trigger.value = "  ";
    expect(validateProgram(program)).toContain("Trigger value is required");
  });

  test("errors when there are zero actions", () => {
    const program = validProgram();
    program.actions = [];
    expect(validateProgram(program)).toContain("Add at least one action");
  });

  test("errors when reply/random action has empty value", () => {
    const program = validProgram();
    program.actions.push({ id: "a2", type: "reply", value: " " });
    const errors = validateProgram(program);
    expect(errors).toContain("Reply actions need text");
  });

  test("returns [] for a valid program", () => {
    expect(validateProgram(validProgram())).toEqual([]);
  });
});

describe("createProgram", () => {
  test("returns a program with non-empty id, default trigger and empty actions", () => {
    const program = createProgram();
    expect(program.id.length).toBeGreaterThan(0);
    expect(program.trigger).toEqual({ type: "equals", value: "" });
    expect(program.actions).toEqual([]);
  });
});

describe("generateId", () => {
  test("returns non-empty ids and differs between calls", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1.length).toBeGreaterThan(0);
    expect(id2.length).toBeGreaterThan(0);
    expect(id1).not.toBe(id2);
  });
});

describe("programFromSample", () => {
  test("returns a Program with fresh ids", () => {
    const sample: ProgramSample = SAMPLE_PROGRAMS[0];
    const program = programFromSample(sample);
    expect(program.name).toBe(sample.name);
    expect(program.trigger).toEqual(sample.trigger);
    expect(program.actions).toHaveLength(sample.actions.length);
    expect(program.actions[0].type).toBe(sample.actions[0].type);
    expect(program.actions[0].value).toBe(sample.actions[0].value);
    expect(program.actions[0].id).not.toBe(sample.actions[0].id);
  });
});

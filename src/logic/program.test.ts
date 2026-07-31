import {
  Trigger,
  Block,
  Program,
  BlockCategory,
} from "../interfaces/program";
import {
  matchTrigger,
  applyTransform,
  checkLogic,
  executeBlocks,
  executeProgram,
  findMatchingProgram,
  validateProgram,
  createProgram,
  createBlock,
  generateId,
} from "../logic/program";
import { SAMPLE_PROGRAMS, programFromSample } from "../logic/samples";
import { test, expect } from "@jest/globals";

const actionBlock = (
  kind: "reply" | "random" | "echo",
  value = "",
  value2 = ""
): Block => ({ id: generateId(), category: "action", kind, value, value2, fallback: "" });

const transformBlock = (
  kind: "uppercase" | "lowercase" | "trim" | "replace",
  value = "",
  value2 = ""
): Block => ({ id: generateId(), category: "transform", kind, value, value2, fallback: "" });

const logicBlock = (
  kind: "lengthGreater" | "lengthLess" | "matchesRegex",
  value = "",
  fallback = ""
): Block => ({ id: generateId(), category: "logic", kind, value, value2: "", fallback });

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

  test("endsWith: message ending with value is true", () => {
    const trigger: Trigger = { type: "endsWith", value: "hello" };
    expect(matchTrigger(trigger, "say hello")).toBe(true);
  });

  test("endsWith: message not ending with value is false", () => {
    const trigger: Trigger = { type: "endsWith", value: "hello" };
    expect(matchTrigger(trigger, "hello world")).toBe(false);
  });
});

describe("applyTransform", () => {
  test("uppercase uppercases the data", () => {
    const block = transformBlock("uppercase");
    expect(applyTransform(block, "say hello")).toBe("SAY HELLO");
  });

  test("lowercase lowercases the data", () => {
    const block = transformBlock("lowercase");
    expect(applyTransform(block, "SAY HELLO")).toBe("say hello");
  });

  test("trim removes surrounding whitespace", () => {
    const block = transformBlock("trim");
    expect(applyTransform(block, "  hi  ")).toBe("hi");
  });

  test("replace swaps one string for another", () => {
    const block = transformBlock("replace", "say ", "");
    expect(applyTransform(block, "say hello")).toBe("hello");
  });

  test("replace treats value literally even with regex chars", () => {
    const block = transformBlock("replace", "a+b", "x");
    expect(applyTransform(block, "a+b c")).toBe("x c");
  });

  test("replace leaves data unchanged when value not found", () => {
    const block = transformBlock("replace", "boo", "x");
    expect(applyTransform(block, "hello")).toBe("hello");
  });

  test("unknown kind returns data unchanged", () => {
    const block = {
      id: "b1",
      category: "transform" as BlockCategory,
      kind: "bogus" as unknown as "uppercase" | "lowercase" | "trim" | "replace",
      value: "",
      value2: "",
      fallback: "",
    };
    expect(applyTransform(block, " unchanged ")).toBe(" unchanged ");
  });
});

describe("checkLogic", () => {
  test("lengthGreater: returns true when message length is greater", () => {
    const block = logicBlock("lengthGreater", "3");
    expect(checkLogic(block, "hello")).toBe(true);
  });

  test("lengthGreater: returns false when message length is not greater", () => {
    const block = logicBlock("lengthGreater", "5");
    expect(checkLogic(block, "hi")).toBe(false);
  });

  test("lengthGreater: non-numeric value returns false", () => {
    const block = logicBlock("lengthGreater", "abc");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("lengthLess: returns true when message length is less", () => {
    const block = logicBlock("lengthLess", "10");
    expect(checkLogic(block, "hi")).toBe(true);
  });

  test("lengthLess: returns false when message length is not less", () => {
    const block = logicBlock("lengthLess", "3");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("matchesRegex: returns true when regex matches", () => {
    const block = logicBlock("matchesRegex", "^\\d+$");
    expect(checkLogic(block, "123")).toBe(true);
  });

  test("matchesRegex: returns false when regex does not match", () => {
    const block = logicBlock("matchesRegex", "^\\d+$");
    expect(checkLogic(block, "abc")).toBe(false);
  });

  test("matchesRegex: invalid regex returns false without throwing", () => {
    const block = logicBlock("matchesRegex", "(");
    expect(() => checkLogic(block, "abc")).not.toThrow();
    expect(checkLogic(block, "abc")).toBe(false);
  });
});

describe("executeBlocks", () => {
  test("logic gate stops flow when false (no replies after it)", () => {
    const blocks: Block[] = [
      logicBlock("lengthGreater", "100"),
      actionBlock("echo"),
    ];
    expect(executeBlocks(blocks, "hi")).toEqual([]);
  });

  test("logic fallback reply is used when logic false", () => {
    const blocks: Block[] = [
      logicBlock("lengthGreater", "100", "That's all you have to say?"),
      actionBlock("echo"),
    ];
    expect(executeBlocks(blocks, "hi")).toEqual(["That's all you have to say?"]);
  });

  test("transform then echo applies pipeline", () => {
    const blocks: Block[] = [
      transformBlock("replace", "say ", ""),
      actionBlock("echo"),
    ];
    expect(executeBlocks(blocks, "say hello")).toEqual(["hello"]);
  });

  test("uppercase then echo", () => {
    const blocks: Block[] = [transformBlock("uppercase"), actionBlock("echo")];
    expect(executeBlocks(blocks, "hello")).toEqual(["HELLO"]);
  });

  test("multiple replies come out in order", () => {
    const blocks: Block[] = [
      actionBlock("reply", "one"),
      actionBlock("echo"),
      actionBlock("reply", "three"),
    ];
    expect(executeBlocks(blocks, "msg")).toEqual(["one", "msg", "three"]);
  });

  test("random with injected random 0 picks first", () => {
    const blocks: Block[] = [actionBlock("random", "first\nsecond\nthird")];
    expect(executeBlocks(blocks, "msg", () => 0)).toEqual(["first"]);
  });

  test("random with injected random 0.99 picks last", () => {
    const blocks: Block[] = [actionBlock("random", "first\nsecond\nthird")];
    expect(executeBlocks(blocks, "msg", () => 0.99)).toEqual(["third"]);
  });

  test("empty blocks return []", () => {
    expect(executeBlocks([], "msg")).toEqual([]);
  });

  test("logic true continues the pipeline", () => {
    const blocks: Block[] = [
      logicBlock("lengthGreater", "0"),
      actionBlock("echo"),
    ];
    expect(executeBlocks(blocks, "anything")).toEqual(["anything"]);
  });
});

describe("executeProgram", () => {
  test("matching trigger runs the blocks", () => {
    const program: Program = {
      id: "p1",
      name: "Greet",
      trigger: { type: "equals", value: "hi" },
      blocks: [actionBlock("reply", "hello!")],
    };
    expect(executeProgram(program, "hi")).toEqual(["hello!"]);
  });

  test("non-matching trigger returns []", () => {
    const program: Program = {
      id: "p1",
      name: "Greet",
      trigger: { type: "equals", value: "hi" },
      blocks: [actionBlock("reply", "hello!")],
    };
    expect(executeProgram(program, "bye")).toEqual([]);
  });
});

describe("findMatchingProgram", () => {
  test("returns first program whose trigger matches", () => {
    const programs: Program[] = [
      { id: "p1", name: "A", trigger: { type: "equals", value: "yes" }, blocks: [] },
      { id: "p2", name: "B", trigger: { type: "equals", value: "hello" }, blocks: [] },
    ];
    const result = findMatchingProgram(programs, "hello");
    expect(result).toBe(programs[1]);
  });

  test("returns undefined when none match", () => {
    const programs: Program[] = [
      { id: "p1", name: "A", trigger: { type: "equals", value: "yes" }, blocks: [] },
    ];
    expect(findMatchingProgram(programs, "no")).toBeUndefined();
  });
});

describe("validateProgram", () => {
  const validProgram = (): Program => ({
    id: "p1",
    name: "My Program",
    trigger: { type: "equals", value: "/start" },
    blocks: [actionBlock("reply", "hi")],
  });

  test("returns [] for a valid program", () => {
    expect(validateProgram(validProgram())).toEqual([]);
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

  test("errors when there are zero blocks", () => {
    const program = validProgram();
    program.blocks = [];
    expect(validateProgram(program)).toContain("Add at least one block");
  });

  test("logic matchesRegex with invalid regex is an error", () => {
    const program = validProgram();
    program.blocks.push(logicBlock("matchesRegex", "("));
    expect(validateProgram(program)).toContain("Logic block needs a valid regex");
  });

  test("logic lengthGreater with non-numeric value is an error", () => {
    const program = validProgram();
    program.blocks.push(logicBlock("lengthGreater", "abc"));
    expect(validateProgram(program)).toContain("Logic block needs a number");
  });

  test("replace transform with empty value is an error", () => {
    const program = validProgram();
    program.blocks.push(transformBlock("replace", ""));
    expect(validateProgram(program)).toContain("Replace block needs text to find");
  });

  test("reply action with empty value is an error", () => {
    const program = validProgram();
    program.blocks.push(actionBlock("reply", " "));
    expect(validateProgram(program)).toContain("Reply actions need text");
  });
});

describe("createBlock", () => {
  test("returns a block with defaults", () => {
    const block = createBlock("action", "reply");
    expect(block.category).toBe("action");
    expect(block.kind).toBe("reply");
    expect(block.value).toBe("");
    expect(block.value2).toBe("");
    expect(block.fallback).toBe("");
    expect(block.id.length).toBeGreaterThan(0);
  });
});

describe("createProgram", () => {
  test("returns a program with non-empty id, default trigger and empty blocks", () => {
    const program = createProgram();
    expect(program.id.length).toBeGreaterThan(0);
    expect(program.trigger).toEqual({ type: "equals", value: "" });
    expect(program.blocks).toEqual([]);
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
  test("returns a Program with fresh ids including all block ids", () => {
    const sample = SAMPLE_PROGRAMS[0];
    const program = programFromSample(sample);
    expect(program.name).toBe(sample.name);
    expect(program.trigger).toEqual(sample.trigger);
    expect(program.blocks).toHaveLength(sample.blocks.length);
    expect(program.blocks[0].kind).toBe(sample.blocks[0].kind);
    expect(program.blocks[0].value).toBe(sample.blocks[0].value);
    expect(program.blocks[0].id).not.toBe(sample.blocks[0].id);
  });
});

describe("Short Replies sample program", () => {
  const shortProgram = () => {
    const sample = SAMPLE_PROGRAMS.find((s) => s.name === "Short Replies");
    if (!sample) throw new Error("Short Replies sample not found");
    return programFromSample(sample);
  };

  test("echoes a short message that passes the length gate", () => {
    expect(executeProgram(shortProgram(), "/short hi")).toEqual(["hi"]);
  });

  test("rejects a long message with the fallback text", () => {
    expect(executeProgram(shortProgram(), "/short hello world this is long")).toEqual([
      "Too long! Keep it under 10 characters.",
    ]);
  });

  test("does not trigger on a plain message without the /short prefix", () => {
    expect(executeProgram(shortProgram(), "plain message")).toEqual([]);
  });
});

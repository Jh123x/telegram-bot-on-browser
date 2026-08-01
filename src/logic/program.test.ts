import {
  Trigger,
  Block,
  Program,
  BlockCategory,
} from "../interfaces/program";
import {
  matchTrigger,
  applyTransform,
  transformPreview,
  computeFlowPreview,
  checkLogic,
  executeBlocks,
  executeProgram,
  findMatchingProgram,
  validateProgram,
  createProgram,
  createBlock,
  generateId,
  interpolate,
  moveBlock,
  moveBlockToIndex,
  BLOCK_DESCRIPTIONS,
  TRIGGER_LABELS,
  LOGIC_LABELS,
  TRANSFORM_LABELS,
  ACTION_LABELS,
  TRIGGER_TYPES,
  LOGIC_TYPES,
  TRANSFORM_TYPES,
  ACTION_TYPES,
} from "../logic/program";
import { SAMPLE_PROGRAMS, programFromSample } from "../logic/samples";
import { test, expect } from "@jest/globals";

const actionBlock = (
  kind: "reply" | "random" | "echo",
  value = "",
  value2 = ""
): Block => ({ id: generateId(), category: "action", kind, value, value2, fallback: "" });

const transformBlock = (
  kind:
    | "uppercase"
    | "lowercase"
    | "trim"
    | "replace"
    | "concat"
    | "capitalize"
    | "titleCase"
    | "reverse"
    | "remove",
  value = "",
  value2 = ""
): Block => ({ id: generateId(), category: "transform", kind, value, value2, fallback: "" });

const logicBlock = (
  kind:
    | "lengthGreater"
    | "lengthLess"
    | "matchesRegex"
    | "lengthEquals"
    | "isNumber",
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

  test("notEquals: different message is true", () => {
    const trigger: Trigger = { type: "notEquals", value: "hello" };
    expect(matchTrigger(trigger, "goodbye")).toBe(true);
  });

  test("notEquals: exact match is false", () => {
    const trigger: Trigger = { type: "notEquals", value: "hello" };
    expect(matchTrigger(trigger, "hello")).toBe(false);
  });

  test("notEquals: surrounding whitespace is trimmed before comparing", () => {
    const trigger: Trigger = { type: "notEquals", value: "hello" };
    expect(matchTrigger(trigger, "  hello ")).toBe(false);
  });

  test("notContains: message not containing the value is true", () => {
    const trigger: Trigger = { type: "notContains", value: "help" };
    expect(matchTrigger(trigger, "goodbye")).toBe(true);
  });

  test("notContains: message containing the value is false", () => {
    const trigger: Trigger = { type: "notContains", value: "help" };
    expect(matchTrigger(trigger, "please help me")).toBe(false);
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

  test("capitalize uppercases only the first letter", () => {
    const block = transformBlock("capitalize");
    expect(applyTransform(block, "hello")).toBe("Hello");
  });

  test("capitalize leaves the rest of the string unchanged", () => {
    const block = transformBlock("capitalize");
    expect(applyTransform(block, "hELLO")).toBe("HELLO");
  });

  test("capitalize on an empty string returns empty", () => {
    const block = transformBlock("capitalize");
    expect(applyTransform(block, "")).toBe("");
  });

  test("titleCase capitalizes the first letter of each word", () => {
    const block = transformBlock("titleCase");
    expect(applyTransform(block, "hello world")).toBe("Hello World");
  });

  test("titleCase preserves spacing between words", () => {
    const block = transformBlock("titleCase");
    expect(applyTransform(block, "hello   world")).toBe("Hello   World");
  });

  test("reverse reverses the characters", () => {
    const block = transformBlock("reverse");
    expect(applyTransform(block, "abc")).toBe("cba");
  });

  test("reverse keeps surrogate pairs (emoji) intact", () => {
    const block = transformBlock("reverse");
    expect(applyTransform(block, "ab👍cd")).toBe("dc👍ba");
  });

  test("remove strips all matching text", () => {
    const block = transformBlock("remove", "l");
    expect(applyTransform(block, "hello world")).toBe("heo word");
  });

  test("remove with an empty find is identity", () => {
    const block = transformBlock("remove", "");
    expect(applyTransform(block, "hello")).toBe("hello");
  });
});

describe("transformPreview", () => {
  test("uppercase transforms the default Hello World input to HELLO WORLD", () => {
    const block = transformBlock("uppercase");
    expect(transformPreview(block)).toBe("HELLO WORLD");
  });

  test("lowercase lowercases the input", () => {
    const block = transformBlock("lowercase");
    expect(transformPreview(block, "Say Hello")).toBe("say hello");
  });

  test("trim removes surrounding whitespace", () => {
    const block = transformBlock("trim");
    expect(transformPreview(block, "  Hello World  ")).toBe("Hello World");
  });

  test("replace swaps the found text for the replacement", () => {
    const block = transformBlock("replace", "World", "There");
    expect(transformPreview(block, "Hello World")).toBe("Hello There");
  });

  test("replace with an empty find leaves the input unchanged", () => {
    const block = transformBlock("replace", "", "There");
    expect(transformPreview(block, "Hello World")).toBe("Hello World");
  });

  test("non-transform block returns the input unchanged", () => {
    const block = actionBlock("echo");
    expect(transformPreview(block, "Hello World")).toBe("Hello World");
  });

  test("capitalize previews the first letter uppercased", () => {
    const block = transformBlock("capitalize");
    expect(transformPreview(block, "hello world")).toBe("Hello world");
  });

  test("titleCase previews each word capitalized", () => {
    const block = transformBlock("titleCase");
    expect(transformPreview(block, "hello world")).toBe("Hello World");
  });

  test("reverse previews the text reversed", () => {
    const block = transformBlock("reverse");
    expect(transformPreview(block, "abc")).toBe("cba");
  });

  test("remove previews the text with matches stripped", () => {
    const block = transformBlock("remove", "l");
    expect(transformPreview(block, "Hello World")).toBe("Heo Word");
  });

  test("remove preview with an empty find passes the input through", () => {
    const block = transformBlock("remove", "");
    expect(transformPreview(block, "Hello World")).toBe("Hello World");
  });
});

describe("computeFlowPreview", () => {
  test("a transform block yields a flowing preview hint with the transformed text", () => {
    const blocks: Block[] = [transformBlock("uppercase")];
    const { hints, flowingByBlock } = computeFlowPreview(blocks);
    const id = blocks[0].id;
    expect(hints.get(id)).toEqual({ category: "transform", text: "HELLO WORLD" });
    expect(flowingByBlock.get(id)).toBe("Hello World");
  });

  test("a remove transform preview strips matches", () => {
    const blocks: Block[] = [transformBlock("remove", "l")];
    const { hints } = computeFlowPreview(blocks);
    const id = blocks[0].id;
    expect(hints.get(id)).toEqual({ category: "transform", text: "Heo Word" });
  });

  test("a logic block yields an else hint", () => {
    const blocks: Block[] = [logicBlock("lengthLess", "10", "Too long")];
    const { hints, flowingByBlock } = computeFlowPreview(blocks);
    const id = blocks[0].id;
    expect(hints.get(id)).toEqual({ category: "logic", fallback: "Too long" });
    // logic blocks pass the flowing value through unchanged
    expect(flowingByBlock.get(id)).toBe("Hello World");
  });

  test("an action reply yields the correct text hint", () => {
    const blocks: Block[] = [actionBlock("reply", "hi there")];
    const { hints } = computeFlowPreview(blocks);
    const id = blocks[0].id;
    expect(hints.get(id)).toEqual({ category: "action", text: "reply: hi there" });
  });

  test("an action echo yields the correct text hint from the flowing value", () => {
    const blocks: Block[] = [transformBlock("uppercase"), actionBlock("echo")];
    const { hints } = computeFlowPreview(blocks);
    const echoId = blocks[1].id;
    expect(hints.get(echoId)).toEqual({ category: "action", text: "echo: HELLO WORLD" });
  });

  test("empty blocks produce empty maps", () => {
    const { hints, flowingByBlock } = computeFlowPreview([]);
    expect(hints.size).toBe(0);
    expect(flowingByBlock.size).toBe(0);
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

  test("lengthEquals: returns true when message length equals the number", () => {
    const block = logicBlock("lengthEquals", "5");
    expect(checkLogic(block, "hello")).toBe(true);
  });

  test("lengthEquals: returns false when message length differs", () => {
    const block = logicBlock("lengthEquals", "3");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("lengthEquals: non-numeric value returns false", () => {
    const block = logicBlock("lengthEquals", "abc");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("isNumber: returns true for numeric strings", () => {
    const block = logicBlock("isNumber");
    expect(checkLogic(block, "42")).toBe(true);
    expect(checkLogic(block, "-3.5")).toBe(true);
    expect(checkLogic(block, " 12 ")).toBe(true);
  });

  test("isNumber: returns false for non-numeric strings", () => {
    const block = logicBlock("isNumber");
    expect(checkLogic(block, "")).toBe(false);
    expect(checkLogic(block, "   ")).toBe(false);
    expect(checkLogic(block, "abc")).toBe(false);
    expect(checkLogic(block, "12abc")).toBe(false);
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

  test("reply action preserves newlines in the sent message", () => {
    expect(executeBlocks([actionBlock("reply", "Hello\nWorld")], "anything")).toEqual([
      "Hello\nWorld",
    ]);
  });

  test("logic fallback reply preserves newlines", () => {
    expect(
      executeBlocks([logicBlock("lengthLess", "5", "no\nway")], "this message is long")
    ).toEqual(["no\nway"]);
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

  test("isNumber failing stops the flow and emits the fallback", () => {
    const blocks: Block[] = [
      logicBlock("isNumber", "", "That's not a number!"),
      actionBlock("echo"),
    ];
    expect(executeBlocks(blocks, "12abc")).toEqual([
      "That's not a number!",
    ]);
  });

  test("lengthEquals failing stops the flow and emits the fallback", () => {
    const blocks: Block[] = [
      logicBlock("lengthEquals", "5", "Not five characters!"),
      actionBlock("echo"),
    ];
    expect(executeBlocks(blocks, "hi")).toEqual(["Not five characters!"]);
  });

  test("logic gates check the message as it flows after transforms", () => {
    const blocks: Block[] = [
      transformBlock("remove", "say "),
      logicBlock("lengthEquals", "2", "Not two characters!"),
      actionBlock("echo"),
    ];
    expect(executeBlocks(blocks, "say hi")).toEqual(["hi"]);
    expect(executeBlocks(blocks, "say hello")).toEqual(["Not two characters!"]);
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

  test("logic lengthEquals with non-numeric value is an error", () => {
    const program = validProgram();
    program.blocks.push(logicBlock("lengthEquals", "abc"));
    expect(validateProgram(program)).toContain("Logic block needs a number");
  });

  test("logic isNumber with a value is still accepted (value unused)", () => {
    const program = validProgram();
    program.blocks.push(logicBlock("isNumber", "5"));
    expect(validateProgram(program)).not.toContain("Logic block needs a number");
  });

  test("replace transform with empty value is an error", () => {
    const program = validProgram();
    program.blocks.push(transformBlock("replace", ""));
    expect(validateProgram(program)).toContain("Replace block needs text to find");
  });

  test("remove transform with empty value is an error", () => {
    const program = validProgram();
    program.blocks.push(transformBlock("remove", ""));
    expect(validateProgram(program)).toContain("Remove block needs text to remove");
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

  test("returns a UUID when crypto.randomUUID is available", () => {
    const hasCryptoUuid =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function";
    if (!hasCryptoUuid) return; // fallback path is covered by the test above
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});

describe("block type arrays", () => {
  test("TRIGGER_TYPES contains the full expected trigger set", () => {
    expect(TRIGGER_TYPES).toEqual([
      "equals",
      "contains",
      "startsWith",
      "endsWith",
      "notEquals",
      "notContains",
    ]);
    expect(new Set(TRIGGER_TYPES).size).toBe(TRIGGER_TYPES.length);
  });

  test("LOGIC_TYPES contains the full expected logic set", () => {
    expect(LOGIC_TYPES).toEqual([
      "lengthGreater",
      "lengthLess",
      "matchesRegex",
      "lengthEquals",
      "isNumber",
    ]);
    expect(new Set(LOGIC_TYPES).size).toBe(LOGIC_TYPES.length);
  });

  test("TRANSFORM_TYPES contains the full expected transform set", () => {
    expect(TRANSFORM_TYPES).toEqual([
      "uppercase",
      "lowercase",
      "trim",
      "replace",
      "concat",
      "capitalize",
      "titleCase",
      "reverse",
      "remove",
    ]);
    expect(new Set(TRANSFORM_TYPES).size).toBe(TRANSFORM_TYPES.length);
  });

  test("ACTION_TYPES contains the full expected action set", () => {
    expect(ACTION_TYPES).toEqual(["reply", "random", "echo"]);
    expect(new Set(ACTION_TYPES).size).toBe(ACTION_TYPES.length);
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

describe("new sample programs", () => {
  const sampleProgram = (name: string) => {
    const sample = SAMPLE_PROGRAMS.find((s) => s.name === name);
    if (!sample) throw new Error(`${name} sample not found`);
    return programFromSample(sample);
  };

  test("Only Numbers echoes the number after the prefix", () => {
    expect(executeProgram(sampleProgram("Only Numbers"), "/num 42")).toEqual([
      "42",
    ]);
  });

  test("Only Numbers rejects non-numbers with the fallback", () => {
    expect(executeProgram(sampleProgram("Only Numbers"), "/num abc")).toEqual([
      "That's not a number!",
    ]);
  });

  test("Title Case capitalizes each word after the prefix", () => {
    expect(
      executeProgram(sampleProgram("Title Case"), "/title hello world")
    ).toEqual(["Hello World"]);
  });

  test("Palindrome reverses the text after the prefix", () => {
    expect(executeProgram(sampleProgram("Palindrome"), "/reverse hello")).toEqual(
      ["olleh"]
    );
  });

  test("Capitalize capitalizes the first letter after the prefix", () => {
    expect(executeProgram(sampleProgram("Capitalize"), "/cap hello")).toEqual([
      "Hello",
    ]);
  });
});

describe("interpolate", () => {
  test("replaces known keys with their variable values", () => {
    expect(interpolate("Hello {name}!", { name: "World" })).toBe(
      "Hello World!"
    );
  });

  test("leaves tokens with no matching key as-is", () => {
    expect(interpolate("Hello {unknown}!", {})).toBe("Hello {unknown}!");
  });

  test("handles {prev} via the variables map", () => {
    expect(interpolate("echo: {prev}", { prev: "HELLO" })).toBe(
      "echo: HELLO"
    );
  });

  test("leaves {prev} as-is when not in the variables map", () => {
    expect(interpolate("echo: {prev}", {})).toBe("echo: {prev}");
  });

  test("replaces multiple distinct tokens in one pass", () => {
    expect(
      interpolate("{a}-{b}-{a}", { a: "x", b: "y" })
    ).toBe("x-y-x");
  });

  test("empty template returns empty string", () => {
    expect(interpolate("", {})).toBe("");
  });
});

describe("executeBlocks with variables", () => {
  test("transform with outputVar then reply interpolates the stored value", () => {
    const blocks: Block[] = [
      {
        id: "t1",
        category: "transform",
        kind: "uppercase",
        value: "",
        value2: "",
        fallback: "",
        outputVar: "shouted",
      },
      actionBlock("reply", "You shouted: {shouted}!"),
    ];
    expect(executeBlocks(blocks, "hi there")).toEqual([
      "You shouted: HI THERE!",
    ]);
  });

  test("reply uses {prev} for the flowing value", () => {
    const blocks: Block[] = [
      transformBlock("uppercase"),
      actionBlock("reply", "echo: {prev}"),
    ];
    expect(executeBlocks(blocks, "hello world")).toEqual([
      "echo: HELLO WORLD",
    ]);
  });

  test("fallback interpolation uses {prev}", () => {
    const blocks: Block[] = [
      logicBlock("lengthLess", "3", "too long: {prev}"),
    ];
    expect(executeBlocks(blocks, "this is very long")).toEqual([
      "too long: this is very long",
    ]);
  });

  test("random options interpolate per line after trimming and filtering", () => {
    const blocks: Block[] = [
      {
        id: "t1",
        category: "transform",
        kind: "uppercase",
        value: "",
        value2: "",
        fallback: "",
        outputVar: "shouted",
      },
      actionBlock("random", "you said {shouted}\nyou said silent"),
    ];
    expect(executeBlocks(blocks, "hi", () => 0)).toEqual([
      "you said HI",
    ]);
    expect(executeBlocks(blocks, "hi", () => 0.99)).toEqual([
      "you said silent",
    ]);
  });

  test("echo stays the raw flowing value (not wrapped in a token)", () => {
    const blocks: Block[] = [
      transformBlock("uppercase"),
      actionBlock("echo"),
    ];
    expect(executeBlocks(blocks, "hi")).toEqual(["HI"]);
  });

  test("titleCase with outputVar saves the transformed value for a later reply", () => {
    const blocks: Block[] = [
      { ...transformBlock("titleCase"), outputVar: "titled" },
      actionBlock("reply", "Now: {titled}"),
    ];
    expect(executeBlocks(blocks, "hello world")).toEqual(["Now: Hello World"]);
  });

  test("behaves identically when no outputVar or tokens are used", () => {
    const blocks: Block[] = [
      transformBlock("uppercase"),
      actionBlock("reply", "plain"),
    ];
    expect(executeBlocks(blocks, "hi")).toEqual(["plain"]);
  });
});

describe("validateProgram outputVar", () => {
  const baseProgram = (): Program => ({
    id: "p1",
    name: "My Program",
    trigger: { type: "equals", value: "/start" },
    blocks: [actionBlock("reply", "hi")],
  });

  test("accepts a valid variable name", () => {
    const program = baseProgram();
    program.blocks.push({
      id: "t1",
      category: "transform",
      kind: "uppercase",
      value: "",
      value2: "",
      fallback: "",
      outputVar: "myVar",
    });
    expect(validateProgram(program)).not.toContain(
      "Variable name must be letters, numbers or underscores"
    );
  });

  test("rejects a variable name with spaces", () => {
    const program = baseProgram();
    program.blocks.push({
      id: "t1",
      category: "transform",
      kind: "uppercase",
      value: "",
      value2: "",
      fallback: "",
      outputVar: "my var",
    });
    expect(validateProgram(program)).toContain(
      "Variable name must be letters, numbers or underscores"
    );
  });

  test("rejects a variable name starting with a digit", () => {
    const program = baseProgram();
    program.blocks.push({
      id: "t1",
      category: "transform",
      kind: "uppercase",
      value: "",
      value2: "",
      fallback: "",
      outputVar: "1shout",
    });
    expect(validateProgram(program)).toContain(
      "Variable name must be letters, numbers or underscores"
    );
  });

  test("accepts an empty (unset) variable name", () => {
    const program = baseProgram();
    program.blocks.push(transformBlock("uppercase"));
    expect(validateProgram(program)).toEqual([]);
  });
});

describe("concat transform", () => {
  test("appends the value to the data", () => {
    const block = transformBlock("concat", "!");
    expect(applyTransform(block, "HELLO")).toBe("HELLO!");
  });

  test("prepends value2 and appends value", () => {
    const block = transformBlock("concat", "!", ">> ");
    expect(applyTransform(block, "HELLO")).toBe(">> HELLO!");
  });

  test("with no text leaves the data unchanged", () => {
    const block = transformBlock("concat", "", "");
    expect(applyTransform(block, "HELLO")).toBe("HELLO");
  });

  test("flows into echo after concatenation", () => {
    const blocks: Block[] = [
      transformBlock("uppercase"),
      transformBlock("concat", "!"),
      actionBlock("echo"),
    ];
    expect(executeBlocks(blocks, "hello")).toEqual(["HELLO!"]);
  });

  test("concat value supports {prev} and named variables", () => {
    const blocks: Block[] = [
      {
        id: "t1",
        category: "transform",
        kind: "uppercase",
        value: "",
        value2: "",
        fallback: "",
        outputVar: "shouted",
      },
      transformBlock("concat", " ({shouted})", "say: "),
      actionBlock("echo"),
    ];
    expect(executeBlocks(blocks, "hi")).toEqual(["say: HI (HI)"]);
  });

  test("validateProgram rejects concat with neither append nor prepend", () => {
    const program = createProgram("Concat");
    program.blocks = [transformBlock("concat", "", "")];
    expect(validateProgram(program)).toContain(
      "Concat block needs text to append or prepend"
    );
  });
});

describe("BLOCK_DESCRIPTIONS", () => {
  test("has the new trigger labels", () => {
    expect(TRIGGER_LABELS.notEquals).toBe("message does not equal");
    expect(TRIGGER_LABELS.notContains).toBe("message does not contain");
  });

  test("has the new logic labels", () => {
    expect(LOGIC_LABELS.lengthEquals).toBe("message length equals");
    expect(LOGIC_LABELS.isNumber).toBe("message is a number");
  });

  test("has the new transform labels", () => {
    expect(TRANSFORM_LABELS.capitalize).toBe("capitalize first letter");
    expect(TRANSFORM_LABELS.titleCase).toBe("capitalize each word");
    expect(TRANSFORM_LABELS.reverse).toBe("reverse text");
    expect(TRANSFORM_LABELS.remove).toBe("remove text");
  });

  test("has a non-empty description for every trigger type", () => {
    for (const type of Object.keys(TRIGGER_LABELS)) {
      expect(BLOCK_DESCRIPTIONS.trigger[type]).toBeTruthy();
      expect(BLOCK_DESCRIPTIONS.trigger[type].length).toBeGreaterThan(0);
    }
  });

  test("has a non-empty description for every logic type", () => {
    for (const type of Object.keys(LOGIC_LABELS)) {
      expect(BLOCK_DESCRIPTIONS.logic[type]).toBeTruthy();
      expect(BLOCK_DESCRIPTIONS.logic[type].length).toBeGreaterThan(0);
    }
  });

  test("has a non-empty description for every transform type", () => {
    for (const type of Object.keys(TRANSFORM_LABELS)) {
      expect(BLOCK_DESCRIPTIONS.transform[type]).toBeTruthy();
      expect(BLOCK_DESCRIPTIONS.transform[type].length).toBeGreaterThan(0);
    }
  });

  test("has a non-empty description for every action type", () => {
    for (const type of Object.keys(ACTION_LABELS)) {
      expect(BLOCK_DESCRIPTIONS.action[type]).toBeTruthy();
      expect(BLOCK_DESCRIPTIONS.action[type].length).toBeGreaterThan(0);
    }
  });
});

describe("moveBlock", () => {
  test("moves a block up by one position", () => {
    const blocks: Block[] = [
      actionBlock("reply", "one"),
      actionBlock("reply", "two"),
      actionBlock("reply", "three"),
    ];
    const ids = blocks.map((b) => b.id);
    const targetId = ids[1];
    const result = moveBlock(blocks, targetId, -1);
    expect(result.length).toBe(3);
    expect(result[0].id).toBe(ids[1]);
    expect(result[1].id).toBe(ids[0]);
    expect(result[2].id).toBe(ids[2]);
  });

  test("moves a block down by one position", () => {
    const blocks: Block[] = [
      actionBlock("reply", "one"),
      actionBlock("reply", "two"),
      actionBlock("reply", "three"),
    ];
    const ids = blocks.map((b) => b.id);
    const targetId = ids[1];
    const result = moveBlock(blocks, targetId, 1);
    expect(result.length).toBe(3);
    expect(result[0].id).toBe(ids[0]);
    expect(result[1].id).toBe(ids[2]);
    expect(result[2].id).toBe(ids[1]);
  });

  test("returns the same reference when the block is not found", () => {
    const blocks: Block[] = [actionBlock("reply", "one")];
    expect(moveBlock(blocks, "does-not-exist", -1)).toBe(blocks);
  });

  test("returns the same reference when moving the first block up", () => {
    const blocks: Block[] = [
      actionBlock("reply", "one"),
      actionBlock("reply", "two"),
    ];
    expect(moveBlock(blocks, blocks[0].id, -1)).toBe(blocks);
  });

  test("returns the same reference when moving the last block down", () => {
    const blocks: Block[] = [
      actionBlock("reply", "one"),
      actionBlock("reply", "two"),
    ];
    expect(moveBlock(blocks, blocks[1].id, 1)).toBe(blocks);
  });

  test("does not mutate the input array", () => {
    const blocks: Block[] = [
      actionBlock("reply", "one"),
      actionBlock("reply", "two"),
      actionBlock("reply", "three"),
    ];
    const originalIds = blocks.map((b) => b.id);
    moveBlock(blocks, blocks[1].id, -1);
    expect(blocks.map((b) => b.id)).toEqual(originalIds);
  });
});

describe("moveBlockToIndex", () => {
  test("moves a block to a valid target index", () => {
    const blocks: Block[] = [
      actionBlock("reply", "a"),
      actionBlock("reply", "b"),
      actionBlock("reply", "c"),
      actionBlock("reply", "d"),
    ];
    const ids = blocks.map((b) => b.id);
    const result = moveBlockToIndex(blocks, ids[3], 1);
    expect(result.map((b) => b.id)).toEqual([ids[0], ids[3], ids[1], ids[2]]);
  });

  test("clamps a target index below 0 to 0", () => {
    const blocks: Block[] = [
      actionBlock("reply", "a"),
      actionBlock("reply", "b"),
      actionBlock("reply", "c"),
    ];
    const ids = blocks.map((b) => b.id);
    const result = moveBlockToIndex(blocks, ids[2], -5);
    expect(result.map((b) => b.id)).toEqual([ids[2], ids[0], ids[1]]);
  });

  test("clamps a target index above length-1 to the last index", () => {
    const blocks: Block[] = [
      actionBlock("reply", "a"),
      actionBlock("reply", "b"),
      actionBlock("reply", "c"),
    ];
    const ids = blocks.map((b) => b.id);
    const result = moveBlockToIndex(blocks, ids[0], 99);
    expect(result.map((b) => b.id)).toEqual([ids[1], ids[2], ids[0]]);
  });

  test("returns the same reference when the block is not found", () => {
    const blocks: Block[] = [actionBlock("reply", "a")];
    expect(moveBlockToIndex(blocks, "does-not-exist", 0)).toBe(blocks);
  });

  test("returns the same reference when the target equals the current index", () => {
    const blocks: Block[] = [
      actionBlock("reply", "a"),
      actionBlock("reply", "b"),
    ];
    expect(moveBlockToIndex(blocks, blocks[1].id, 1)).toBe(blocks);
  });

  test("does not mutate the input array", () => {
    const blocks: Block[] = [
      actionBlock("reply", "a"),
      actionBlock("reply", "b"),
      actionBlock("reply", "c"),
    ];
    const originalIds = blocks.map((b) => b.id);
    moveBlockToIndex(blocks, blocks[0].id, 2);
    expect(blocks.map((b) => b.id)).toEqual(originalIds);
  });
});

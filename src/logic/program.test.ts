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
  generateId,
  interpolate,
} from "../logic/program";
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
    | "isNumber"
    | "equals"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "notEquals"
    | "notContains"
    | "notStartsWith"
    | "notEndsWith"
    | "notLengthGreater"
    | "notLengthLess"
    | "notLengthEquals"
    | "notMatchesRegex"
    | "notIsNumber",
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

  test("equals: passes when the message is exactly the value", () => {
    const block = logicBlock("equals", "hello");
    expect(checkLogic(block, "hello")).toBe(true);
  });

  test("equals: surrounding whitespace is trimmed", () => {
    const block = logicBlock("equals", "hello");
    expect(checkLogic(block, "  hello  ")).toBe(true);
  });

  test("equals: different message is false", () => {
    const block = logicBlock("equals", "hello");
    expect(checkLogic(block, "goodbye")).toBe(false);
  });

  test("contains: passes when the message includes the value", () => {
    const block = logicBlock("contains", "ello");
    expect(checkLogic(block, "hello")).toBe(true);
  });

  test("contains: absent substring is false", () => {
    const block = logicBlock("contains", "xyz");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("contains: does not trim whitespace from the value", () => {
    const block = logicBlock("contains", " hello");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("startsWith: passes when the message begins with the value", () => {
    const block = logicBlock("startsWith", "hel");
    expect(checkLogic(block, "hello")).toBe(true);
  });

  test("startsWith: non-matching prefix is false", () => {
    const block = logicBlock("startsWith", "hel");
    expect(checkLogic(block, "goodbye")).toBe(false);
  });

  test("endsWith: passes when the message ends with the value", () => {
    const block = logicBlock("endsWith", "llo");
    expect(checkLogic(block, "hello")).toBe(true);
  });

  test("endsWith: non-matching suffix is false", () => {
    const block = logicBlock("endsWith", "llo");
    expect(checkLogic(block, "help")).toBe(false);
  });

  test("notEquals: passes when the message differs from the value", () => {
    const block = logicBlock("notEquals", "hello");
    expect(checkLogic(block, "goodbye")).toBe(true);
  });

  test("notEquals: trims whitespace around both sides", () => {
    const block = logicBlock("notEquals", "hello");
    expect(checkLogic(block, "  hello  ")).toBe(false);
  });

  test("notEquals: exact match is false", () => {
    const block = logicBlock("notEquals", "hello");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("notContains: passes when the message does not include the value", () => {
    const block = logicBlock("notContains", "xyz");
    expect(checkLogic(block, "hello")).toBe(true);
  });

  test("notContains: present substring is false", () => {
    const block = logicBlock("notContains", "ello");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("notStartsWith: passes when the message does not begin with the value", () => {
    const block = logicBlock("notStartsWith", "hel");
    expect(checkLogic(block, "goodbye")).toBe(true);
  });

  test("notStartsWith: matching prefix is false", () => {
    const block = logicBlock("notStartsWith", "hel");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("notEndsWith: passes when the message does not end with the value", () => {
    const block = logicBlock("notEndsWith", "llo");
    expect(checkLogic(block, "help")).toBe(true);
  });

  test("notEndsWith: matching suffix is false", () => {
    const block = logicBlock("notEndsWith", "llo");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("notLengthGreater: passes when message length is not greater", () => {
    const block = logicBlock("notLengthGreater", "3");
    expect(checkLogic(block, "hi")).toBe(true);
  });

  test("notLengthGreater: message longer than value is false", () => {
    const block = logicBlock("notLengthGreater", "3");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("notLengthGreater: non-numeric value returns false", () => {
    const block = logicBlock("notLengthGreater", "abc");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("notLengthLess: passes when message length is not less", () => {
    const block = logicBlock("notLengthLess", "3");
    expect(checkLogic(block, "hello")).toBe(true);
  });

  test("notLengthLess: message shorter than value is false", () => {
    const block = logicBlock("notLengthLess", "10");
    expect(checkLogic(block, "hi")).toBe(false);
  });

  test("notLengthLess: non-numeric value returns false", () => {
    const block = logicBlock("notLengthLess", "abc");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("notLengthEquals: passes when message length differs", () => {
    const block = logicBlock("notLengthEquals", "3");
    expect(checkLogic(block, "hello")).toBe(true);
  });

  test("notLengthEquals: message length equal to value is false", () => {
    const block = logicBlock("notLengthEquals", "5");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("notLengthEquals: non-numeric value returns false", () => {
    const block = logicBlock("notLengthEquals", "abc");
    expect(checkLogic(block, "hello")).toBe(false);
  });

  test("notMatchesRegex: passes when regex does not match", () => {
    const block = logicBlock("notMatchesRegex", "^\\d+$");
    expect(checkLogic(block, "abc")).toBe(true);
  });

  test("notMatchesRegex: matching regex is false", () => {
    const block = logicBlock("notMatchesRegex", "^\\d+$");
    expect(checkLogic(block, "123")).toBe(false);
  });

  test("notMatchesRegex: invalid regex returns false without throwing", () => {
    const block = logicBlock("notMatchesRegex", "(");
    expect(() => checkLogic(block, "abc")).not.toThrow();
    expect(checkLogic(block, "abc")).toBe(false);
  });

  test("notIsNumber: passes for non-numeric strings", () => {
    const block = logicBlock("notIsNumber");
    expect(checkLogic(block, "abc")).toBe(true);
    expect(checkLogic(block, "")).toBe(true);
    expect(checkLogic(block, "   ")).toBe(true);
    expect(checkLogic(block, "12abc")).toBe(true);
  });

  test("notIsNumber: numeric strings are false", () => {
    const block = logicBlock("notIsNumber");
    expect(checkLogic(block, "42")).toBe(false);
    expect(checkLogic(block, "-3.5")).toBe(false);
    expect(checkLogic(block, " 12 ")).toBe(false);
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

  test("content gate passes and flow continues to the action", () => {
    const blocks: Block[] = [
      logicBlock("contains", "hello"),
      actionBlock("reply", "matched"),
    ];
    expect(executeBlocks(blocks, "say hello")).toEqual(["matched"]);
  });

  test("content gate failing uses the fallback and stops the flow", () => {
    const blocks: Block[] = [
      logicBlock("contains", "hello", "nope"),
      actionBlock("reply", "matched"),
    ];
    expect(executeBlocks(blocks, "goodbye")).toEqual(["nope"]);
  });

  test("negated gate passes through when the condition is absent", () => {
    const blocks: Block[] = [
      logicBlock("notContains", "hello"),
      actionBlock("reply", "matched"),
    ];
    expect(executeBlocks(blocks, "goodbye")).toEqual(["matched"]);
  });

  test("negated gate failing uses the fallback and stops the flow", () => {
    const blocks: Block[] = [
      logicBlock("notContains", "hello", "nope"),
      actionBlock("reply", "matched"),
    ];
    expect(executeBlocks(blocks, "say hello")).toEqual(["nope"]);
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
});

describe("matchesRegex regex cache", () => {
  test("an invalid regex is cached as a miss across calls without throwing", () => {
    const block = logicBlock("matchesRegex", "(");
    const block2 = logicBlock("notMatchesRegex", "(");
    expect(checkLogic(block, "abc")).toBe(false);
    expect(checkLogic(block, "abc")).toBe(false);
    expect(checkLogic(block2, "abc")).toBe(false);
  });

  test("a valid regex is compiled once for repeated evaluations", () => {
    const RealRegExp = global.RegExp;
    const compileSpy = jest.fn();
    (global as { RegExp: typeof RegExp }).RegExp = class extends RealRegExp {
      constructor(pattern: string | RegExp, flags?: string) {
        super(pattern, flags);
        compileSpy(pattern);
      }
    };
    try {
      // Use a pattern not compiled anywhere else in this suite, since the
      // module-level cache persists across the file's tests.
      const block = logicBlock("matchesRegex", "^[a-c]+z$");
      expect(checkLogic(block, "abz")).toBe(true);
      expect(checkLogic(block, "ccz")).toBe(true);
      // Two evaluations of the same pattern must only compile once.
      expect(compileSpy).toHaveBeenCalledTimes(1);
    } finally {
      (global as { RegExp: typeof RegExp }).RegExp = RealRegExp;
    }
  });
});

import { FlowRuntime, validateFlow, POLL_USAGE_HINT, DICE_USAGE_HINT } from "./flow.ts";
import { FlowSample, SAMPLE_FLOWS } from "./flowSamples.ts";
import { vi } from "vitest";

// SAMPLE_FLOWS is guaranteed to be in this exact order (see the
// "samples with unique names and order" test below).
const DICE = SAMPLE_FLOWS[0];
const POLL = SAMPLE_FLOWS[1];
const SHOUT = SAMPLE_FLOWS[2];
const QUOTE = SAMPLE_FLOWS[3];
const GREETING = SAMPLE_FLOWS[4];

describe("SAMPLE_FLOWS", () => {
  it("has five samples with unique names", () => {
    expect(SAMPLE_FLOWS).toHaveLength(5);
    const names = SAMPLE_FLOWS.map((s) => s.name);
    expect(new Set(names).size).toBe(5);
  });

  it("contains the expected samples in order", () => {
    expect(SAMPLE_FLOWS.map((s) => s.name)).toEqual([
      "Dice Bot",
      "Poll Bot",
      "Shout Bot",
      "Quote Bot",
      "Greeting Bot",
    ]);
  });
});

describe.each(SAMPLE_FLOWS)("$name", (sample: FlowSample) => {
  it("is valid per validateFlow", () => {
    expect(validateFlow(sample.flow)).toEqual([]);
  });
});

describe("Dice Bot execution", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rolls a d4 between 1 and 4", () => {
    const rt = new FlowRuntime(DICE.flow);
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rt.handleMessage(1, "/dice d4")).toBe("🎲 d4: 1");
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(rt.handleMessage(1, "/dice d4")).toBe("🎲 d4: 4");
  });

  it("rolls a d20 between 1 and 20", () => {
    const rt = new FlowRuntime(DICE.flow);
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rt.handleMessage(1, "/dice d20")).toBe("🎲 d20: 1");
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(rt.handleMessage(1, "/dice d20")).toBe("🎲 d20: 20");
  });

  it("rolls a d100 between 1 and 100", () => {
    const rt = new FlowRuntime(DICE.flow);
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rt.handleMessage(1, "/dice d100")).toBe("🎲 d100: 1");
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(rt.handleMessage(1, "/dice d100")).toBe("🎲 d100: 100");
  });

  it("handles uppercase dice commands via the lowercase transform", () => {
    const rt = new FlowRuntime(DICE.flow);
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rt.handleMessage(1, "/DICE D20")).toBe("🎲 d20: 1");
  });

  it("replies with the usage hint for an invalid dice type", () => {
    const rt = new FlowRuntime(DICE.flow);
    expect(rt.handleMessage(1, "/dice banana")).toBe(DICE_USAGE_HINT);
  });

  it("replies with the usage hint for a bare /dice command", () => {
    const rt = new FlowRuntime(DICE.flow);
    expect(rt.handleMessage(1, "/dice")).toBe(DICE_USAGE_HINT);
  });

  it("stays silent for messages that do not start with /dice", () => {
    const rt = new FlowRuntime(DICE.flow);
    expect(rt.handleMessage(1, "hello")).toBeUndefined();
  });
});

describe("Poll Bot execution", () => {
  it("creates a poll from a title plus comma-separated options", () => {
    const rt = new FlowRuntime(POLL.flow);
    expect(rt.handleMessage(1, "/poll What is your favorite color? red, blue, green")).toEqual({
      kind: "poll",
      question: "What is your favorite color?",
      options: ["red", "blue", "green"],
    });
  });

  it("treats a space-separated first option as part of the first part", () => {
    const rt = new FlowRuntime(POLL.flow);
    expect(rt.handleMessage(1, "/poll Title opt1, opt2")).toEqual({
      kind: "poll",
      question: "Title",
      options: ["opt1", "opt2"],
    });
  });

  it("replies with the usage hint when there are not enough options", () => {
    const rt = new FlowRuntime(POLL.flow);
    expect(rt.handleMessage(1, "/poll Title")).toBe(POLL_USAGE_HINT);
  });

  it("stays silent for messages that do not start with /poll", () => {
    const rt = new FlowRuntime(POLL.flow);
    expect(rt.handleMessage(1, "hello")).toBeUndefined();
  });
});

describe("Shout Bot execution", () => {
  it("shouts back uppercase text with an exclamation mark", () => {
    const rt = new FlowRuntime(SHOUT.flow);
    expect(rt.handleMessage(1, "/shout hello")).toBe("🎺 HELLO!");
    expect(rt.handleMessage(1, "/shout hello world")).toBe("🎺 HELLO WORLD!");
  });

  it("handles uppercase /SHOUT commands via the lowercase transform", () => {
    const rt = new FlowRuntime(SHOUT.flow);
    expect(rt.handleMessage(1, "/SHOUT hi")).toBe("🎺 HI!");
  });

  it("replies with the usage hint for a bare /shout command", () => {
    const rt = new FlowRuntime(SHOUT.flow);
    expect(rt.handleMessage(1, "/shout")).toBe("Usage: /shout <text>");
  });

  it("stays silent for messages that do not start with /shout", () => {
    const rt = new FlowRuntime(SHOUT.flow);
    expect(rt.handleMessage(1, "hello")).toBeUndefined();
  });
});

describe("Quote Bot execution", () => {
  it("wraps the message in quotes with the template transform", () => {
    const rt = new FlowRuntime(QUOTE.flow);
    expect(rt.handleMessage(1, "/quote hello")).toBe('💬 "hello"');
    expect(rt.handleMessage(1, "/quote two words")).toBe('💬 "two words"');
  });

  it("stays silent for messages that do not start with /quote", () => {
    const rt = new FlowRuntime(QUOTE.flow);
    expect(rt.handleMessage(1, "hello")).toBeUndefined();
  });

  it("replies with the usage hint for a bare /quote command", () => {
    const rt = new FlowRuntime(QUOTE.flow);
    expect(rt.handleMessage(1, "/quote")).toBe("Usage: /quote <text>");
  });
});

describe("Greeting Bot execution", () => {
  it("greets non-command messages with the concatFront prefix", () => {
    const rt = new FlowRuntime(GREETING.flow);
    expect(rt.handleMessage(1, "hello")).toBe("👋 You said: hello");
    expect(rt.handleMessage(1, "nice to meet you")).toBe("👋 You said: nice to meet you");
  });

  it("stays silent for commands (notStartsWith / has no else edge)", () => {
    const rt = new FlowRuntime(GREETING.flow);
    expect(rt.handleMessage(1, "/start")).toBeUndefined();
    expect(rt.handleMessage(1, "/dice d20")).toBeUndefined();
  });
});

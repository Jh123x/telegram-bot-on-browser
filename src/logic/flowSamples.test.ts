import { FlowRuntime, validateFlow, POLL_USAGE_HINT, DICE_USAGE_HINT } from "./flow.ts";
import { FlowSample, SAMPLE_FLOWS } from "./flowSamples.ts";
import { vi } from "vitest";

// SAMPLE_FLOWS is guaranteed to be in this exact order (see the
// "samples with unique names and order" test below).
const DICE = SAMPLE_FLOWS[0];
const POLL = SAMPLE_FLOWS[1];
const QUIZ = SAMPLE_FLOWS[2];
const ANON = SAMPLE_FLOWS[3];

describe("SAMPLE_FLOWS", () => {
  it("has four samples with unique names", () => {
    expect(SAMPLE_FLOWS).toHaveLength(4);
    const names = SAMPLE_FLOWS.map((s) => s.name);
    expect(new Set(names).size).toBe(4);
  });

  it("contains the expected samples in order", () => {
    expect(SAMPLE_FLOWS.map((s) => s.name)).toEqual([
      "Dice Bot",
      "Poll Bot",
      "Quiz Bot",
      "Anonymous Bot",
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

describe("Quiz Bot execution", () => {
  it("asks the question when /quiz is sent", () => {
    const rt = new FlowRuntime(QUIZ.flow);
    expect(rt.handleMessage(1, "/quiz")).toBe("Q: What is 2 + 2?");
  });

  it("confirms a correct answer and resets", () => {
    const rt = new FlowRuntime(QUIZ.flow);
    rt.handleMessage(1, "/quiz");
    expect(rt.handleMessage(1, "4")).toBe("✅ Correct! 2 + 2 is 4.");
    // A fresh /quiz asks again (state was cleared).
    expect(rt.handleMessage(1, "/quiz")).toBe("Q: What is 2 + 2?");
  });

  it("accepts case-insensitive answers", () => {
    const rt = new FlowRuntime(QUIZ.flow);
    rt.handleMessage(1, "/quiz");
    expect(rt.handleMessage(1, "Four")).toBe("✅ Correct! 2 + 2 is 4.");
  });

  it("rejects a wrong answer", () => {
    const rt = new FlowRuntime(QUIZ.flow);
    rt.handleMessage(1, "/quiz");
    expect(rt.handleMessage(1, "banana")).toBe("❌ Not quite. The answer is 4.");
  });

  it("stays silent for messages that do not start with /quiz", () => {
    const rt = new FlowRuntime(QUIZ.flow);
    expect(rt.handleMessage(1, "hello")).toBeUndefined();
  });
});

describe("Anonymous Bot execution", () => {
  it("forwards the message to the @mentioned user and confirms", () => {
    const rt = new FlowRuntime(ANON.flow);
    expect(rt.handleMessage(1, "/anon @bob hello there")).toEqual({
      kind: "sendTo",
      to: "bob",
      texts: ["hello there"],
      confirm: "Sent to @bob",
    });
  });

  it("strips the command and the mention from the forwarded text", () => {
    const rt = new FlowRuntime(ANON.flow);
    expect(rt.handleMessage(1, "/anon @carol the secret")).toEqual({
      kind: "sendTo",
      to: "carol",
      texts: ["the secret"],
      confirm: "Sent to @carol",
    });
  });

  it("shows the usage hint when the message has no @mention", () => {
    const rt = new FlowRuntime(ANON.flow);
    expect(rt.handleMessage(1, "/anon hello")).toBe("Usage: /anon @user your message");
  });

  it("stays silent for messages that do not start with /anon", () => {
    const rt = new FlowRuntime(ANON.flow);
    expect(rt.handleMessage(1, "hello")).toBeUndefined();
  });
});

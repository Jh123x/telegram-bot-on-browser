import { FlowRuntime, validateFlow } from "./flow.ts";
import { FlowSample, SAMPLE_FLOWS } from "./flowSamples.ts";

// SAMPLE_FLOWS is guaranteed to be in this exact order (see the
// "three samples with unique names and order" test below).
const WELCOME = SAMPLE_FLOWS[0];
const UPPERCASE = SAMPLE_FLOWS[1];
const GREETING = SAMPLE_FLOWS[2];

describe("SAMPLE_FLOWS", () => {
  it("has three samples with unique names", () => {
    expect(SAMPLE_FLOWS).toHaveLength(3);
    const names = SAMPLE_FLOWS.map((s) => s.name);
    expect(new Set(names).size).toBe(3);
  });

  it("contains the expected samples in order", () => {
    expect(SAMPLE_FLOWS.map((s) => s.name)).toEqual([
      "Welcome Flow",
      "Uppercase Echo",
      "Greeting Check",
    ]);
  });
});

describe.each(SAMPLE_FLOWS)("$name", (sample: FlowSample) => {
  it("is valid per validateFlow", () => {
    expect(validateFlow(sample.flow)).toEqual([]);
  });
});

describe("Welcome Flow execution", () => {
  it("answers any message with both replies", () => {
    const rt = new FlowRuntime(WELCOME.flow);
    const expected = ["Welcome! I'm a browser bot 🤖", "Try /echo or say hi."];
    expect(rt.handleMessage(1, "hello there")).toEqual(expected);
    // Stateless: a different brand-new user routes to the same send node.
    expect(rt.handleMessage(2, "hi")).toEqual(expected);
  });
});

describe("Uppercase Echo execution", () => {
  it("transforms the message to uppercase before interpolating {msg}", () => {
    const rt = new FlowRuntime(UPPERCASE.flow);
    expect(rt.handleMessage(1, "hello")).toBe("You said: HELLO");
    expect(rt.handleMessage(1, "hi there")).toBe("You said: HI THERE");
  });
});

describe("Greeting Check execution", () => {
  it("replies Hello when the message contains hi, else Say hi", () => {
    const rt = new FlowRuntime(GREETING.flow);
    expect(rt.handleMessage(1, "hi")).toBe("Hello! 👋");
    expect(rt.handleMessage(1, "hey")).toBe("Say hi!");
  });
});

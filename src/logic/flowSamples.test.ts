import { FlowRuntime, validateFlow } from "./flow.ts";
import { FlowSample, SAMPLE_FLOWS } from "./flowSamples.ts";

// SAMPLE_FLOWS is guaranteed to be in this exact order (see the
// "has exactly three entries" test below).
const WELCOME = SAMPLE_FLOWS[0];
const ECHO = SAMPLE_FLOWS[1];
const QUIZ = SAMPLE_FLOWS[2];

describe("SAMPLE_FLOWS", () => {
  it("has exactly three entries with unique names", () => {
    expect(SAMPLE_FLOWS).toHaveLength(3);
    const names = SAMPLE_FLOWS.map((s) => s.name);
    expect(new Set(names).size).toBe(3);
  });

  it("contains the expected samples in order", () => {
    expect(SAMPLE_FLOWS.map((s) => s.name)).toEqual([
      "Welcome Flow",
      "Echo Flow",
      "Quiz Flow",
    ]);
  });
});

describe.each(SAMPLE_FLOWS)("$name", (sample: FlowSample) => {
  it("is valid per validateFlow", () => {
    expect(validateFlow(sample.flow)).toEqual([]);
  });
});

describe("Welcome Flow execution", () => {
  it("answers any first message with both replies and lands on main", () => {
    const rt = new FlowRuntime(WELCOME.flow);
    const expected = [
      "Welcome! I'm a browser bot 🤖",
      "Try /echo <something> or answer the quiz.",
    ];
    // ANY first message routes to main.
    expect(rt.handleMessage(1, "hello there")).toEqual(expected);
    // The user landed on main (no longer at start), so further messages go
    // quiet because main has no outgoing transitions.
    expect(rt.handleMessage(1, "anything else")).toBeUndefined();
    // A different brand-new user is routed independently to main.
    expect(rt.handleMessage(2, "hi")).toEqual(expected);
  });
});

describe("Echo Flow execution", () => {
  it("prompts at menu, echoes the message at echo, then goes quiet", () => {
    const rt = new FlowRuntime(ECHO.flow);
    const rawMessage = "/echo hi there";
    // Brand-new user starts at menu.
    expect(rt.handleMessage(1, "hello")).toBe(
      "Say /echo <something> to hear it back."
    );
    // "/echo ..." transitions to the echo state whose reply interpolates
    // {msg} with the raw message.
    expect(rt.handleMessage(1, rawMessage)).toBe("You said: /echo hi there");
    // Echo state has no outgoing edges, so it goes quiet but the user stays
    // at echo.
    expect(rt.handleMessage(1, "anything")).toBeUndefined();
    expect(rt.handleMessage(1, "still anything")).toBeUndefined();
  });
});

describe("Quiz Flow execution", () => {
  it("User A: question, correct answer, then quiet at correct", () => {
    const rt = new FlowRuntime(QUIZ.flow);
    expect(rt.handleMessage(1, "hi")).toBe("What is 2 + 2?");
    expect(rt.handleMessage(1, "4")).toBe("Correct! 🎉");
    // The correct state has no outgoing edges -> quiet, stays at correct.
    expect(rt.handleMessage(1, "anything")).toBeUndefined();
  });

  it("User B: wrong answer loops back to the question, then correct", () => {
    const rt = new FlowRuntime(QUIZ.flow);
    expect(rt.handleMessage(2, "hi")).toBe("What is 2 + 2?");
    expect(rt.handleMessage(2, "5")).toBe("Nope, try again!");
    // wrong -> q1 re-asks the question.
    expect(rt.handleMessage(2, "4")).toBe("What is 2 + 2?");
    expect(rt.handleMessage(2, "4")).toBe("Correct! 🎉");
  });
});

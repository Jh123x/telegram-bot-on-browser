import { flowEdgeLabel, matchFlowTrigger } from "./flow.ts";

describe("flowEdgeLabel", () => {
  test("equals trigger phrases like message equals", () => {
    expect(flowEdgeLabel({ type: "equals", value: "/start" })).toBe(
      'message equals "/start"'
    );
  });

  test("fallback always labels as any other message", () => {
    expect(flowEdgeLabel({ type: "fallback", value: "" })).toBe(
      "any other message"
    );
  });

  test("contains trigger uses the contains phrasing", () => {
    expect(flowEdgeLabel({ type: "contains", value: "help" })).toBe(
      'message contains "help"'
    );
  });

  test("notEquals trigger uses the negated phrasing", () => {
    expect(flowEdgeLabel({ type: "notEquals", value: "/start" })).toBe(
      'message does not equal "/start"'
    );
  });
});

describe("matchFlowTrigger", () => {
  test("delegates equals to matchTrigger: exact match is true", () => {
    expect(
      matchFlowTrigger({ type: "equals", value: "/start" }, "/start")
    ).toBe(true);
  });

  test("equals: surrounding whitespace in the raw message is handled identically to matchTrigger", () => {
    // matchTrigger trims equals values, so surrounding whitespace still matches.
    expect(
      matchFlowTrigger({ type: "equals", value: "/start" }, "  /start  ")
    ).toBe(true);
  });

  test("equals: different message is false", () => {
    expect(
      matchFlowTrigger({ type: "equals", value: "/start" }, "/stop")
    ).toBe(false);
  });

  test("delegates contains to matchTrigger using the raw message", () => {
    expect(
      matchFlowTrigger({ type: "contains", value: "/start" }, "say /start now")
    ).toBe(true);
    expect(
      matchFlowTrigger({ type: "contains", value: "/start" }, "nothing here")
    ).toBe(false);
  });

  test("delegates notContains to matchTrigger without trimming", () => {
    expect(
      matchFlowTrigger({ type: "notContains", value: "help" }, "no word here")
    ).toBe(true);
  });

  test("fallback always matches any message", () => {
    expect(matchFlowTrigger({ type: "fallback", value: "" }, "anything")).toBe(
      true
    );
    expect(matchFlowTrigger({ type: "fallback", value: "" }, "")).toBe(true);
  });
});

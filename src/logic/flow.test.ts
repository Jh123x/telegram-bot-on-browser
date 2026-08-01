import { flowEdgeLabel } from "./flow.ts";

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

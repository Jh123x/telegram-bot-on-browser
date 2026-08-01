import {
  createFlow,
  createFlowNode,
  flowEdgeLabel,
  matchFlowTrigger,
} from "./flow.ts";

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

describe("createFlowNode", () => {
  test("start node gets a fresh id and Start label", () => {
    const node = createFlowNode("start");
    expect(node.id).toBeTruthy();
    expect(node.type).toBe("start");
    expect(node.data).toEqual({ label: "Start", replies: [] });
    expect(node.position).toEqual({ x: 0, y: 0 });
  });

  test("state node gets a New State label", () => {
    const node = createFlowNode("state");
    expect(node.type).toBe("state");
    expect(node.data).toEqual({ label: "New State", replies: [] });
    expect(node.position).toEqual({ x: 0, y: 0 });
  });

  test("honors a provided position", () => {
    const node = createFlowNode("state", { x: 120, y: 40 });
    expect(node.position).toEqual({ x: 120, y: 40 });
  });

  test("each node gets a unique id", () => {
    expect(createFlowNode("state").id).not.toBe(createFlowNode("state").id);
  });
});

describe("createFlow", () => {
  test("uses the default name New Flow", () => {
    const flow = createFlow();
    expect(flow.name).toBe("New Flow");
    expect(flow.startNodeId).toBe("");
    expect(flow.nodes).toEqual([]);
    expect(flow.edges).toEqual([]);
    expect(flow.id).toBeTruthy();
  });

  test("honors a provided name and gets a fresh id", () => {
    const flow1 = createFlow("Welcome");
    const flow2 = createFlow("Welcome");
    expect(flow1.name).toBe("Welcome");
    expect(flow2.name).toBe("Welcome");
    expect(flow1.id).not.toBe(flow2.id);
  });
});

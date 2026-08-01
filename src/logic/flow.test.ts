import {
  createFlow,
  createFlowNode,
  executeFlow,
  flowEdgeLabel,
  matchFlowTrigger,
} from "./flow.ts";
import { Flow } from "../interfaces/flow.ts";

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

describe("executeFlow", () => {
  const startNode = {
    id: "start",
    type: "start" as const,
    position: { x: 0, y: 0 },
    data: { label: "Start", replies: [] },
  };
  const menuNode = {
    id: "menu",
    type: "state" as const,
    position: { x: 0, y: 0 },
    data: { label: "Menu", replies: ["Welcome!"] },
  };
  const echoNode = {
    id: "echo",
    type: "state" as const,
    position: { x: 0, y: 0 },
    data: { label: "Echo", replies: ["Echoing"] },
  };

  const baseFlow: Flow = {
    id: "f1",
    name: "Flow",
    startNodeId: "start",
    nodes: [startNode, menuNode, echoNode],
    edges: [],
  };

  test("returns undefined when the current node is unknown", () => {
    expect(executeFlow(baseFlow, "hi", "missing")).toBeUndefined();
  });

  test("returns the first matching edge in array order", () => {
    const flow: Flow = {
      ...baseFlow,
      edges: [
        {
          id: "e1",
          source: "start",
          target: "menu",
          data: { trigger: { type: "equals", value: "/help" } },
        },
        {
          id: "e2",
          source: "start",
          target: "echo",
          data: { trigger: { type: "fallback", value: "" } },
        },
      ],
    };
    const step = executeFlow(flow, "/help", "start");
    expect(step).toEqual({ replies: ["Welcome!"], nextNodeId: "menu" });
  });

  test("edge priority follows array order even when a later edge also matches", () => {
    const flow: Flow = {
      ...baseFlow,
      edges: [
        {
          id: "e1",
          source: "start",
          target: "menu",
          data: { trigger: { type: "contains", value: "a" } },
        },
        {
          id: "e2",
          source: "start",
          target: "echo",
          data: {
            trigger: { type: "contains", value: "cat" },
          },
        },
      ],
    };
    const step = executeFlow(flow, "cat", "start");
    expect(step).toEqual({ replies: ["Welcome!"], nextNodeId: "menu" });
  });

  test("fallback acts as a last resort when no earlier edge matches", () => {
    const flow: Flow = {
      ...baseFlow,
      edges: [
        {
          id: "e1",
          source: "start",
          target: "menu",
          data: { trigger: { type: "equals", value: "/help" } },
        },
        {
          id: "e2",
          source: "start",
          target: "echo",
          data: { trigger: { type: "fallback", value: "" } },
        },
      ],
    };
    const step = executeFlow(flow, "anything", "start");
    expect(step).toEqual({ replies: ["Echoing"], nextNodeId: "echo" });
  });

  test("returns undefined when no edge matches the message", () => {
    const flow: Flow = {
      ...baseFlow,
      edges: [
        {
          id: "e1",
          source: "start",
          target: "menu",
          data: { trigger: { type: "equals", value: "/help" } },
        },
      ],
    };
    expect(executeFlow(flow, "nothing matches", "start")).toBeUndefined();
  });

  test("only considers edges whose source is the current node", () => {
    const flow: Flow = {
      ...baseFlow,
      edges: [
        {
          id: "e1",
          source: "menu",
          target: "echo",
          data: { trigger: { type: "fallback", value: "" } },
        },
      ],
    };
    expect(executeFlow(flow, "hi", "start")).toBeUndefined();
  });

  test("skips an edge whose target node is missing and keeps scanning", () => {
    const flow: Flow = {
      ...baseFlow,
      edges: [
        {
          id: "e1",
          source: "start",
          target: "ghost",
          data: { trigger: { type: "equals", value: "/x" } },
        },
        {
          id: "e2",
          source: "start",
          target: "echo",
          data: { trigger: { type: "fallback", value: "" } },
        },
      ],
    };
    const step = executeFlow(flow, "/x", "start");
    expect(step).toEqual({ replies: ["Echoing"], nextNodeId: "echo" });
  });

  test("returns an empty replies array when the target state has no replies", () => {
    const quietNode = {
      id: "quiet",
      type: "state" as const,
      position: { x: 0, y: 0 },
      data: { label: "Quiet", replies: [] },
    };
    const flow: Flow = {
      ...baseFlow,
      nodes: [startNode, quietNode],
      edges: [
        {
          id: "e1",
          source: "start",
          target: "quiet",
          data: { trigger: { type: "fallback", value: "" } },
        },
      ],
    };
    const step = executeFlow(flow, "hi", "start");
    expect(step).toEqual({ replies: [], nextNodeId: "quiet" });
  });
});

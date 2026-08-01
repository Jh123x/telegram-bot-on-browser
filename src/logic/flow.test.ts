import {
  createFlow,
  createFlowNode,
  executeFlow,
  flowEdgeLabel,
  FlowRuntime,
  matchFlowTrigger,
  validateFlow,
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

  test("delegates startsWith to matchTrigger", () => {
    expect(
      matchFlowTrigger({ type: "startsWith", value: "/echo " }, "/echo hi")
    ).toBe(true);
    expect(
      matchFlowTrigger({ type: "startsWith", value: "/echo " }, "say /echo hi")
    ).toBe(false);
  });

  test("delegates endsWith to matchTrigger", () => {
    expect(
      matchFlowTrigger({ type: "endsWith", value: "bye" }, "say bye")
    ).toBe(true);
    expect(
      matchFlowTrigger({ type: "endsWith", value: "bye" }, "bye now")
    ).toBe(false);
  });

  test("delegates notEquals to matchTrigger", () => {
    expect(
      matchFlowTrigger({ type: "notEquals", value: "/start" }, "/stop")
    ).toBe(true);
    expect(
      matchFlowTrigger({ type: "notEquals", value: "/start" }, "/start")
    ).toBe(false);
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

  test("returns a copy of the target replies so callers cannot mutate the flow", () => {
    const flow: Flow = {
      ...baseFlow,
      edges: [
        {
          id: "e1",
          source: "start",
          target: "echo",
          data: { trigger: { type: "fallback", value: "" } },
        },
      ],
    };
    const step = executeFlow(flow, "hi", "start");
    step!.replies.push("mutated");
    expect(
      flow.nodes.find((n) => n.id === "echo")!.data.replies
    ).toEqual(["Echoing"]);
  });
});

describe("FlowRuntime", () => {
  const startNode: Flow["nodes"][number] = {
    id: "start",
    type: "start",
    position: { x: 0, y: 0 },
    data: { label: "Start", replies: [] },
  };
  const menuNode: Flow["nodes"][number] = {
    id: "menu",
    type: "state",
    position: { x: 0, y: 0 },
    data: { label: "Menu", replies: ["Welcome!"] },
  };
  const quizNode: Flow["nodes"][number] = {
    id: "quiz",
    type: "state",
    position: { x: 0, y: 0 },
    data: { label: "Quiz", replies: ["What is 2 + 2?", "Pick a number."] },
  };

  function buildFlow(): Flow {
    return {
      id: "f1",
      name: "Flow",
      startNodeId: "start",
      nodes: [startNode, menuNode, quizNode],
      edges: [
        {
          id: "eStart",
          source: "start",
          target: "menu",
          data: { trigger: { type: "equals", value: "/menu" } },
        },
        {
          id: "eMenu",
          source: "menu",
          target: "quiz",
          data: { trigger: { type: "equals", value: "/quiz" } },
        },
        {
          id: "eFallback",
          source: "start",
          target: "quiz",
          data: { trigger: { type: "fallback", value: "" } },
        },
      ],
    };
  }

  test("brand-new user starts at startNodeId", () => {
    const runtime = new FlowRuntime(buildFlow());
    // Falling back on the startsFrom-start edge lands on menu.
    expect(runtime.handleMessage(1, "/menu")).toBe("Welcome!");
  });

  test("state persists across messages: next message is evaluated from the new node", () => {
    const runtime = new FlowRuntime(buildFlow());
    // start -> menu
    runtime.handleMessage(1, "/menu");
    // From menu, only the quiz edge matches.
    expect(runtime.handleMessage(1, "/quiz")).toEqual([
      "What is 2 + 2?",
      "Pick a number.",
    ]);
  });

  test("returns the full array when a state has more than one reply", () => {
    const runtime = new FlowRuntime(buildFlow());
    // fallback from start -> quiz (two replies)
    expect(runtime.handleMessage(1, "anything")).toEqual([
      "What is 2 + 2?",
      "Pick a number.",
    ]);
  });

  test("returns undefined when a state has no replies", () => {
    const flow = buildFlow();
    const silentNode: Flow["nodes"][number] = {
      id: "silent",
      type: "state",
      position: { x: 0, y: 0 },
      data: { label: "Silent", replies: [] },
    };
    flow.nodes = [...flow.nodes, silentNode];
    flow.edges = [
      {
        id: "e1",
        source: "start",
        target: "silent",
        data: { trigger: { type: "fallback", value: "" } },
      },
    ];
    const runtime = new FlowRuntime(flow);
    expect(runtime.handleMessage(1, "hi")).toBeUndefined();
  });

  test("no-match leaves the state unchanged", () => {
    const runtime = new FlowRuntime(buildFlow());
    // From start, "/menu" matches; the next message from menu that matches nothing keeps menu.
    expect(runtime.handleMessage(1, "/menu")).toBe("Welcome!");
    // Nothing leaves "menu" for this message, so the user stays in menu.
    expect(runtime.handleMessage(1, "nothing")).toBeUndefined();
    // Still in menu -> quiz edge works.
    expect(runtime.handleMessage(1, "/quiz")).toEqual([
      "What is 2 + 2?",
      "Pick a number.",
    ]);
  });

  test("reset returns that user to startNodeId", () => {
    const runtime = new FlowRuntime(buildFlow());
    runtime.handleMessage(1, "/menu"); // user 1 -> menu
    runtime.reset(1);
    // Back at start, "/menu" again routes to menu.
    expect(runtime.handleMessage(1, "/menu")).toBe("Welcome!");
  });

  test("different users have independent states", () => {
    const runtime = new FlowRuntime(buildFlow());
    runtime.handleMessage(1, "/menu"); // user 1 -> menu
    // User 2 still evaluates from start -> its /menu message goes to menu.
    expect(runtime.handleMessage(2, "/menu")).toBe("Welcome!");
    // User 1 is still in menu: /menu no longer matches from menu.
    expect(runtime.handleMessage(1, "/menu")).toBeUndefined();
  });

  test("reset only clears the requested user, not others", () => {
    const runtime = new FlowRuntime(buildFlow());
    runtime.handleMessage(1, "/menu"); // user 1 -> menu
    runtime.handleMessage(2, "/menu"); // user 2 -> menu
    runtime.reset(1);
    // User 1 back at start.
    expect(runtime.handleMessage(1, "/menu")).toBe("Welcome!");
    // User 2 still in menu.
    expect(runtime.handleMessage(2, "/menu")).toBeUndefined();
  });

  test("a flow with empty startNodeId crashes gracefully (returns undefined)", () => {
    const flow = buildFlow();
    flow.startNodeId = "";
    const runtime = new FlowRuntime(flow);
    expect(runtime.handleMessage(1, "hi")).toBeUndefined();
  });
});

describe("validateFlow", () => {
  const startNode: Flow["nodes"][number] = {
    id: "start",
    type: "start",
    position: { x: 0, y: 0 },
    data: { label: "Start", replies: [] },
  };
  const stateNode: Flow["nodes"][number] = {
    id: "a",
    type: "state",
    position: { x: 0, y: 0 },
    data: { label: "A", replies: ["hi"] },
  };

  function validFlow(): Flow {
    return {
      id: "f1",
      name: "My Flow",
      startNodeId: "start",
      nodes: [startNode, stateNode],
      edges: [
        {
          id: "e1",
          source: "start",
          target: "a",
          data: { trigger: { type: "fallback", value: "" } },
        },
      ],
    };
  }

  test("a valid flow returns no errors", () => {
    expect(validateFlow(validFlow())).toEqual([]);
  });

  test("an empty name is required", () => {
    const flow = validFlow();
    flow.name = "";
    expect(validateFlow(flow)).toContain("Flow name is required");
  });

  test("a whitespace-only name is rejected", () => {
    const flow = validFlow();
    flow.name = "   ";
    expect(validateFlow(flow)).toContain("Flow name is required");
  });

  test("a flow with no start node is rejected", () => {
    const flow = validFlow();
    flow.nodes = [stateNode];
    expect(validateFlow(flow)).toContain("Flow must have a start node");
  });

  test("a flow with more than one start node is rejected", () => {
    const flow = validFlow();
    const secondStart: Flow["nodes"][number] = {
      id: "start2",
      type: "start",
      position: { x: 0, y: 0 },
      data: { label: "Start 2", replies: [] },
    };
    flow.nodes = [startNode, secondStart, stateNode];
    expect(validateFlow(flow)).toContain(
      "Flow can only have one start node"
    );
  });

  test("duplicate node ids each produce an error", () => {
    const flow = validFlow();
    flow.nodes = [startNode, startNode, stateNode];
    const errors = validateFlow(flow);
    expect(errors).toContain("Duplicate node id: start");
    expect(errors.filter((e) => e === "Duplicate node id: start")).toHaveLength(
      1
    );
  });

  test("an edge referencing a missing target node is rejected", () => {
    const flow = validFlow();
    flow.edges = [
      {
        id: "eBad",
        source: "start",
        target: "ghost",
        data: { trigger: { type: "fallback", value: "" } },
      },
    ];
    expect(validateFlow(flow)).toContain(
      "Edge eBad references a missing node"
    );
  });

  test("an edge referencing a missing source node is rejected", () => {
    const flow = validFlow();
    flow.edges = [
      {
        id: "eBad",
        source: "ghost",
        target: "a",
        data: { trigger: { type: "fallback", value: "" } },
      },
    ];
    expect(validateFlow(flow)).toContain(
      "Edge eBad references a missing node"
    );
  });

  test("an incoming edge to the start node is rejected", () => {
    const flow = validFlow();
    // state -> start
    flow.edges = [
      {
        id: "eBack",
        source: "a",
        target: "start",
        data: { trigger: { type: "fallback", value: "" } },
      },
    ];
    expect(validateFlow(flow)).toContain(
      "Start node cannot have incoming edges"
    );
  });

  test("multiple independent errors accumulate", () => {
    const flow = validFlow();
    flow.name = "";
    flow.nodes = [stateNode]; // no start node
    flow.edges = []; // drop edges that would reference the missing start
    const errors = validateFlow(flow);
    expect(errors).toContain("Flow name is required");
    expect(errors).toContain("Flow must have a start node");
    expect(errors).toHaveLength(2);
  });
});

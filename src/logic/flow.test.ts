import {
  ALL_NODE_TYPES,
  applyTransform,
  createFlow,
  createFlowNode,
  dropNodeDimensionChanges,
  executeFlow,
  flowEdgeLabel,
  FlowRuntime,
  flowFromSample,
  generateId,
  interpolate,
  matchTrigger,
  nodeCategory,
  removeFlowEdge,
  removeFlowNode,
  validateFlow,
  TRANSFORM_TYPES,
  TRIGGER_TYPES,
  TRIGGER_LABELS,
  POLL_USAGE_HINT,
  parsePoll,
  pollDisplay,
} from "./flow.ts";
import { Flow } from "../interfaces/flow.ts";
import { vi } from "vitest";

describe("dropNodeDimensionChanges", () => {
  test("drops React Flow dimensions bookkeeping changes", () => {
    expect(
      dropNodeDimensionChanges([
        { id: "n1", type: "dimensions", dimensions: { width: 120, height: 60 } },
        { id: "n2", type: "dimensions", dimensions: { width: 80, height: 40 } },
      ])
    ).toEqual([]);
  });

  test("keeps position, select, and remove changes", () => {
    const changes = [
      { id: "n1", type: "position", position: { x: 10, y: 20 } },
      { id: "n2", type: "select", selected: true },
      { id: "n3", type: "remove" },
    ];
    expect(dropNodeDimensionChanges(changes)).toEqual(changes);
  });

  test("keeps non-dimension changes when mixed", () => {
    expect(
      dropNodeDimensionChanges([
        { id: "n1", type: "dimensions", dimensions: { width: 120, height: 60 } },
        { id: "n2", type: "position", position: { x: 5, y: 5 } },
      ])
    ).toEqual([{ id: "n2", type: "position", position: { x: 5, y: 5 } }]);
  });
});

describe("TRIGGER_TYPES / TRIGGER_LABELS", () => {
  test("exposes the six trigger types", () => {
    expect(TRIGGER_TYPES).toEqual([
      "equals",
      "contains",
      "startsWith",
      "endsWith",
      "notEquals",
      "notContains",
    ]);
  });

  test("labels each trigger type", () => {
    expect(Object.keys(TRIGGER_LABELS).sort()).toEqual(
      [...TRIGGER_TYPES].sort()
    );
    expect(TRIGGER_LABELS.contains).toBe("message contains");
    expect(TRIGGER_LABELS.equals).toBe("message equals");
  });
});

describe("TRANSFORM_TYPES / ALL_NODE_TYPES / nodeCategory", () => {
  test("exposes the five concrete transform types", () => {
    expect(TRANSFORM_TYPES).toEqual([
      "lowercase",
      "uppercase",
      "trim",
      "replace",
      "extractRegex",
    ]);
  });

  test("ALL_NODE_TYPES contains every concrete node type once", () => {
    expect(ALL_NODE_TYPES).toEqual([
      "start",
      ...TRANSFORM_TYPES,
      ...TRIGGER_TYPES,
      "send",
      "random",
      "poll",
    ]);
    expect(new Set(ALL_NODE_TYPES).size).toBe(ALL_NODE_TYPES.length);
  });

  test("start maps to the start category", () => {
    expect(nodeCategory("start")).toBe("start");
  });

  test("every transform type maps to the transform category", () => {
    TRANSFORM_TYPES.forEach((t) => expect(nodeCategory(t)).toBe("transform"));
  });

  test("every trigger type maps to the condition category", () => {
    TRIGGER_TYPES.forEach((t) => expect(nodeCategory(t)).toBe("condition"));
  });

  test("send, random, and poll map to the send category", () => {
    expect(nodeCategory("send")).toBe("send");
    expect(nodeCategory("random")).toBe("send");
    expect(nodeCategory("poll")).toBe("send");
  });
});

describe("flowEdgeLabel", () => {
  test("labels an if handle as if", () => {
    expect(flowEdgeLabel("if")).toBe("if");
  });

  test("labels an else handle as else", () => {
    expect(flowEdgeLabel("else")).toBe("else");
  });

  test("undefined handle has no label", () => {
    expect(flowEdgeLabel(undefined)).toBeUndefined();
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

  test("replaces multiple distinct tokens in one pass", () => {
    expect(interpolate("{a}-{b}-{a}", { a: "x", b: "y" })).toBe("x-y-x");
  });

  test("empty template returns empty string", () => {
    expect(interpolate("", {})).toBe("");
  });
});

describe("matchTrigger", () => {
  test("equals trims both sides before comparing", () => {
    expect(matchTrigger("equals", "hi", "  hi  ")).toBe(true);
    expect(matchTrigger("equals", "hi", "hey")).toBe(false);
  });

  test("notEquals trims both sides and negates", () => {
    expect(matchTrigger("notEquals", "hi", "  hi  ")).toBe(false);
    expect(matchTrigger("notEquals", "hi", "hey")).toBe(true);
  });

  test("contains is a raw substring check", () => {
    expect(matchTrigger("contains", "hi", "say hi there")).toBe(true);
    expect(matchTrigger("contains", "hi", "hey")).toBe(false);
  });

  test("notContains negates the raw substring check", () => {
    expect(matchTrigger("notContains", "hi", "hey")).toBe(true);
    expect(matchTrigger("notContains", "hi", "say hi")).toBe(false);
  });

  test("startsWith checks the prefix", () => {
    expect(matchTrigger("startsWith", "/cmd", "/cmd run")).toBe(true);
    expect(matchTrigger("startsWith", "/cmd", "run /cmd")).toBe(false);
  });

  test("endsWith checks the suffix", () => {
    expect(matchTrigger("endsWith", "bye", "good bye")).toBe(true);
    expect(matchTrigger("endsWith", "bye", "bye good")).toBe(false);
  });
});

describe("applyTransform", () => {
  test("lowercase transforms the message", () => {
    expect(applyTransform("lowercase", { label: "L" }, "HeLLo")).toBe("hello");
  });

  test("uppercase transforms the message", () => {
    expect(applyTransform("uppercase", { label: "U" }, "hello")).toBe("HELLO");
  });

  test("trim strips surrounding whitespace", () => {
    expect(applyTransform("trim", { label: "T" }, "  hi  ")).toBe("hi");
  });

  test("replace replaces every occurrence literally", () => {
    expect(
      applyTransform("replace", { label: "R", find: "a", replacement: "o" }, "banana")
    ).toBe("bonono");
  });

  test("replace with an empty find returns the message unchanged", () => {
    expect(
      applyTransform("replace", { label: "R", find: "", replacement: "x" }, "hello")
    ).toBe("hello");
  });

  test("replace with a missing find returns the message unchanged", () => {
    expect(applyTransform("replace", { label: "R" }, "hello")).toBe("hello");
  });

  test("extractRegex returns the first full match", () => {
    expect(
      applyTransform("extractRegex", { label: "E", pattern: "\\d+" }, "abc 123 def 456")
    ).toBe("123");
  });

  test("extractRegex returns an empty string when there is no match", () => {
    expect(
      applyTransform("extractRegex", { label: "E", pattern: "\\d+" }, "no digits")
    ).toBe("");
  });

  test("extractRegex returns an empty string for an invalid regex", () => {
    expect(
      applyTransform("extractRegex", { label: "E", pattern: "(" }, "abc")
    ).toBe("");
  });
});

describe("createFlowNode", () => {
  test("start node gets a fresh id and Start label", () => {
    const node = createFlowNode("start");
    expect(node.id).toBeTruthy();
    expect(node.type).toBe("start");
    expect(node.data).toEqual({ label: "Start" });
    expect(node.position).toEqual({ x: 0, y: 0 });
  });

  test("lowercase/uppercase/trim nodes get only a label", () => {
    expect(createFlowNode("lowercase").data).toEqual({ label: "Lowercase" });
    expect(createFlowNode("uppercase").data).toEqual({ label: "Uppercase" });
    expect(createFlowNode("trim").data).toEqual({ label: "Trim" });
  });

  test("replace node gets empty find/replacement fields", () => {
    const node = createFlowNode("replace");
    expect(node.type).toBe("replace");
    expect(node.data).toEqual({ label: "Replace", find: "", replacement: "" });
  });

  test("extractRegex node gets an empty pattern field", () => {
    const node = createFlowNode("extractRegex");
    expect(node.type).toBe("extractRegex");
    expect(node.data).toEqual({ label: "Extract Regex", pattern: "" });
  });

  test("every trigger node gets its humanized label and empty value", () => {
    const expected: Record<string, string> = {
      equals: "Equals",
      notEquals: "Not Equals",
      startsWith: "Starts With",
      endsWith: "Ends With",
      contains: "Contains",
      notContains: "Not Contains",
    };
    TRIGGER_TYPES.forEach((type) => {
      const node = createFlowNode(type);
      expect(node.type).toBe(type);
      expect(node.data).toEqual({ label: expected[type], value: "" });
    });
  });

  test("send node gets empty replies", () => {
    const node = createFlowNode("send");
    expect(node.type).toBe("send");
    expect(node.data).toEqual({ label: "New Send", replies: [] });
  });

  test("random node gets empty replies and its own type", () => {
    const node = createFlowNode("random");
    expect(node.type).toBe("random");
    expect(node.data).toEqual({ label: "Random", replies: [] });
  });

  test("poll node gets only a Poll label (no replies field)", () => {
    const node = createFlowNode("poll");
    expect(node.type).toBe("poll");
    expect(node.data).toEqual({ label: "Poll" });
  });

  test("honors a provided position", () => {
    const node = createFlowNode("send", { x: 120, y: 40 });
    expect(node.position).toEqual({ x: 120, y: 40 });
  });

  test("each node gets a unique id", () => {
    expect(createFlowNode("send").id).not.toBe(createFlowNode("send").id);
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

describe("executeFlow (graph walk)", () => {
  function sendNode(id: string, replies: string[]): Flow["nodes"][number] {
    return { id, type: "send", position: { x: 0, y: 0 }, data: { label: id, replies } };
  }

  function startFlow(
    startNodeId: string,
    nodes: Flow["nodes"],
    edges: Flow["edges"]
  ): Flow {
    return { id: "f1", name: "Flow", startNodeId, nodes, edges };
  }

  test("start -> send returns the replies", () => {
    const start = { id: "start", type: "start" as const, position: { x: 0, y: 0 }, data: { label: "Start" } };
    const send = sendNode("send", ["Hello!"]);
    const flow = startFlow("start", [start, send], [{ id: "e1", source: "start", target: "send" }]);
    expect(executeFlow(flow, "hi")).toEqual(["Hello!"]);
  });

  test("start -> uppercase -> send feeds the transformed message to {msg}", () => {
    const start = { id: "start", type: "start" as const, position: { x: 0, y: 0 }, data: { label: "Start" } };
    const transform = {
      id: "tx",
      type: "uppercase" as const,
      position: { x: 240, y: 0 },
      data: { label: "Up" },
    };
    const send = sendNode("send", ["You said: {msg}"]);
    const flow = startFlow(
      "start",
      [start, transform, send],
      [
        { id: "e1", source: "start", target: "tx" },
        { id: "e2", source: "tx", target: "send" },
      ]
    );
    expect(executeFlow(flow, "hi")).toEqual(["You said: HI"]);
  });

  test("condition contains 'hi' matched follows the if branch", () => {
    const start = { id: "start", type: "start" as const, position: { x: 0, y: 0 }, data: { label: "Start" } };
    const cond = {
      id: "c",
      type: "contains" as const,
      position: { x: 240, y: 0 },
      data: { label: "C", value: "hi" },
    };
    const ifSend = sendNode("if", ["Hello! 👋"]);
    const elseSend = sendNode("else", ["Say hi!"]);
    const flow = startFlow(
      "start",
      [start, cond, ifSend, elseSend],
      [
        { id: "e1", source: "start", target: "c" },
        { id: "e2", source: "c", target: "if", sourceHandle: "if" },
        { id: "e3", source: "c", target: "else", sourceHandle: "else" },
      ]
    );
    expect(executeFlow(flow, "hey, hi there")).toEqual(["Hello! 👋"]);
  });

  test("condition contains 'hi' unmatched follows the else branch", () => {
    const start = { id: "start", type: "start" as const, position: { x: 0, y: 0 }, data: { label: "Start" } };
    const cond = {
      id: "c",
      type: "contains" as const,
      position: { x: 240, y: 0 },
      data: { label: "C", value: "hi" },
    };
    const ifSend = sendNode("if", ["Hello! 👋"]);
    const elseSend = sendNode("else", ["Say hi!"]);
    const flow = startFlow(
      "start",
      [start, cond, ifSend, elseSend],
      [
        { id: "e1", source: "start", target: "c" },
        { id: "e2", source: "c", target: "if", sourceHandle: "if" },
        { id: "e3", source: "c", target: "else", sourceHandle: "else" },
      ]
    );
    expect(executeFlow(flow, "good morning")).toEqual(["Say hi!"]);
  });

  test("condition with no else edge and an unmatched message returns undefined", () => {
    const start = { id: "start", type: "start" as const, position: { x: 0, y: 0 }, data: { label: "Start" } };
    const cond = {
      id: "c",
      type: "contains" as const,
      position: { x: 240, y: 0 },
      data: { label: "C", value: "hi" },
    };
    const ifSend = sendNode("if", ["Hello! 👋"]);
    const flow = startFlow(
      "start",
      [start, cond, ifSend],
      [
        { id: "e1", source: "start", target: "c" },
        { id: "e2", source: "c", target: "if", sourceHandle: "if" },
      ]
    );
    expect(executeFlow(flow, "good morning")).toBeUndefined();
  });

  test("dead end (node with no outgoing edge) returns undefined", () => {
    const start = { id: "start", type: "start" as const, position: { x: 0, y: 0 }, data: { label: "Start" } };
    const dead = {
      id: "dead",
      type: "lowercase" as const,
      position: { x: 240, y: 0 },
      data: { label: "Dead" },
    };
    const flow = startFlow("start", [start, dead], [{ id: "e1", source: "start", target: "dead" }]);
    expect(executeFlow(flow, "hi")).toBeUndefined();
  });

  test("a cycle with no send returns undefined (cycle guard)", () => {
    const a = { id: "a", type: "lowercase" as const, position: { x: 0, y: 0 }, data: { label: "A" } };
    const b = { id: "b", type: "uppercase" as const, position: { x: 0, y: 0 }, data: { label: "B" } };
    const flow = startFlow("a", [a, b], [
      { id: "e1", source: "a", target: "b" },
      { id: "e2", source: "b", target: "a" },
    ]);
    expect(executeFlow(flow, "hi")).toBeUndefined();
  });

  test("send with empty replies returns []", () => {
    const start = { id: "start", type: "start" as const, position: { x: 0, y: 0 }, data: { label: "Start" } };
    const send = sendNode("send", []);
    const flow = startFlow("start", [start, send], [{ id: "e1", source: "start", target: "send" }]);
    expect(executeFlow(flow, "hi")).toEqual([]);
  });

  test("missing start node returns undefined", () => {
    const send = sendNode("send", ["x"]);
    const flow = startFlow("does-not-exist", [send], []);
    expect(executeFlow(flow, "hi")).toBeUndefined();
  });

  test("empty startNodeId returns undefined", () => {
    const send = sendNode("send", ["x"]);
    const flow = startFlow("", [send], []);
    expect(executeFlow(flow, "hi")).toBeUndefined();
  });
});

describe("executeFlow (random node)", () => {
  function randomFlow(replies: string[]): Flow {
    return {
      id: "f1",
      name: "Random",
      startNodeId: "start",
      nodes: [
        { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
        { id: "rand", type: "random", position: { x: 240, y: 0 }, data: { label: "Rand", replies } },
      ],
      edges: [{ id: "e1", source: "start", target: "rand" }],
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("returns exactly ONE of the replies (first when random is 0)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(executeFlow(randomFlow(["A", "B", "C"]), "hi")).toEqual(["A"]);
  });

  test("returns the last reply when random is near 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(executeFlow(randomFlow(["A", "B", "C"]), "hi")).toEqual(["C"]);
  });

  test("interpolates {msg} in the picked reply", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    expect(executeFlow(randomFlow(["{msg}", "fixed"]), "hello")).toEqual(["hello"]);
  });

  test("random with empty replies returns []", () => {
    expect(executeFlow(randomFlow([]), "hi")).toEqual([]);
  });
});

describe("parsePoll", () => {
  test("parses '<title> option1, option2, option3' splitting at the last space", () => {
    expect(
      parsePoll("/poll What is your favorite color? red, blue, green")
    ).toEqual({
      kind: "poll",
      question: "What is your favorite color?",
      options: ["red", "blue", "green"],
    });
  });

  test("parses 'Title opt1, opt2' with the title as the question", () => {
    expect(parsePoll("/poll Title opt1, opt2")).toEqual({
      kind: "poll",
      question: "Title",
      options: ["opt1", "opt2"],
    });
  });

  test("a poll with no options returns the usage hint", () => {
    expect(parsePoll("/poll Title")).toBe(POLL_USAGE_HINT);
    expect(parsePoll("/poll")).toBe(POLL_USAGE_HINT);
  });

  test("a poll with a single option (options below 2) returns the usage hint", () => {
    expect(parsePoll("/poll opt1, opt2")).toBe(POLL_USAGE_HINT);
  });

  test("an 11-option poll returns the usage hint", () => {
    const opts = Array.from({ length: 11 }, (_, i) => `o${i + 1}`).join(", ");
    expect(parsePoll(`/poll Title ${opts}`)).toBe(POLL_USAGE_HINT);
  });

  test("a 10-option poll is accepted", () => {
    const opts = Array.from({ length: 10 }, (_, i) => `o${i + 1}`).join(", ");
    const result = parsePoll(`/poll Title ${opts}`);
    expect(result).not.toBe(POLL_USAGE_HINT);
    if (result !== POLL_USAGE_HINT) {
      expect(result.options).toHaveLength(10);
    }
  });

  test("strips surrounding whitespace and ignores empty option entries", () => {
    const parsed = parsePoll("/poll  Title  opt1 , , opt2 ");
    expect(parsed).toEqual({ kind: "poll", question: "Title", options: ["opt1", "opt2"] });
  });
});

describe("pollDisplay", () => {
  test("formats a local chat-log representation of the poll", () => {
    expect(
      pollDisplay({
        kind: "poll",
        question: "What is your favorite color?",
        options: ["red", "blue", "green"],
      })
    ).toBe("📊 Poll: What is your favorite color?\n• red\n• blue\n• green");
  });
});

describe("executeFlow (poll node)", () => {
  function pollFlow(): Flow {
    return {
      id: "f1",
      name: "Poll",
      startNodeId: "start",
      nodes: [
        { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
        { id: "poll", type: "poll", position: { x: 240, y: 0 }, data: { label: "Poll" } },
      ],
      edges: [{ id: "e1", source: "start", target: "poll" }],
    };
  }

  test("returns the parsed poll reply for a well-formed /poll command", () => {
    expect(executeFlow(pollFlow(), "/poll Color red, blue")).toEqual([
      { kind: "poll", question: "Color", options: ["red", "blue"] },
    ]);
  });

  test("returns the usage hint for a malformed /poll command", () => {
    expect(executeFlow(pollFlow(), "/poll Color")).toEqual([POLL_USAGE_HINT]);
  });
});

describe("FlowRuntime (stateless)", () => {
  function welcomeFlow(): Flow {
    return {
      id: "f1",
      name: "Welcome",
      startNodeId: "start",
      nodes: [
        { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
        { id: "send", type: "send", position: { x: 240, y: 0 }, data: { label: "Send", replies: ["Hi", "There"] } },
      ],
      edges: [{ id: "e1", source: "start", target: "send" }],
    };
  }

  test("walks from start on every message (stateless)", () => {
    const rt = new FlowRuntime(welcomeFlow());
    expect(rt.handleMessage(1, "a")).toEqual(["Hi", "There"]);
    // A second message from the same user must ALSO walk from start.
    expect(rt.handleMessage(1, "b")).toEqual(["Hi", "There"]);
  });

  test("returns a single string for one reply and string[] for multiple", () => {
    const single: Flow = {
      id: "f1",
      name: "Single",
      startNodeId: "start",
      nodes: [
        { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
        { id: "send", type: "send", position: { x: 240, y: 0 }, data: { label: "S", replies: ["One"] } },
      ],
      edges: [{ id: "e1", source: "start", target: "send" }],
    };
    const rt = new FlowRuntime(single);
    expect(rt.handleMessage(1, "a")).toBe("One");

    const rt2 = new FlowRuntime(welcomeFlow());
    expect(rt2.handleMessage(1, "hi")).toEqual(["Hi", "There"]);
  });

  test("returns undefined when no send node is reached", () => {
    const rt = new FlowRuntime({
      id: "f1",
      name: "NoSend",
      startNodeId: "start",
      nodes: [
        { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
        { id: "t", type: "lowercase", position: { x: 240, y: 0 }, data: { label: "T" } },
      ],
      edges: [{ id: "e1", source: "start", target: "t" }],
    });
    expect(rt.handleMessage(1, "a")).toBeUndefined();
  });

  test("returns [] when send has empty replies", () => {
    const rt = new FlowRuntime({
      id: "f1",
      name: "Silent",
      startNodeId: "start",
      nodes: [
        { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
        { id: "send", type: "send", position: { x: 240, y: 0 }, data: { label: "S", replies: [] } },
      ],
      edges: [{ id: "e1", source: "start", target: "send" }],
    });
    expect(rt.handleMessage(1, "a")).toEqual([]);
  });

  test("a random node with one reply returns that reply as a string", () => {
    const rt = new FlowRuntime({
      id: "f1",
      name: "Rand",
      startNodeId: "start",
      nodes: [
        { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
        { id: "rand", type: "random", position: { x: 240, y: 0 }, data: { label: "R", replies: ["Only"] } },
      ],
      edges: [{ id: "e1", source: "start", target: "rand" }],
    });
    expect(rt.handleMessage(1, "a")).toBe("Only");
  });

  test("a single poll reply is returned directly as a PollReply object", () => {
    const rt = new FlowRuntime({
      id: "f1",
      name: "Poll",
      startNodeId: "start",
      nodes: [
        { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
        { id: "poll", type: "poll", position: { x: 240, y: 0 }, data: { label: "Poll" } },
      ],
      edges: [{ id: "e1", source: "start", target: "poll" }],
    });
    expect(rt.handleMessage(1, "/poll Color red, blue")).toEqual({
      kind: "poll",
      question: "Color",
      options: ["red", "blue"],
    });
  });
});

describe("validateFlow", () => {
  const startNode: Flow["nodes"][number] = {
    id: "start",
    type: "start",
    position: { x: 0, y: 0 },
    data: { label: "Start" },
  };
  const sendNode: Flow["nodes"][number] = {
    id: "send",
    type: "send",
    position: { x: 0, y: 0 },
    data: { label: "Send", replies: ["hi"] },
  };
  const randomNode: Flow["nodes"][number] = {
    id: "rand",
    type: "random",
    position: { x: 0, y: 0 },
    data: { label: "Rand", replies: ["a", "b"] },
  };
  const pollNode: Flow["nodes"][number] = {
    id: "poll",
    type: "poll",
    position: { x: 0, y: 0 },
    data: { label: "Poll" },
  };
  const transformNode: Flow["nodes"][number] = {
    id: "tx",
    type: "lowercase",
    position: { x: 0, y: 0 },
    data: { label: "T" },
  };
  const conditionNode: Flow["nodes"][number] = {
    id: "c",
    type: "contains",
    position: { x: 0, y: 0 },
    data: { label: "C", value: "hi" },
  };

  function validFlow(): Flow {
    return {
      id: "f1",
      name: "My Flow",
      startNodeId: "start",
      nodes: [startNode, sendNode],
      edges: [{ id: "e1", source: "start", target: "send" }],
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

  test("a flow with no start node is rejected", () => {
    const flow = validFlow();
    flow.nodes = [sendNode];
    expect(validateFlow(flow)).toContain("Flow must have a start node");
  });

  test("a flow with more than one start node is rejected", () => {
    const flow = validFlow();
    const secondStart: Flow["nodes"][number] = {
      id: "start2",
      type: "start",
      position: { x: 0, y: 0 },
      data: { label: "S2" },
    };
    flow.nodes = [startNode, secondStart, sendNode];
    expect(validateFlow(flow)).toContain("Flow can only have one start node");
  });

  test("duplicate node ids each produce an error", () => {
    const flow = validFlow();
    flow.nodes = [startNode, startNode];
    const errors = validateFlow(flow);
    expect(errors).toContain("Duplicate node id: start");
    expect(errors.filter((e) => e === "Duplicate node id: start")).toHaveLength(1);
  });

  test("an edge referencing a missing source node is rejected", () => {
    const flow = validFlow();
    flow.edges = [{ id: "eBad", source: "ghost", target: "send" }];
    expect(validateFlow(flow)).toContain("Edge eBad references a missing node");
  });

  test("an incoming edge to the start node is rejected", () => {
    const flow = validFlow();
    flow.edges = [{ id: "eBack", source: "send", target: "start" }];
    expect(validateFlow(flow)).toContain("Start node cannot have incoming edges");
  });

  test("startNodeId pointing at a different existing node is rejected", () => {
    const flow = validFlow();
    flow.startNodeId = "send"; // 'send' exists but is not the start node
    expect(validateFlow(flow)).toContain(
      "startNodeId must point to the start node"
    );
  });

  test("start node with multiple outgoing edges is rejected", () => {
    const flow = validFlow();
    flow.edges = [
      { id: "e1", source: "start", target: "send" },
      { id: "e2", source: "start", target: "send" },
    ];
    expect(validateFlow(flow)).toContain(
      "Node start has multiple outgoing edges; only the first is reachable"
    );
  });

  test("transform node with multiple outgoing edges is rejected", () => {
    const flow = validFlow();
    flow.nodes = [startNode, transformNode, sendNode];
    flow.edges = [
      { id: "e1", source: "start", target: "tx" },
      { id: "e2", source: "tx", target: "send" },
      { id: "e3", source: "tx", target: "send" },
    ];
    expect(validateFlow(flow)).toContain(
      "Node tx has multiple outgoing edges; only the first is reachable"
    );
  });

  test("condition node with multiple if edges is rejected", () => {
    const flow = validFlow();
    flow.nodes = [startNode, conditionNode, sendNode];
    flow.edges = [
      { id: "e1", source: "start", target: "c" },
      { id: "e2", source: "c", target: "send", sourceHandle: "if" },
      { id: "e3", source: "c", target: "send", sourceHandle: "if" },
    ];
    expect(validateFlow(flow)).toContain(
      "Node c has multiple if edges; only the first is reachable"
    );
  });

  test("condition node with multiple else edges is rejected", () => {
    const flow = validFlow();
    flow.nodes = [startNode, conditionNode, sendNode];
    flow.edges = [
      { id: "e1", source: "start", target: "c" },
      { id: "e2", source: "c", target: "send", sourceHandle: "else" },
      { id: "e3", source: "c", target: "send", sourceHandle: "else" },
    ];
    expect(validateFlow(flow)).toContain(
      "Node c has multiple else edges; only the first is reachable"
    );
  });

  test("send node with an outgoing edge is rejected", () => {
    const flow = validFlow();
    flow.nodes = [startNode, sendNode, transformNode];
    flow.edges = [
      { id: "e1", source: "start", target: "send" },
      { id: "e2", source: "send", target: "tx" },
    ];
    expect(validateFlow(flow)).toContain(
      "Node send is a send node and cannot have outgoing edges"
    );
  });

  test("random node with an outgoing edge is rejected", () => {
    const flow = validFlow();
    flow.nodes = [startNode, randomNode, transformNode];
    flow.edges = [
      { id: "e1", source: "start", target: "rand" },
      { id: "e2", source: "rand", target: "tx" },
    ];
    expect(validateFlow(flow)).toContain(
      "Node rand is a send node and cannot have outgoing edges"
    );
  });

  test("poll node with an outgoing edge is rejected", () => {
    const flow = validFlow();
    flow.nodes = [startNode, pollNode, transformNode];
    flow.edges = [
      { id: "e1", source: "start", target: "poll" },
      { id: "e2", source: "poll", target: "tx" },
    ];
    expect(validateFlow(flow)).toContain(
      "Node poll is a send node and cannot have outgoing edges"
    );
  });
});

describe("flowFromSample", () => {
  const startNode: Flow["nodes"][number] = {
    id: "node-start",
    type: "start",
    position: { x: 0, y: 0 },
    data: { label: "Start" },
  };
  const transformNode: Flow["nodes"][number] = {
    id: "node-tx",
    type: "replace",
    position: { x: 240, y: 0 },
    data: { label: "T", find: "a", replacement: "o" },
  };
  const conditionNode: Flow["nodes"][number] = {
    id: "node-c",
    type: "contains",
    position: { x: 480, y: 0 },
    data: { label: "C", value: "hi" },
  };
  const ifSend: Flow["nodes"][number] = {
    id: "node-if",
    type: "send",
    position: { x: 720, y: -140 },
    data: { label: "If", replies: ["Hello! 👋"] },
  };
  const elseSend: Flow["nodes"][number] = {
    id: "node-else",
    type: "send",
    position: { x: 720, y: 140 },
    data: { label: "Else", replies: ["Say hi!"] },
  };

  const sample = {
    name: "Greeting Check",
    flow: {
      id: "flow-sample",
      name: "Greeting Check",
      startNodeId: "node-start",
      nodes: [startNode, transformNode, conditionNode, ifSend, elseSend],
      edges: [
        { id: "edge-1", source: "node-start", target: "node-tx" },
        { id: "edge-2", source: "node-tx", target: "node-c" },
        { id: "edge-3", source: "node-c", target: "node-if", sourceHandle: "if" as const },
        { id: "edge-4", source: "node-c", target: "node-else", sourceHandle: "else" as const },
      ],
    },
  };

  test("copies the name, structure, transform fields, trigger values, and replies", () => {
    const created = flowFromSample(sample);
    expect(created.name).toBe("Greeting Check");
    expect(created.nodes.map((n) => n.data)).toEqual([
      { label: "Start" },
      { label: "T", find: "a", replacement: "o" },
      { label: "C", value: "hi" },
      { label: "If", replies: ["Hello! 👋"] },
      { label: "Else", replies: ["Say hi!"] },
    ]);
    expect(created.edges[2].sourceHandle).toBe("if");
    expect(created.edges[3].sourceHandle).toBe("else");
    // plain edges keep no sourceHandle
    expect(created.edges[0].sourceHandle).toBeUndefined();
  });

  test("generates fresh ids and remaps startNodeId", () => {
    const first = flowFromSample(sample);
    const second = flowFromSample(sample);

    expect(first.id).not.toBe(sample.flow.id);
    expect(first.id).not.toBe(second.id);
    first.nodes.forEach((n, i) => {
      expect(n.id).not.toBe(sample.flow.nodes[i].id);
      expect(n.id).not.toBe(second.nodes[i].id);
    });
    first.edges.forEach((e, i) => {
      expect(e.id).not.toBe(sample.flow.edges[i].id);
      expect(e.id).not.toBe(second.edges[i].id);
    });
    // Edges reference the copied (fresh) node ids.
    first.edges.forEach((e) => {
      const ids = first.nodes.map((n) => n.id);
      expect(ids).toContain(e.source);
      expect(ids).toContain(e.target);
    });
    // startNodeId points at the fresh start node.
    const start = first.nodes.find((n) => n.type === "start")!;
    expect(first.startNodeId).toBe(start.id);
  });

  test("deep-copies data so mutating the copy does not affect the source", () => {
    const created = flowFromSample(sample);
    const createdTx = created.nodes.find((n) => n.type === "replace")!;
    createdTx.data.find = "Z";
    createdTx.data.replacement = "Q";

    const createdCond = created.nodes.find((n) => n.type === "contains")!;
    createdCond.data.value = "changed";

    const createdIf = created.nodes.find((n) => n.id === created.nodes.find((nn) => nn.type === "send" && (nn.data.replies?.[0] === "Hello! 👋"))!.id)!;
    createdIf.data.replies!.push("mutated");

    // Source transform/trigger/replies unaffected.
    expect(sample.flow.nodes[1].data).toEqual({ label: "T", find: "a", replacement: "o" });
    expect(sample.flow.nodes[2].data).toEqual({ label: "C", value: "hi" });
    const srcIf = sample.flow.nodes.find((n) => n.type === "send")!;
    expect(srcIf.data.replies).toEqual(["Hello! 👋"]);
    // The created flow still validates cleanly.
    expect(validateFlow(created)).toEqual([]);
  });

  test("the created flow validates cleanly", () => {
    expect(validateFlow(flowFromSample(sample))).toEqual([]);
  });
});

describe("removeFlowNode / removeFlowEdge", () => {
  const flow: Flow = {
    id: "f1",
    name: "Flow",
    startNodeId: "start",
    nodes: [
      { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
      { id: "cond", type: "contains", position: { x: 100, y: 0 }, data: { label: "Cond", value: "hi" } },
      { id: "send", type: "send", position: { x: 200, y: 0 }, data: { label: "Send", replies: ["ok"] } },
    ],
    edges: [
      { id: "e1", source: "start", target: "cond" },
      { id: "e2", source: "cond", target: "send", sourceHandle: "if" },
      { id: "e3", source: "cond", target: "send", sourceHandle: "else" },
    ],
  };

  test("removes a node and every edge connected to it", () => {
    const next = removeFlowNode(flow, "cond");
    expect(next.nodes.map((n) => n.id)).toEqual(["start", "send"]);
    expect(next.edges).toEqual([]);
    expect(next.startNodeId).toBe("start");
  });

  test("clears startNodeId when the start node is removed", () => {
    const next = removeFlowNode(flow, "start");
    expect(next.nodes.map((n) => n.id)).toEqual(["cond", "send"]);
    expect(next.startNodeId).toBe("");
  });

  test("keeps the flow unchanged when the node does not exist", () => {
    const next = removeFlowNode(flow, "missing");
    expect(next.nodes).toHaveLength(3);
    expect(next.edges).toHaveLength(3);
  });

  test("removes a single edge by id", () => {
    const next = removeFlowEdge(flow, "e2");
    expect(next.edges.map((e) => e.id)).toEqual(["e1", "e3"]);
    expect(next.nodes).toHaveLength(3);
  });

  test("keeps the flow unchanged when the edge does not exist", () => {
    const next = removeFlowEdge(flow, "missing");
    expect(next.edges).toHaveLength(3);
  });
});

describe("generateId (crypto.randomUUID branch)", () => {
  test("returns the uuid produced by crypto.randomUUID when available", () => {
    // jsdom 30 exposes crypto as a getter-only global, so restore via
    // defineProperty (plain assignment throws).
    const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: () => "fixed-uuid" },
      configurable: true,
      writable: true,
    });
    try {
      expect(generateId()).toBe("fixed-uuid");
    } finally {
      if (original) {
        Object.defineProperty(globalThis, "crypto", original);
      } else {
        delete (globalThis as any).crypto;
      }
    }
  });
});

describe("executeFlow (edge cases)", () => {
  function startNode(): Flow["nodes"][number] {
    return { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } };
  }

  function flow(
    startNodeId: string,
    nodes: Flow["nodes"],
    edges: Flow["edges"]
  ): Flow {
    return { id: "f1", name: "Flow", startNodeId, nodes, edges };
  }

  test("start node with no outgoing edge returns undefined", () => {
    const start = startNode();
    expect(executeFlow(flow("start", [start], []), "hi")).toBeUndefined();
  });

  test("start node whose outgoing edge targets a missing node returns undefined", () => {
    const start = startNode();
    const f = flow("start", [start], [{ id: "e1", source: "start", target: "ghost" }]);
    expect(executeFlow(f, "hi")).toBeUndefined();
  });

  test("transform node whose outgoing edge targets a missing node returns undefined", () => {
    const start = startNode();
    const tx = { id: "tx", type: "uppercase" as const, position: { x: 240, y: 0 }, data: { label: "T" } };
    const f = flow("start", [start, tx], [
      { id: "e1", source: "start", target: "tx" },
      { id: "e2", source: "tx", target: "ghost" },
    ]);
    expect(executeFlow(f, "hi")).toBeUndefined();
  });

  test("matched condition with no if branch edge returns undefined", () => {
    const start = startNode();
    const cond = { id: "c", type: "contains" as const, position: { x: 240, y: 0 }, data: { label: "C", value: "hi" } };
    const elseSend = { id: "else", type: "send" as const, position: { x: 480, y: 0 }, data: { label: "Else", replies: ["Say hi!"] } };
    const f = flow("start", [start, cond, elseSend], [
      { id: "e1", source: "start", target: "c" },
      { id: "e2", source: "c", target: "else", sourceHandle: "else" },
    ]);
    expect(executeFlow(f, "hello hi there")).toBeUndefined();
  });
});

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
  applyPollConfig,
  parsePoll,
  pollDisplay,
  NODE_LABELS,
  NODE_DESCRIPTIONS,
} from "./flow.ts";
import { Flow, PollReply } from "../interfaces/flow.ts";
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
  test("exposes the eight trigger types", () => {
    expect(TRIGGER_TYPES).toEqual([
      "equals",
      "contains",
      "startsWith",
      "endsWith",
      "notEquals",
      "notContains",
      "notStartsWith",
      "notEndsWith",
    ]);
  });

  test("labels each trigger type", () => {
    expect(Object.keys(TRIGGER_LABELS).sort()).toEqual(
      [...TRIGGER_TYPES].sort()
    );
    expect(TRIGGER_LABELS.contains).toBe("message contains");
    expect(TRIGGER_LABELS.equals).toBe("message equals");
    expect(TRIGGER_LABELS.notStartsWith).toBe("message does not start with");
    expect(TRIGGER_LABELS.notEndsWith).toBe("message does not end with");
  });
});

describe("TRANSFORM_TYPES / ALL_NODE_TYPES / nodeCategory", () => {
  test("exposes the nine concrete transform types", () => {
    expect(TRANSFORM_TYPES).toEqual([
      "lowercase",
      "uppercase",
      "trim",
      "replace",
      "extractRegex",
      "randomNumber",
      "concatFront",
      "concatBack",
      "template",
    ]);
  });

  test("ALL_NODE_TYPES contains every concrete node type once", () => {
    expect(ALL_NODE_TYPES).toEqual([
      "start",
      ...TRANSFORM_TYPES,
      ...TRIGGER_TYPES,
      "send",
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

  test("send and poll map to the send category", () => {
    expect(nodeCategory("send")).toBe("send");
    expect(nodeCategory("poll")).toBe("send");
  });
});

describe("NODE_LABELS / NODE_DESCRIPTIONS", () => {
  test("covers every node type with non-empty labels and descriptions", () => {
    ALL_NODE_TYPES.forEach((type) => {
      expect(NODE_LABELS[type]).toBeTruthy();
      expect(typeof NODE_LABELS[type]).toBe("string");
      expect(NODE_LABELS[type].length).toBeGreaterThan(0);
    });
    ALL_NODE_TYPES.forEach((type) => {
      expect(NODE_DESCRIPTIONS[type]).toBeTruthy();
      expect(typeof NODE_DESCRIPTIONS[type]).toBe("string");
      expect(NODE_DESCRIPTIONS[type].length).toBeGreaterThan(0);
    });
  });

  test("exposes exact display labels for representative types", () => {
    expect(NODE_LABELS.start).toBe("Start");
    expect(NODE_LABELS.extractRegex).toBe("Extract Regex");
    expect(NODE_LABELS.randomNumber).toBe("Random Number");
    expect(NODE_LABELS.notContains).toBe("Not Contains");
    expect(NODE_LABELS.notStartsWith).toBe("Not Starts With");
    expect(NODE_LABELS.notEndsWith).toBe("Not Ends With");
    expect(NODE_LABELS.concatFront).toBe("Concat Front");
    expect(NODE_LABELS.concatBack).toBe("Concat Back");
    expect(NODE_LABELS.template).toBe("Template");
    expect(NODE_LABELS.poll).toBe("Poll");
  });

  test("exposes exact one-line descriptions for representative types", () => {
    expect(NODE_DESCRIPTIONS.start).toBe("Flow entry point.");
    expect(NODE_DESCRIPTIONS.extractRegex).toBe(
      "Keep text matching a pattern."
    );
    expect(NODE_DESCRIPTIONS.randomNumber).toBe(
      "Replace with a random number."
    );
    expect(NODE_DESCRIPTIONS.notContains).toBe(
      "Message does not contain the value."
    );
    expect(NODE_DESCRIPTIONS.notStartsWith).toBe(
      "Message does not start with the value."
    );
    expect(NODE_DESCRIPTIONS.notEndsWith).toBe(
      "Message does not end with the value."
    );
    expect(NODE_DESCRIPTIONS.concatFront).toBe("Add text before the message.");
    expect(NODE_DESCRIPTIONS.concatBack).toBe("Add text after the message.");
    expect(NODE_DESCRIPTIONS.template).toBe(
      "Build text from a template with {msg}."
    );
    expect(NODE_DESCRIPTIONS.poll).toBe("Send a Telegram poll.");
  });

  test("createFlowNode labels every type except send from NODE_LABELS", () => {
    ALL_NODE_TYPES.forEach((type) => {
      if (type === "send") {
        expect(createFlowNode(type).data.label).toBe("New Send");
      } else {
        expect(createFlowNode(type).data.label).toBe(NODE_LABELS[type]);
      }
    });
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

  test("notStartsWith negates the raw prefix check", () => {
    expect(matchTrigger("notStartsWith", "/x", "abc")).toBe(true);
    expect(matchTrigger("notStartsWith", "/x", "/xabc")).toBe(false);
  });

  test("notEndsWith negates the raw suffix check", () => {
    expect(matchTrigger("notEndsWith", "!", "hi")).toBe(true);
    expect(matchTrigger("notEndsWith", "!", "hi!")).toBe(false);
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

  test("randomNumber returns the min value when Math.random is 0", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(
      applyTransform("randomNumber", { label: "R", min: "1", max: "6" }, "anything")
    ).toBe("1");
  });

  test("randomNumber returns the max value when Math.random is near 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(
      applyTransform("randomNumber", { label: "R", min: "1", max: "6" }, "anything")
    ).toBe("6");
  });

  test("randomNumber picks an inclusive value inside the range", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    // floor(0.4 * 6) + 1 = 3
    expect(
      applyTransform("randomNumber", { label: "R", min: "1", max: "6" }, "x")
    ).toBe("3");
  });

  test("randomNumber honors a custom min/max range", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(
      applyTransform("randomNumber", { label: "R", min: "10", max: "12" }, "x")
    ).toBe("10");
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(
      applyTransform("randomNumber", { label: "R", min: "10", max: "12" }, "x")
    ).toBe("12");
  });

  test("randomNumber leaves the message unchanged when min/max are missing", () => {
    expect(
      applyTransform("randomNumber", { label: "R" }, "keep me")
    ).toBe("keep me");
  });

  test("randomNumber leaves the message unchanged when min/max are not numbers", () => {
    expect(
      applyTransform("randomNumber", { label: "R", min: "a", max: "b" }, "keep me")
    ).toBe("keep me");
  });

  test("randomNumber leaves the message unchanged when min exceeds max", () => {
    expect(
      applyTransform("randomNumber", { label: "R", min: "6", max: "1" }, "keep me")
    ).toBe("keep me");
  });

  test("concatFront prepends the text to the message", () => {
    expect(
      applyTransform("concatFront", { label: "C", text: "> " }, "hi")
    ).toBe("> hi");
  });

  test("concatFront with empty text leaves the message unchanged", () => {
    expect(applyTransform("concatFront", { label: "C", text: "" }, "hi")).toBe(
      "hi"
    );
    expect(applyTransform("concatFront", { label: "C" }, "hi")).toBe("hi");
  });

  test("concatBack appends the text to the message", () => {
    expect(
      applyTransform("concatBack", { label: "C", text: "!" }, "hi")
    ).toBe("hi!");
  });

  test("concatBack with empty text leaves the message unchanged", () => {
    expect(applyTransform("concatBack", { label: "C", text: "" }, "hi")).toBe(
      "hi"
    );
    expect(applyTransform("concatBack", { label: "C" }, "hi")).toBe("hi");
  });

  test("template interpolates {msg} into the template", () => {
    expect(
      applyTransform(
        "template",
        { label: "T", template: "Hello {msg}!" },
        "hi"
      )
    ).toBe("Hello hi!");
  });

  test("template with no tokens keeps the literal template", () => {
    expect(
      applyTransform("template", { label: "T", template: "plain" }, "hi")
    ).toBe("plain");
  });

  test("template with no template returns an empty string", () => {
    expect(applyTransform("template", { label: "T", template: "" }, "hi")).toBe(
      ""
    );
    expect(applyTransform("template", { label: "T" }, "hi")).toBe("");
  });

  test("template leaves unknown tokens literal", () => {
    expect(
      applyTransform("template", { label: "T", template: "{unknown} x" }, "hi")
    ).toBe("{unknown} x");
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
      notStartsWith: "Not Starts With",
      notEndsWith: "Not Ends With",
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

  test("concatFront node gets empty text", () => {
    const node = createFlowNode("concatFront");
    expect(node.type).toBe("concatFront");
    expect(node.data).toEqual({ label: "Concat Front", text: "" });
  });

  test("concatBack node gets empty text", () => {
    const node = createFlowNode("concatBack");
    expect(node.type).toBe("concatBack");
    expect(node.data).toEqual({ label: "Concat Back", text: "" });
  });

  test("template node gets an empty template", () => {
    const node = createFlowNode("template");
    expect(node.type).toBe("template");
    expect(node.data).toEqual({ label: "Template", template: "" });
  });

  test("randomNumber node gets default min and max bounds", () => {
    const node = createFlowNode("randomNumber");
    expect(node.type).toBe("randomNumber");
    expect(node.data).toEqual({ label: "Random Number", min: "1", max: "6" });
  });

  test("poll node gets default poll config and no replies field", () => {
    const node = createFlowNode("poll");
    expect(node.type).toBe("poll");
    expect(node.data).toEqual({
      label: "Poll",
      pollType: "regular",
      isAnonymous: "true",
      allowsMultipleAnswers: "false",
    });
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

  test("concatFront/concatBack/template chains feed the send node", () => {
    const start = { id: "start", type: "start" as const, position: { x: 0, y: 0 }, data: { label: "Start" } };
    const front = {
      id: "front",
      type: "concatFront" as const,
      position: { x: 240, y: 0 },
      data: { label: "Front", text: "> " },
    };
    const back = {
      id: "back",
      type: "concatBack" as const,
      position: { x: 480, y: 0 },
      data: { label: "Back", text: "!" },
    };
    const tmpl = {
      id: "tmpl",
      type: "template" as const,
      position: { x: 720, y: 0 },
      data: { label: "Tmpl", template: "🎺 {msg}" },
    };
    const send = sendNode("send", ["{msg}"]);
    const flow = startFlow(
      "start",
      [start, front, back, tmpl, send],
      [
        { id: "e1", source: "start", target: "front" },
        { id: "e2", source: "front", target: "back" },
        { id: "e3", source: "back", target: "tmpl" },
        { id: "e4", source: "tmpl", target: "send" },
      ]
    );
    expect(executeFlow(flow, "hi")).toEqual(["🎺 > hi!"]);
  });

  test("notStartsWith condition follows the else branch when the prefix matches", () => {
    const start = { id: "start", type: "start" as const, position: { x: 0, y: 0 }, data: { label: "Start" } };
    const cond = {
      id: "c",
      type: "notStartsWith" as const,
      position: { x: 240, y: 0 },
      data: { label: "C", value: "/" },
    };
    const greeting = sendNode("greet", ["Hi {msg}"]);
    const command = sendNode("cmd", ["That is a command"]);
    const flow = startFlow(
      "start",
      [start, cond, greeting, command],
      [
        { id: "e1", source: "start", target: "c" },
        { id: "e2", source: "c", target: "greet", sourceHandle: "if" },
        { id: "e3", source: "c", target: "cmd", sourceHandle: "else" },
      ]
    );
    expect(executeFlow(flow, "hello")).toEqual(["Hi hello"]);
    expect(executeFlow(flow, "/hello")).toEqual(["That is a command"]);
  });

  test("notEndsWith condition follows the if branch when the suffix is absent", () => {
    const start = { id: "start", type: "start" as const, position: { x: 0, y: 0 }, data: { label: "Start" } };
    const cond = {
      id: "c",
      type: "notEndsWith" as const,
      position: { x: 240, y: 0 },
      data: { label: "C", value: "!" },
    };
    const plain = sendNode("plain", ["{msg}"]);
    const excited = sendNode("excited", ["{msg}!!"]);
    const flow = startFlow(
      "start",
      [start, cond, plain, excited],
      [
        { id: "e1", source: "start", target: "c" },
        { id: "e2", source: "c", target: "plain", sourceHandle: "if" },
        { id: "e3", source: "c", target: "excited", sourceHandle: "else" },
      ]
    );
    expect(executeFlow(flow, "hi")).toEqual(["hi"]);
    expect(executeFlow(flow, "hi!")).toEqual(["hi!!!"]);
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

describe("applyPollConfig", () => {
  const base: PollReply = { kind: "poll", question: "Q", options: ["a", "b"] };

  test("leaves the base poll untouched when no config is set", () => {
    expect(applyPollConfig(base, { label: "Poll" })).toEqual(base);
  });

  test("omits Telegram defaults (anonymous, regular, single answer)", () => {
    expect(
      applyPollConfig(base, {
        label: "Poll",
        pollType: "regular",
        isAnonymous: "true",
        allowsMultipleAnswers: "false",
      })
    ).toEqual(base);
  });

  test("includes quiz type, public, and multiple answers when configured", () => {
    expect(
      applyPollConfig(base, {
        label: "Poll",
        pollType: "quiz",
        isAnonymous: "false",
        allowsMultipleAnswers: "true",
      })
    ).toEqual({
      kind: "poll",
      question: "Q",
      options: ["a", "b"],
      type: "quiz",
      isAnonymous: false,
      allowsMultipleAnswers: true,
    });
  });

  test("includes correctOptionId, explanation and openPeriod when set", () => {
    expect(
      applyPollConfig(base, {
        label: "Poll",
        correctOptionId: "1",
        explanation: "It is A",
        openPeriod: "30",
      })
    ).toEqual({
      kind: "poll",
      question: "Q",
      options: ["a", "b"],
      correctOptionId: 1,
      explanation: "It is A",
      openPeriod: 30,
    });
  });

  test("ignores invalid correctOptionId and openPeriod", () => {
    expect(
      applyPollConfig(base, { label: "Poll", correctOptionId: "x", openPeriod: "0" })
    ).toEqual(base);
    expect(
      applyPollConfig(base, { label: "Poll", correctOptionId: "-1", openPeriod: "9999" })
    ).toEqual(base);
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

  test("labels quiz polls as a quiz", () => {
    expect(
      pollDisplay({
        kind: "poll",
        question: "Which one?",
        options: ["a", "b"],
        type: "quiz",
      })
    ).toBe("📊 Quiz: Which one?\n• a\n• b");
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

  test("applies the node's poll config to the parsed reply", () => {
    const flow = {
      id: "f1",
      name: "Poll",
      startNodeId: "start",
      nodes: [
        { id: "start", type: "start" as const, position: { x: 0, y: 0 }, data: { label: "Start" } },
        {
          id: "poll",
          type: "poll" as const,
          position: { x: 240, y: 0 },
          data: {
            label: "Poll",
            pollType: "quiz",
            isAnonymous: "false",
            allowsMultipleAnswers: "true",
            correctOptionId: "0",
            explanation: "It is A",
            openPeriod: "30",
          },
        },
      ],
      edges: [{ id: "e1", source: "start", target: "poll" }],
    };
    expect(executeFlow(flow, "/poll Color red, blue")).toEqual([
      {
        kind: "poll",
        question: "Color",
        options: ["red", "blue"],
        type: "quiz",
        isAnonymous: false,
        allowsMultipleAnswers: true,
        correctOptionId: 0,
        explanation: "It is A",
        openPeriod: 30,
      },
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

  test("flows using the new concat/template transforms and negated triggers validate cleanly", () => {
    const flow: Flow = {
      id: "f1",
      name: "Greeting",
      startNodeId: "start",
      nodes: [
        startNode,
        {
          id: "lower",
          type: "lowercase",
          position: { x: 0, y: 0 },
          data: { label: "Lowercase" },
        },
        {
          id: "notCmd",
          type: "notStartsWith",
          position: { x: 0, y: 0 },
          data: { label: "Not Command", value: "/" },
        },
        {
          id: "front",
          type: "concatFront",
          position: { x: 0, y: 0 },
          data: { label: "Concat Front", text: "👋 " },
        },
        {
          id: "back",
          type: "concatBack",
          position: { x: 0, y: 0 },
          data: { label: "Concat Back", text: "!" },
        },
        {
          id: "tmpl",
          type: "template",
          position: { x: 0, y: 0 },
          data: { label: "Template", template: "{msg}" },
        },
        {
          id: "notEnd",
          type: "notEndsWith",
          position: { x: 0, y: 0 },
          data: { label: "Not Endswith", value: "?" },
        },
        sendNode,
      ],
      edges: [
        { id: "e1", source: "start", target: "lower" },
        { id: "e2", source: "lower", target: "notCmd", sourceHandle: undefined },
        { id: "e3", source: "notCmd", target: "front", sourceHandle: "if" },
        { id: "e4", source: "front", target: "back" },
        { id: "e5", source: "back", target: "tmpl" },
        { id: "e6", source: "tmpl", target: "notEnd" },
        { id: "e7", source: "notEnd", target: "send", sourceHandle: "if" },
      ],
    };
    expect(validateFlow(flow)).toEqual([]);
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
  const randomNumberNode: Flow["nodes"][number] = {
    id: "node-rn",
    type: "randomNumber",
    position: { x: 360, y: 0 },
    data: { label: "R", min: "1", max: "20" },
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
  const pollConfigNode: Flow["nodes"][number] = {
    id: "node-poll",
    type: "poll",
    position: { x: 720, y: 280 },
    data: {
      label: "Pick",
      pollType: "quiz",
      isAnonymous: "false",
      allowsMultipleAnswers: "true",
      correctOptionId: "1",
      explanation: "It is A",
      openPeriod: "60",
    },
  };

  const sample = {
    name: "Greeting Check",
    flow: {
      id: "flow-sample",
      name: "Greeting Check",
      startNodeId: "node-start",
      nodes: [startNode, transformNode, randomNumberNode, conditionNode, ifSend, elseSend, pollConfigNode],
      edges: [
        { id: "edge-1", source: "node-start", target: "node-tx" },
        { id: "edge-2", source: "node-tx", target: "node-rn" },
        { id: "edge-3", source: "node-rn", target: "node-c" },
        { id: "edge-4", source: "node-c", target: "node-if", sourceHandle: "if" as const },
        { id: "edge-5", source: "node-c", target: "node-else", sourceHandle: "else" as const },
      ],
      // The poll node is intentionally disconnected in this fixture — it only
      // exists to exercise flowFromSample's data-field copying.
    },
  };

  test("copies the name, structure, transform fields, trigger values, and replies", () => {
    const created = flowFromSample(sample);
    expect(created.name).toBe("Greeting Check");
    expect(created.nodes.map((n) => n.data)).toEqual([
      { label: "Start" },
      { label: "T", find: "a", replacement: "o" },
      { label: "R", min: "1", max: "20" },
      { label: "C", value: "hi" },
      { label: "If", replies: ["Hello! 👋"] },
      { label: "Else", replies: ["Say hi!"] },
      {
        label: "Pick",
        pollType: "quiz",
        isAnonymous: "false",
        allowsMultipleAnswers: "true",
        correctOptionId: "1",
        explanation: "It is A",
        openPeriod: "60",
      },
    ]);
    expect(created.edges[3].sourceHandle).toBe("if");
    expect(created.edges[4].sourceHandle).toBe("else");
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

    const createdRn = created.nodes.find((n) => n.type === "randomNumber")!;
    createdRn.data.min = "99";
    createdRn.data.max = "100";

    const createdCond = created.nodes.find((n) => n.type === "contains")!;
    createdCond.data.value = "changed";

    const createdIf = created.nodes.find((n) => n.id === created.nodes.find((nn) => nn.type === "send" && (nn.data.replies?.[0] === "Hello! 👋"))!.id)!;
    createdIf.data.replies!.push("mutated");

    // Source transform/randomNumber/trigger/replies unaffected.
    expect(sample.flow.nodes[1].data).toEqual({ label: "T", find: "a", replacement: "o" });
    expect(sample.flow.nodes[2].data).toEqual({ label: "R", min: "1", max: "20" });
    expect(sample.flow.nodes[3].data).toEqual({ label: "C", value: "hi" });
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

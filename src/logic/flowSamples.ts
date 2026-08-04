import {
  Flow,
  FlowEdge,
  FlowNode,
  FlowTriggerType,
  TransformNodeType,
} from "../interfaces/flow.ts";
import { createFlow, createFlowNode, generateId } from "./flow.ts";

export interface FlowSample {
  name: string;
  flow: Flow;
}

// Module-local builders that fill in node data so each sample stays
// self-contained and reads top-to-bottom.

function startNode(position: { x: number; y: number }): FlowNode {
  // createFlowNode sets the Start label already.
  return createFlowNode("start", position);
}

function transformNode(
  type: TransformNodeType,
  label: string,
  position: { x: number; y: number }
): FlowNode {
  const node = createFlowNode(type, position);
  node.data.label = label;
  return node;
}

function conditionNode(
  type: FlowTriggerType,
  value: string,
  label: string,
  position: { x: number; y: number }
): FlowNode {
  const node = createFlowNode(type, position);
  node.data.label = label;
  node.data.value = value;
  return node;
}

function sendNode(
  label: string,
  replies: string[],
  position: { x: number; y: number }
): FlowNode {
  const node = createFlowNode("send", position);
  node.data.label = label;
  node.data.replies = [...replies];
  return node;
}

function randomNumberNode(
  label: string,
  min: string,
  max: string,
  position: { x: number; y: number }
): FlowNode {
  const node = createFlowNode("randomNumber", position);
  node.data.label = label;
  node.data.min = min;
  node.data.max = max;
  return node;
}

function pollNode(label: string, position: { x: number; y: number }): FlowNode {
  const node = createFlowNode("poll", position);
  node.data.label = label;
  return node;
}

// concatFront / concatBack share the flat `text` data field; the helper just
// sets it after createFlowNode fills the default.
function concatNode(
  type: "concatFront" | "concatBack",
  text: string,
  label: string,
  position: { x: number; y: number }
): FlowNode {
  const node = createFlowNode(type, position);
  node.data.label = label;
  node.data.text = text;
  return node;
}

// The template transform stores its f-string style template in the flat
// `template` data field.
function templateNode(
  template: string,
  label: string,
  position: { x: number; y: number }
): FlowNode {
  const node = createFlowNode("template", position);
  node.data.label = label;
  node.data.template = template;
  return node;
}

function edge(source: string, target: string, sourceHandle?: "if" | "else"): FlowEdge {
  return { id: generateId(), source, target, sourceHandle: sourceHandle ?? undefined };
}

// A chain of startsWith conditions: each checks the /dice command plus one
// D&D die type. Its if branch rolls that die with a dedicated randomNumber
// node (min 1, max = the die's sides), then a plain send node formats the
// result. The final else explains the valid dice.
const DICE_TYPES: { die: string; sides: number }[] = [
  { die: "d4", sides: 4 },
  { die: "d6", sides: 6 },
  { die: "d8", sides: 8 },
  { die: "d10", sides: 10 },
  { die: "d12", sides: 12 },
  { die: "d20", sides: 20 },
  { die: "d100", sides: 100 },
];

function diceBotFlow(): Flow {
  const flow = createFlow("Dice Bot");
  const start = startNode({ x: 0, y: 0 });
  const lower = transformNode("lowercase", "Lowercase", { x: 240, y: 0 });
  const gate = conditionNode("startsWith", "/dice", "Dice command", { x: 480, y: 0 });

  flow.nodes = [start, lower, gate];
  flow.edges = [edge(start.id, lower.id), edge(lower.id, gate.id)];

  let previousCondition = gate;
  // Longest die names first: a startsWith check for "/dice d10" would also
  // match "/dice d100", so d100 must be tested before d10.
  const orderedDice = [...DICE_TYPES].sort((a, b) => b.die.length - a.die.length);
  orderedDice.forEach(({ die, sides }, index) => {
    const cond = conditionNode("startsWith", `/dice ${die}`, die, {
      x: 720,
      y: -300 + index * 100,
    });
    const roll = randomNumberNode(
      `Roll ${die}`,
      "1",
      String(sides),
      { x: 960, y: -300 + index * 100 }
    );
    const reply = sendNode(`Send ${die}`, [`🎲 ${die}: {msg}`], {
      x: 1200,
      y: -300 + index * 100,
    });
    flow.nodes.push(cond, roll, reply);
    flow.edges.push(
      edge(cond.id, roll.id, "if"),
      edge(roll.id, reply.id)
    );
    // The gate's if branch feeds the first dice condition; every later
    // condition hangs off the previous condition's else branch.
    if (index === 0) {
      flow.edges.push(edge(gate.id, cond.id, "if"));
    } else {
      flow.edges.push(edge(previousCondition.id, cond.id, "else"));
    }
    previousCondition = cond;
  });

  const usage = sendNode(
    "Usage",
    ["Please use /dice d4, d6, d8, d10, d12, d20 or d100"],
    { x: 1200, y: 420 }
  );
  flow.nodes.push(usage);
  flow.edges.push(edge(previousCondition.id, usage.id, "else"));

  flow.startNodeId = start.id;
  return flow;
}

function pollBotFlow(): Flow {
  const flow = createFlow("Poll Bot");
  const start = startNode({ x: 0, y: 0 });
  const cond = conditionNode("startsWith", "/poll", "Poll command", { x: 240, y: 0 });
  const poll = pollNode("Poll", { x: 480, y: 0 });
  flow.nodes = [start, cond, poll];
  flow.edges = [edge(start.id, cond.id), edge(cond.id, poll.id, "if")];
  flow.startNodeId = start.id;
  return flow;
}

// A command bot that shouts back: "/shout hello" becomes "🎺 HELLO!". Demos
// the concatBack transform (append "!"), uppercase, and a negated condition
// (notEquals "" — the bare "/shout" command routes to the usage hint through
// the else branch, while non-/shout messages decline at the gate). The
// replace transform strips the "/shout " prefix before the message is
// transformed.
function shoutBotFlow(): Flow {
  const flow = createFlow("Shout Bot");
  const start = startNode({ x: 0, y: 0 });
  const lower = transformNode("lowercase", "Lowercase", { x: 240, y: 0 });
  const gate = conditionNode("startsWith", "/shout", "Shout command", { x: 480, y: 0 });
  const strip = transformNode("replace", "Strip prefix", { x: 720, y: -120 });
  strip.data.find = "/shout";
  strip.data.replacement = "";
  const trim = transformNode("trim", "Trim", { x: 960, y: -120 });
  const hasText = conditionNode("notEquals", "", "Has text", { x: 1200, y: -120 });
  const shout = transformNode("uppercase", "Uppercase", { x: 1440, y: -240 });
  const exclaim = concatNode("concatBack", "!", "Exclaim", { x: 1680, y: -240 });
  const reply = sendNode("Shout reply", ["🎺 {msg}"], { x: 1920, y: -240 });
  const usage = sendNode("Usage", ["Usage: /shout <text>"], { x: 1680, y: 0 });

  flow.nodes = [start, lower, gate, strip, trim, hasText, shout, exclaim, reply, usage];
  flow.edges = [
    edge(start.id, lower.id),
    edge(lower.id, gate.id),
    edge(gate.id, strip.id, "if"),
    edge(strip.id, trim.id),
    edge(trim.id, hasText.id),
    edge(hasText.id, shout.id, "if"),
    edge(shout.id, exclaim.id),
    edge(exclaim.id, reply.id),
    edge(hasText.id, usage.id, "else"),
  ];
  flow.startNodeId = start.id;
  return flow;
}

// A command bot that wraps the message in a quote using the template
// transform (Python f-string style): "/quote hello" becomes 💬 "hello".
// The replace transform strips the "/quote" prefix; a bare "/quote" routes
// to the usage hint through the notEquals "" else branch.
function quoteBotFlow(): Flow {
  const flow = createFlow("Quote Bot");
  const start = startNode({ x: 0, y: 0 });
  const lower = transformNode("lowercase", "Lowercase", { x: 240, y: 0 });
  const gate = conditionNode("startsWith", "/quote", "Quote command", { x: 480, y: 0 });
  const strip = transformNode("replace", "Strip prefix", { x: 720, y: 0 });
  strip.data.find = "/quote";
  strip.data.replacement = "";
  const trim = transformNode("trim", "Trim", { x: 960, y: 0 });
  const hasText = conditionNode("notEquals", "", "Has text", { x: 1200, y: 0 });
  const quote = templateNode('💬 "{msg}"', "Template", { x: 1440, y: -120 });
  const reply = sendNode("Quote reply", ["{msg}"], { x: 1680, y: -120 });
  const usage = sendNode("Usage", ["Usage: /quote <text>"], { x: 1440, y: 120 });

  flow.nodes = [start, lower, gate, strip, trim, hasText, quote, reply, usage];
  flow.edges = [
    edge(start.id, lower.id),
    edge(lower.id, gate.id),
    edge(gate.id, strip.id, "if"),
    edge(strip.id, trim.id),
    edge(trim.id, hasText.id),
    edge(hasText.id, quote.id, "if"),
    edge(quote.id, reply.id),
    edge(hasText.id, usage.id, "else"),
  ];
  flow.startNodeId = start.id;
  return flow;
}

// An echo bot that greets every non-command message: "hello" becomes
// "👋 You said: hello". Commands (anything starting with "/") decline
// silently because the negated notStartsWith condition has no else edge.
function greetingBotFlow(): Flow {
  const flow = createFlow("Greeting Bot");
  const start = startNode({ x: 0, y: 0 });
  const lower = transformNode("lowercase", "Lowercase", { x: 240, y: 0 });
  const notCommand = conditionNode("notStartsWith", "/", "Not a command", { x: 480, y: 0 });
  const greet = concatNode("concatFront", "👋 You said: ", "Greet", { x: 720, y: 0 });
  const reply = sendNode("Greeting reply", ["{msg}"], { x: 960, y: 0 });

  flow.nodes = [start, lower, notCommand, greet, reply];
  flow.edges = [
    edge(start.id, lower.id),
    edge(lower.id, notCommand.id),
    edge(notCommand.id, greet.id, "if"),
    edge(greet.id, reply.id),
  ];
  flow.startNodeId = start.id;
  return flow;
}

export const SAMPLE_FLOWS: FlowSample[] = [
  { name: "Dice Bot", flow: diceBotFlow() },
  { name: "Poll Bot", flow: pollBotFlow() },
  { name: "Shout Bot", flow: shoutBotFlow() },
  { name: "Quote Bot", flow: quoteBotFlow() },
  { name: "Greeting Bot", flow: greetingBotFlow() },
];

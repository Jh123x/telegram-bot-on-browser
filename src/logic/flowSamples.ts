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

// The question node asks `prompt` and waits for the user's next message; the
// answers are checked case-insensitively by the runtime's pending state.
function questionNode(
  prompt: string,
  answers: string[],
  label: string,
  position: { x: number; y: number }
): FlowNode {
  const node = createFlowNode("question", position);
  node.data.label = label;
  node.data.prompt = prompt;
  node.data.answers = [...answers];
  return node;
}

// The sendTo node forwards its replies to the FIRST @mention in the flowing
// message ({msg} = message minus the mention, {to} = the target username)
// and confirms to the sender.
function sendToNode(
  replies: string[],
  label: string,
  position: { x: number; y: number }
): FlowNode {
  const node = createFlowNode("sendTo", position);
  node.data.label = label;
  node.data.replies = [...replies];
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

// A single-question quiz: "/quiz" asks a question, the user's next message
// is checked against the accepted answers, and the state resets. Demos the
// question node — the only node that makes the runtime stateful.
function quizBotFlow(): Flow {
  const flow = createFlow("Quiz Bot");
  const start = startNode({ x: 0, y: 0 });
  const lower = transformNode("lowercase", "Lowercase", { x: 240, y: 0 });
  const gate = conditionNode("startsWith", "/quiz", "Quiz command", { x: 480, y: 0 });
  const quiz = questionNode("Q: What is 2 + 2?", ["4", "four", "4.0"], "Quiz", {
    x: 720,
    y: 0,
  });
  quiz.data.correctReply = "✅ Correct! 2 + 2 is 4.";
  quiz.data.wrongReply = "❌ Not quite. The answer is 4.";

  flow.nodes = [start, lower, gate, quiz];
  flow.edges = [
    edge(start.id, lower.id),
    edge(lower.id, gate.id),
    edge(gate.id, quiz.id, "if"),
  ];
  flow.startNodeId = start.id;
  return flow;
}

// A one-shot anonymous message bot: "/anon @bob your message" forwards "your
// message" to @bob with no attribution (the transport resolves the username
// and sends to bob's chat) and confirms to the sender. Demos the sendTo node
// (target = first @mention) plus a contains guard for the usage hint.
function anonymousBotFlow(): Flow {
  const flow = createFlow("Anonymous Bot");
  const start = startNode({ x: 0, y: 0 });
  const lower = transformNode("lowercase", "Lowercase", { x: 240, y: 0 });
  const gate = conditionNode("startsWith", "/anon", "Anon command", { x: 480, y: 0 });
  const strip = transformNode("replace", "Strip prefix", { x: 720, y: -120 });
  strip.data.find = "/anon";
  strip.data.replacement = "";
  const trim = transformNode("trim", "Trim", { x: 960, y: -120 });
  const hasTarget = conditionNode("contains", "@", "Has target", { x: 1200, y: -120 });
  const anon = sendToNode(["{msg}"], "Forward", { x: 1440, y: -240 });
  const usage = sendNode("Usage", ["Usage: /anon @user your message"], { x: 1440, y: 0 });

  flow.nodes = [start, lower, gate, strip, trim, hasTarget, anon, usage];
  flow.edges = [
    edge(start.id, lower.id),
    edge(lower.id, gate.id),
    edge(gate.id, strip.id, "if"),
    edge(strip.id, trim.id),
    edge(trim.id, hasTarget.id),
    edge(hasTarget.id, anon.id, "if"),
    edge(hasTarget.id, usage.id, "else"),
  ];
  flow.startNodeId = start.id;
  return flow;
}

export const SAMPLE_FLOWS: FlowSample[] = [
  { name: "Dice Bot", flow: diceBotFlow() },
  { name: "Poll Bot", flow: pollBotFlow() },
  { name: "Quiz Bot", flow: quizBotFlow() },
  { name: "Anonymous Bot", flow: anonymousBotFlow() },
];

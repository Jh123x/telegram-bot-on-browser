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

function randomNode(
  label: string,
  replies: string[],
  position: { x: number; y: number }
): FlowNode {
  const node = createFlowNode("random", position);
  node.data.label = label;
  node.data.replies = [...replies];
  return node;
}

function pollNode(label: string, position: { x: number; y: number }): FlowNode {
  const node = createFlowNode("poll", position);
  node.data.label = label;
  return node;
}

function edge(source: string, target: string, sourceHandle?: "if" | "else"): FlowEdge {
  return { id: generateId(), source, target, sourceHandle: sourceHandle ?? undefined };
}

// A chain of startsWith conditions: each checks the /dice command plus one
// D&D die type, and its if branch rolls that die with a random node holding
// the die's number list. The final else explains the valid dice.
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
    const roll = randomNode(
      `Roll ${die}`,
      Array.from({ length: sides }, (_, i) => String(i + 1)),
      { x: 960, y: -300 + index * 100 }
    );
    flow.nodes.push(cond, roll);
    flow.edges.push(edge(cond.id, roll.id, "if"));
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
    { x: 960, y: 420 }
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

export const SAMPLE_FLOWS: FlowSample[] = [
  { name: "Dice Bot", flow: diceBotFlow() },
  { name: "Poll Bot", flow: pollBotFlow() },
];

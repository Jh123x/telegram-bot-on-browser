import {
  Flow,
  FlowEdge,
  FlowNode,
  FlowTriggerType,
  TransformData,
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
  transform: TransformData,
  position: { x: number; y: number }
): FlowNode {
  const node = createFlowNode("transform", position);
  node.data.transform = { ...transform };
  return node;
}

function conditionNode(
  trigger: { type: FlowTriggerType; value: string },
  position: { x: number; y: number }
): FlowNode {
  const node = createFlowNode("condition", position);
  node.data.trigger = { type: trigger.type, value: trigger.value };
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

function edge(source: string, target: string, sourceHandle?: "if" | "else"): FlowEdge {
  return { id: generateId(), source, target, sourceHandle: sourceHandle ?? undefined };
}

function welcomeFlow(): Flow {
  const flow = createFlow("Welcome Flow");
  const start = startNode({ x: 0, y: 0 });
  const main = sendNode("Welcome", ["Welcome! I'm a browser bot 🤖", "Try /echo or say hi."], { x: 240, y: 0 });
  flow.nodes = [start, main];
  flow.edges = [edge(start.id, main.id)];
  flow.startNodeId = start.id;
  return flow;
}

function uppercaseEchoFlow(): Flow {
  const flow = createFlow("Uppercase Echo");
  const start = startNode({ x: 0, y: 0 });
  const upper = transformNode({ type: "uppercase", find: "", replacement: "", pattern: "" }, { x: 240, y: 0 });
  const echo = sendNode("Echo", ["You said: {msg}"], { x: 480, y: 0 });
  flow.nodes = [start, upper, echo];
  flow.edges = [edge(start.id, upper.id), edge(upper.id, echo.id)];
  flow.startNodeId = start.id;
  return flow;
}

function greetingCheckFlow(): Flow {
  const flow = createFlow("Greeting Check");
  const start = startNode({ x: 0, y: 0 });
  const cond = conditionNode({ type: "contains", value: "hi" }, { x: 240, y: 0 });
  const ifSend = sendNode("Hello", ["Hello! 👋"], { x: 480, y: -140 });
  const elseSend = sendNode("Else", ["Say hi!"], { x: 480, y: 140 });
  flow.nodes = [start, cond, ifSend, elseSend];
  flow.edges = [
    edge(start.id, cond.id),
    edge(cond.id, ifSend.id, "if"),
    edge(cond.id, elseSend.id, "else"),
  ];
  flow.startNodeId = start.id;
  return flow;
}

export const SAMPLE_FLOWS: FlowSample[] = [
  { name: "Welcome Flow", flow: welcomeFlow() },
  { name: "Uppercase Echo", flow: uppercaseEchoFlow() },
  { name: "Greeting Check", flow: greetingCheckFlow() },
];

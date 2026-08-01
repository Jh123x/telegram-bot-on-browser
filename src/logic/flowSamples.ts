import {
  Flow,
  FlowEdge,
  FlowEdgeData,
  FlowNode,
} from "../interfaces/flow.ts";
import { generateId } from "./flow.ts";
import { createFlow, createFlowNode } from "./flow.ts";

export interface FlowSample {
  name: string;
  flow: Flow;
}

// Module-local builders that fill in node data and edge triggers so each
// sample stays self-contained and reads top-to-bottom.

function startNode(position: { x: number; y: number }): FlowNode {
  // createFlowNode sets the Start label already.
  return createFlowNode("start", position);
}

function stateNode(
  label: string,
  replies: string[],
  position: { x: number; y: number }
): FlowNode {
  const node = createFlowNode("state", position);
  node.data.label = label;
  node.data.replies = [...replies];
  return node;
}

function edge(
  source: string,
  target: string,
  trigger: FlowEdgeData["trigger"]
): FlowEdge {
  return { id: generateId(), source, target, data: { trigger } };
}

function welcomeFlow(): Flow {
  const flow = createFlow("Welcome Flow");
  const start = startNode({ x: 0, y: 0 });
  const main = stateNode(
    "Welcome",
    ["Welcome! I'm a browser bot 🤖", "Try /echo <something> or answer the quiz."],
    { x: 240, y: 0 }
  );
  flow.nodes = [start, main];
  flow.edges = [edge(start.id, main.id, { type: "fallback", value: "" })];
  flow.startNodeId = start.id;
  return flow;
}

function echoFlow(): Flow {
  const flow = createFlow("Echo Flow");
  const start = startNode({ x: 0, y: 0 });
  const menu = stateNode(
    "Menu",
    ["Say /echo <something> to hear it back."],
    { x: 240, y: 0 }
  );
  const echo = stateNode("Echo", ["You said: {msg}"], { x: 480, y: 140 });
  flow.nodes = [start, menu, echo];
  flow.edges = [
    edge(start.id, menu.id, { type: "fallback", value: "" }),
    edge(menu.id, echo.id, { type: "startsWith", value: "/echo " }),
  ];
  flow.startNodeId = start.id;
  return flow;
}

function quizFlow(): Flow {
  const flow = createFlow("Quiz Flow");
  const start = startNode({ x: 0, y: 0 });
  const q1 = stateNode("Question", ["What is 2 + 2?"], { x: 240, y: 0 });
  const correct = stateNode("Correct", ["Correct! 🎉"], { x: 480, y: -140 });
  const wrong = stateNode("Wrong", ["Nope, try again!"], { x: 480, y: 140 });
  flow.nodes = [start, q1, correct, wrong];
  flow.edges = [
    edge(start.id, q1.id, { type: "fallback", value: "" }),
    // equals must be scanned before the fallback so "4" goes to correct.
    edge(q1.id, correct.id, { type: "equals", value: "4" }),
    edge(q1.id, wrong.id, { type: "fallback", value: "" }),
    edge(wrong.id, q1.id, { type: "fallback", value: "" }),
  ];
  flow.startNodeId = start.id;
  return flow;
}

export const SAMPLE_FLOWS: FlowSample[] = [
  { name: "Welcome Flow", flow: welcomeFlow() },
  { name: "Echo Flow", flow: echoFlow() },
  { name: "Quiz Flow", flow: quizFlow() },
];

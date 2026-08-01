import { test, expect, afterEach } from "@jest/globals";
import React from "react";
import { render } from "@testing-library/react";
import { StartNode, StateNode } from "./flowNodes.tsx";

// Node components receive a single `NodeProps` object; we construct a
// minimal one (TypeScript casts keep the test focused on what matters).
const makeNodeProps = (data: { label: string; replies: string[] }) =>
  ({
    id: "n1",
    type: "state",
    data,
    position: { x: 0, y: 0 },
    selected: false,
    dragging: false,
    measured: { width: 120, height: 60 },
  } as any);

afterEach(() => {
  localStorage.clear();
});

test("StartNode renders its label and the start badge with a testid", () => {
  const { getByTestId, getByText } = render(
    <StartNode {...makeNodeProps({ label: "Start", replies: [] })} />
  );

  expect(getByTestId("flow-node-start")).toBeTruthy();
  expect(getByText("Start")).toBeTruthy();
  expect(getByText("start")).toBeTruthy();
});

test("StateNode renders its label, reply count, and a testid", () => {
  const { getByTestId, getByText } = render(
    <StateNode {...makeNodeProps({ label: "Greeting", replies: ["hi", "hello", "hey"] })} />
  );

  expect(getByTestId("flow-node-state")).toBeTruthy();
  expect(getByText("Greeting")).toBeTruthy();
  expect(getByText("3 replies")).toBeTruthy();
});

test("StateNode pluralizes singular reply count", () => {
  const { getByText } = render(
    <StateNode {...makeNodeProps({ label: "Echo", replies: ["{msg}"] })} />
  );

  expect(getByText("1 reply")).toBeTruthy();
});

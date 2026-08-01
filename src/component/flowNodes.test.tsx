import { test, expect, afterEach } from "@jest/globals";
import React from "react";
import { render } from "@testing-library/react";
import {
  StartNode,
  TransformNode,
  ConditionNode,
  SendNode,
} from "./flowNodes.tsx";

// Node components receive a single `NodeProps` object; we construct a minimal
// one (TypeScript casts keep the test focused on what matters).
const makeNodeProps = (data: Record<string, any>, type = "node") =>
  ({
    id: "n1",
    type,
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
    <StartNode {...makeNodeProps({ label: "Start" })} />
  );

  expect(getByTestId("flow-node-start")).toBeTruthy();
  expect(getByText("Start")).toBeTruthy();
  expect(getByText("start")).toBeTruthy();
});

test("TransformNode renders its label, transform summary, and a testid", () => {
  const { getByTestId, getByText } = render(
    <TransformNode
      {...makeNodeProps({ label: "Upper", transform: { type: "uppercase" } })}
    />
  );

  expect(getByTestId("flow-node-transform")).toBeTruthy();
  expect(getByText("Upper")).toBeTruthy();
  expect(getByText("uppercase")).toBeTruthy();
});

test("TransformNode renders the replace summary with find and replacement", () => {
  const { getByText, queryByText } = render(
    <TransformNode
      {...makeNodeProps({
        label: "Swap",
        transform: { type: "replace", find: "a", replacement: "b" },
      })}
    />
  );

  expect(getByText('replace "a" → "b"')).toBeTruthy();
  expect(queryByText("lowercase")).toBeNull();
});

test("TransformNode falls back to a bare replace label when find is empty", () => {
  const { getByText } = render(
    <TransformNode
      {...makeNodeProps({
        label: "Swap",
        transform: { type: "replace", find: "", replacement: "b" },
      })}
    />
  );

  expect(getByText("replace")).toBeTruthy();
});

test("TransformNode renders the extract regex summary", () => {
  const { getByText } = render(
    <TransformNode
      {...makeNodeProps({
        label: "Grab",
        transform: { type: "extractRegex", pattern: "\\d+" },
      })}
    />
  );

  expect(getByText("extract regex")).toBeTruthy();
});

test("TransformNode shows no summary label when it has no transform", () => {
  const { queryByText } = render(
    <TransformNode {...makeNodeProps({ label: "Noop" })} />
  );

  expect(queryByText(/^lowercase$/)).toBeNull();
  expect(queryByText(/^uppercase$/)).toBeNull();
});

test("ConditionNode renders its label and a trigger caption", () => {
  const { getByTestId, getByText } = render(
    <ConditionNode
      {...makeNodeProps({
        label: "Has hi",
        trigger: { type: "contains", value: "hi" },
      })}
    />
  );

  expect(getByTestId("flow-node-condition")).toBeTruthy();
  expect(getByText("Has hi")).toBeTruthy();
  expect(getByText('message contains "hi"')).toBeTruthy();
});

test("ConditionNode shows a neutral caption when it has no trigger", () => {
  const { getByText } = render(
    <ConditionNode {...makeNodeProps({ label: "Cond" })} />
  );

  expect(getByText("condition")).toBeTruthy();
});

test("SendNode renders its label, reply count, and a testid", () => {
  const { getByTestId, getByText } = render(
    <SendNode
      {...makeNodeProps({ label: "Welcome", replies: ["hi", "hello", "hey"] })}
    />
  );

  expect(getByTestId("flow-node-send")).toBeTruthy();
  expect(getByText("Welcome")).toBeTruthy();
  expect(getByText("3 replies")).toBeTruthy();
});

test("SendNode pluralizes singular reply count", () => {
  const { getByText } = render(
    <SendNode {...makeNodeProps({ label: "Echo", replies: ["{msg}"] })} />
  );

  expect(getByText("1 reply")).toBeTruthy();
});

test("SendNode has a single (target) handle and no source handle", () => {
  const { container } = render(
    <SendNode {...makeNodeProps({ label: "Echo", replies: ["hi"] })} />
  );

  const handles = container.querySelectorAll('[data-testid="reactflow-handle"]');
  expect(handles).toHaveLength(1);
});

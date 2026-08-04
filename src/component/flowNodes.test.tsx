import { test, expect, afterEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import {
  StartNode,
  TransformNode,
  ConditionNode,
  SendNode,
  PollNode,
} from "./flowNodes.tsx";

// Node components receive a single `NodeProps` object; we construct a minimal
// one (TypeScript casts keep the test focused on what matters).
const makeNodeProps = (data: Record<string, any>, type = "node", selected = false) =>
  ({
    id: "n1",
    type,
    data,
    position: { x: 0, y: 0 },
    selected,
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
  const { getByTestId, getByText, getAllByText } = render(
    <TransformNode {...makeNodeProps({ label: "Upper" }, "uppercase")} />
  );

  expect(getByTestId("flow-node-transform")).toBeTruthy();
  expect(getByText("Upper")).toBeTruthy();
  // The badge and the summary caption both read "uppercase".
  expect(getAllByText("uppercase").length).toBeGreaterThan(0);
});

test("TransformNode renders the replace summary with find and replacement", () => {
  const { getByText, queryByText } = render(
    <TransformNode
      {...makeNodeProps({ label: "Swap", find: "a", replacement: "b" }, "replace")}
    />
  );

  expect(getByText('replace "a" → "b"')).toBeTruthy();
  expect(queryByText("lowercase")).toBeNull();
});

test("TransformNode renders the trim summary", () => {
  const { getByText, getAllByText } = render(
    <TransformNode {...makeNodeProps({ label: "Pad" }, "trim")} />
  );

  expect(getByText("Pad")).toBeTruthy();
  // Badge + summary caption both read "trim".
  expect(getAllByText("trim").length).toBeGreaterThan(0);
});

test("TransformNode falls back to a generic summary for an unknown type", () => {
  const { getByText } = render(
    <TransformNode {...makeNodeProps({ label: "Mystery" }, "unknown" as any)} />
  );

  expect(getByText("Mystery")).toBeTruthy();
  expect(getByText("transform")).toBeTruthy();
});

test("TransformNode falls back to a bare replace label when find is empty", () => {
  const { getAllByText } = render(
    <TransformNode
      {...makeNodeProps({ label: "Swap", find: "", replacement: "b" }, "replace")}
    />
  );

  // Badge + caption both read "replace" when find is empty.
  expect(getAllByText("replace").length).toBeGreaterThan(0);
});

test("TransformNode renders the extract regex summary", () => {
  const { getByText } = render(
    <TransformNode
      {...makeNodeProps({ label: "Grab", pattern: "\\d+" }, "extractRegex")}
    />
  );

  expect(getByText("extract regex")).toBeTruthy();
});

test("TransformNode renders the random number summary with its range", () => {
  const { getByText } = render(
    <TransformNode
      {...makeNodeProps({ label: "Roll", min: "1", max: "20" }, "randomNumber")}
    />
  );

  expect(getByText("random 1–20")).toBeTruthy();
});

test("TransformNode renders the concat front summary with its text", () => {
  const { getByText } = render(
    <TransformNode
      {...makeNodeProps({ label: "Prefix", text: "!" }, "concatFront")}
    />
  );

  expect(getByText('add "!" before')).toBeTruthy();
});

test("TransformNode falls back to a bare concat front label when text is empty", () => {
  const { getAllByText } = render(
    <TransformNode
      {...makeNodeProps({ label: "Prefix", text: "" }, "concatFront")}
    />
  );

  // Badge + caption both read "concat front" when text is empty.
  expect(getAllByText("concat front").length).toBeGreaterThan(0);
});

test("TransformNode renders the concat back summary with its text", () => {
  const { getByText } = render(
    <TransformNode
      {...makeNodeProps({ label: "Suffix", text: "!!" }, "concatBack")}
    />
  );

  expect(getByText('add "!!" after')).toBeTruthy();
});

test("TransformNode falls back to a bare concat back label when text is empty", () => {
  const { getAllByText } = render(
    <TransformNode
      {...makeNodeProps({ label: "Suffix", text: "" }, "concatBack")}
    />
  );

  expect(getAllByText("concat back").length).toBeGreaterThan(0);
});

test("TransformNode renders the template summary with its template text", () => {
  const { getByText } = render(
    <TransformNode
      {...makeNodeProps({ label: "Fmt", template: "Hi {msg}" }, "template")}
    />
  );

  expect(getByText('template "Hi {msg}"')).toBeTruthy();
});

test("TransformNode falls back to a bare template label when template is empty", () => {
  const { getAllByText } = render(
    <TransformNode
      {...makeNodeProps({ label: "Fmt", template: "" }, "template")}
    />
  );

  expect(getAllByText("template").length).toBeGreaterThan(0);
});

test("TransformNode shows a lowercase badge for the lowercase type", () => {
  const { getAllByText } = render(
    <TransformNode {...makeNodeProps({ label: "Noop" }, "lowercase")} />
  );

  expect(getAllByText("lowercase").length).toBeGreaterThan(0);
});

test("ConditionNode renders its label and a trigger caption", () => {
  const { getByTestId, getByText } = render(
    <ConditionNode {...makeNodeProps({ label: "Has hi", value: "hi" }, "contains")} />
  );

  expect(getByTestId("flow-node-condition")).toBeTruthy();
  expect(getByText("Has hi")).toBeTruthy();
  expect(getByText('message contains "hi"')).toBeTruthy();
});

test("ConditionNode shows the type badge for the concrete trigger", () => {
  const { getByText } = render(
    <ConditionNode {...makeNodeProps({ label: "Is hi", value: "hi" }, "equals")} />
  );

  expect(getByText("equals")).toBeTruthy();
  expect(getByText('message equals "hi"')).toBeTruthy();
});

test("ConditionNode shows a neutral caption when it has no value", () => {
  const { getByText } = render(
    <ConditionNode {...makeNodeProps({ label: "Cond" }, "contains")} />
  );

  // Badge says "contains" and caption says `message contains ""`, so the
  // trigger label appears twice.
  expect(getByText("message contains \"\"")).toBeTruthy();
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

test("PollNode renders its label, poll badge, and a testid", () => {
  const { getByTestId, getByText } = render(
    <PollNode {...makeNodeProps({ label: "Pick" })} />
  );

  expect(getByTestId("flow-node-poll")).toBeTruthy();
  expect(getByText("Pick")).toBeTruthy();
  expect(getByText("poll")).toBeTruthy();
});

test("PollNode shows a caption describing the poll", () => {
  const { getByText } = render(
    <PollNode {...makeNodeProps({ label: "Pick" })} />
  );

  expect(getByText(/sends a poll, anonymous/i)).toBeTruthy();
});

test("PollNode caption reflects quiz and public configuration", () => {
  const { getByText } = render(
    <PollNode
      {...makeNodeProps({ label: "Pick", pollType: "quiz", isAnonymous: "false" })}
    />
  );

  expect(getByText(/sends a quiz, public/i)).toBeTruthy();
});

test("PollNode has a single (target) handle and no source handle", () => {
  const { container } = render(
    <PollNode {...makeNodeProps({ label: "Pick" })} />
  );

  const handles = container.querySelectorAll('[data-testid="reactflow-handle"]');
  expect(handles).toHaveLength(1);
});

test("SendNode has a single (target) handle and no source handle", () => {
  const { container } = render(
    <SendNode {...makeNodeProps({ label: "Echo", replies: ["hi"] })} />
  );

  const handles = container.querySelectorAll('[data-testid="reactflow-handle"]');
  expect(handles).toHaveLength(1);
});

test("StartNode card border uses the start accent color", () => {
  const { getByTestId } = render(<StartNode {...makeNodeProps({ label: "Start" })} />);
  expect(getComputedStyle(getByTestId("flow-node-start")).borderColor).toBe(
    "rgb(124, 58, 237)"
  );
});

test("TransformNode card border uses the transform accent color", () => {
  const { getByTestId } = render(<TransformNode {...makeNodeProps({ label: "Upper" }, "uppercase")} />);
  expect(getComputedStyle(getByTestId("flow-node-transform")).borderColor).toBe(
    "rgb(56, 189, 248)"
  );
});

test("ConditionNode card border uses the condition accent color", () => {
  const { getByTestId } = render(<ConditionNode {...makeNodeProps({ label: "Cond" }, "contains")} />);
  expect(getComputedStyle(getByTestId("flow-node-condition")).borderColor).toBe(
    "rgb(251, 191, 36)"
  );
});

test("SendNode card border uses the send accent color", () => {
  const { getByTestId } = render(<SendNode {...makeNodeProps({ label: "Echo" })} />);
  expect(getComputedStyle(getByTestId("flow-node-send")).borderColor).toBe(
    "rgb(52, 211, 153)"
  );
});

test("PollNode card border uses the send accent color", () => {
  const { getByTestId } = render(<PollNode {...makeNodeProps({ label: "Pick" })} />);
  expect(getComputedStyle(getByTestId("flow-node-poll")).borderColor).toBe(
    "rgb(52, 211, 153)"
  );
});

test("a selected node shows a selection ring in its accent color", () => {
  const { getByTestId } = render(
    <TransformNode {...makeNodeProps({ label: "Upper" }, "uppercase", true)} />
  );
  expect(getComputedStyle(getByTestId("flow-node-transform")).boxShadow).toContain(
    "#38bdf8"
  );
});

test("TransformNode renders its type badge", () => {
  const { getAllByText } = render(<TransformNode {...makeNodeProps({ label: "Upper" }, "uppercase")} />);
  expect(getAllByText("uppercase").length).toBeGreaterThan(0);
});

test("ConditionNode renders its type badge", () => {
  const { getByText } = render(
    <ConditionNode {...makeNodeProps({ label: "Cond", value: "hi" }, "contains")} />
  );
  expect(getByText("contains")).toBeTruthy();
});

test("SendNode renders its type badge", () => {
  const { getByText } = render(<SendNode {...makeNodeProps({ label: "Echo" })} />);
  expect(getByText("send")).toBeTruthy();
});

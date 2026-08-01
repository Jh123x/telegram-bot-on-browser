import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProgramPalette } from "./ProgramPalette";
import { BLOCK_COLORS } from "../theme.ts";

const createDataTransfer = (payload: string) =>
  ({
    setData: jest.fn(),
    getData: jest.fn(() => payload),
    dropEffect: "move",
    effectAllowed: "move",
  } as unknown as DataTransfer);

test("renders the palette header, caption, and 15 blocks", () => {
  render(<ProgramPalette />);

  expect(screen.getByText("Blocks")).toBeInTheDocument();
  expect(
    screen.getByText("Drag a block onto a program below.")
  ).toBeInTheDocument();
  expect(screen.getByText("Triggers")).toBeInTheDocument();
  expect(screen.getByText("Logic")).toBeInTheDocument();
  expect(screen.getByText("Transform")).toBeInTheDocument();
  expect(screen.getByText("Action")).toBeInTheDocument();

  const expectedLabels = [
    "When message equals",
    "When message contains",
    "When message starts with",
    "When message ends with",
    "message length is greater than",
    "message length is less than",
    "message matches regex",
    "make uppercase",
    "make lowercase",
    "trim whitespace",
    "replace text",
    "concat text",
    "reply with text",
    "reply random choice",
    "echo the current message",
  ];
  for (const label of expectedLabels) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }

  expect(screen.getAllByText(/When message/)).toHaveLength(4);
  expect(screen.getAllByTestId(/^palette-trigger-/)).toHaveLength(4);
  expect(screen.getAllByTestId(/^palette-logic-/)).toHaveLength(3);
  expect(screen.getAllByTestId(/^palette-transform-/)).toHaveLength(5);
  expect(screen.getAllByTestId(/^palette-action-/)).toHaveLength(3);
  expect(
    document.querySelectorAll(
      '[data-testid^="palette-trigger-"], [data-testid^="palette-logic-"], [data-testid^="palette-transform-"], [data-testid^="palette-action-"]'
    )
  ).toHaveLength(15);
});

test("trigger blocks drag with the correct kind and type", () => {
  render(<ProgramPalette />);

  const blocks = [
    { testid: "palette-trigger-equals", kind: "trigger", type: "equals" },
    { testid: "palette-trigger-contains", kind: "trigger", type: "contains" },
    { testid: "palette-trigger-startsWith", kind: "trigger", type: "startsWith" },
    { testid: "palette-trigger-endsWith", kind: "trigger", type: "endsWith" },
  ];

  for (const { testid, kind, type } of blocks) {
    const block = screen.getByTestId(testid);
    const dataTransfer = createDataTransfer("");
    fireEvent.dragStart(block, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      "text/plain",
      JSON.stringify({ kind, type })
    );
  }
});

test("logic blocks drag with the correct category and type", () => {
  render(<ProgramPalette />);

  const blocks = [
    {
      testid: "palette-logic-lengthGreater",
      kind: "block",
      category: "logic",
      type: "lengthGreater",
    },
    {
      testid: "palette-logic-lengthLess",
      kind: "block",
      category: "logic",
      type: "lengthLess",
    },
    {
      testid: "palette-logic-matchesRegex",
      kind: "block",
      category: "logic",
      type: "matchesRegex",
    },
  ];

  for (const { testid, kind, category, type } of blocks) {
    const block = screen.getByTestId(testid);
    const dataTransfer = createDataTransfer("");
    fireEvent.dragStart(block, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      "text/plain",
      JSON.stringify({ kind, category, type })
    );
  }
});

test("transform blocks drag with the correct category and type", () => {
  render(<ProgramPalette />);

  const blocks = [
    {
      testid: "palette-transform-uppercase",
      kind: "block",
      category: "transform",
      type: "uppercase",
    },
    {
      testid: "palette-transform-lowercase",
      kind: "block",
      category: "transform",
      type: "lowercase",
    },
    {
      testid: "palette-transform-trim",
      kind: "block",
      category: "transform",
      type: "trim",
    },
    {
      testid: "palette-transform-replace",
      kind: "block",
      category: "transform",
      type: "replace",
    },
  ];

  for (const { testid, kind, category, type } of blocks) {
    const block = screen.getByTestId(testid);
    const dataTransfer = createDataTransfer("");
    fireEvent.dragStart(block, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      "text/plain",
      JSON.stringify({ kind, category, type })
    );
  }
});

test("action blocks drag with the correct category and type", () => {
  render(<ProgramPalette />);

  const blocks = [
    {
      testid: "palette-action-reply",
      kind: "block",
      category: "action",
      type: "reply",
    },
    {
      testid: "palette-action-random",
      kind: "block",
      category: "action",
      type: "random",
    },
    {
      testid: "palette-action-echo",
      kind: "block",
      category: "action",
      type: "echo",
    },
  ];

  for (const { testid, kind, category, type } of blocks) {
    const block = screen.getByTestId(testid);
    const dataTransfer = createDataTransfer("");
    fireEvent.dragStart(block, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      "text/plain",
      JSON.stringify({ kind, category, type })
    );
  }
});

test("blocks carry a color dot in their category color", () => {
  render(<ProgramPalette />);

  // style.backgroundColor is normalized by the browser to rgb(r, g, b)
  const hexToRgb = (hex: string) => {
    const value = hex.replace("#", "");
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const triggerDot = screen
    .getByTestId("palette-trigger-equals")
    .querySelector("span");
  expect(triggerDot).not.toBeNull();
  expect(triggerDot!.style.backgroundColor).toBe(
    hexToRgb(BLOCK_COLORS.trigger.main)
  );

  const actionDot = screen
    .getByTestId("palette-action-reply")
    .querySelector("span");
  expect(actionDot).not.toBeNull();
  expect(actionDot!.style.backgroundColor).toBe(
    hexToRgb(BLOCK_COLORS.action.main)
  );
});

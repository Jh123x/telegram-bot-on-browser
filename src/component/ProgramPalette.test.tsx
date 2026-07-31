import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProgramPalette } from "./ProgramPalette";

const createDataTransfer = (payload: string) =>
  ({
    setData: jest.fn(),
    getData: jest.fn(() => payload),
    dropEffect: "move",
    effectAllowed: "move",
  } as unknown as DataTransfer);

test("renders the palette header, caption, and 6 blocks", () => {
  render(<ProgramPalette />);

  expect(screen.getByText("Blocks")).toBeInTheDocument();
  expect(
    screen.getByText("Drag a block onto a program below.")
  ).toBeInTheDocument();
  expect(screen.getByText("Triggers")).toBeInTheDocument();
  expect(screen.getByText("Actions")).toBeInTheDocument();

  const expectedLabels = [
    "When message equals",
    "When message contains",
    "When message starts with",
    "reply with text",
    "reply random choice",
    "echo the message",
  ];
  for (const label of expectedLabels) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }

  expect(screen.getAllByText(/When message/)).toHaveLength(3);
  expect(screen.getAllByText(/reply/)).toHaveLength(2);
});

test("trigger blocks drag with the correct kind and type", () => {
  render(<ProgramPalette />);

  const blocks = [
    { testid: "palette-trigger-equals", kind: "trigger", type: "equals" },
    { testid: "palette-trigger-contains", kind: "trigger", type: "contains" },
    { testid: "palette-trigger-startsWith", kind: "trigger", type: "startsWith" },
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

test("action blocks drag with the correct kind and type", () => {
  render(<ProgramPalette />);

  const blocks = [
    { testid: "palette-action-reply", kind: "action", type: "reply" },
    { testid: "palette-action-random", kind: "action", type: "random" },
    { testid: "palette-action-echo", kind: "action", type: "echo" },
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

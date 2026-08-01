import { test, expect, afterEach } from "@jest/globals";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FlowPalette } from "./FlowPalette.tsx";

// jest-dom's DOM nodes need no real DataTransfer; a lightweight stub is enough
// to verify the palette puts the node type on the "application/reactflow" key.
const createDataTransfer = () => ({
  setData: jest.fn(),
  getData: jest.fn(),
  dropEffect: "move",
  effectAllowed: "move",
} as unknown as DataTransfer);

const TYPES = ["start", "transform", "condition", "send"] as const;
const LABELS = ["Start", "Transform", "Condition", "Send"] as const;

afterEach(() => {
  localStorage.clear();
});

test("renders draggable palette items for all four node types", () => {
  render(<FlowPalette />);

  expect(screen.getByTestId("flow-palette")).toBeTruthy();
  TYPES.forEach((type) => {
    const item = screen.getByTestId(`palette-item-${type}`);
    expect(item).toHaveAttribute("draggable", "true");
  });
  LABELS.forEach((label) => {
    expect(screen.getByText(label)).toBeTruthy();
  });
  // No legacy state item remains.
  expect(screen.queryByTestId("palette-item-state")).toBeNull();
});

test("dragstart on each palette item sets the reactflow payload to its type", () => {
  render(<FlowPalette />);

  TYPES.forEach((type) => {
    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByTestId(`palette-item-${type}`), {
      dataTransfer,
    });
    expect(dataTransfer.setData).toHaveBeenCalledWith(
      "application/reactflow",
      type
    );
    expect(dataTransfer.effectAllowed).toBe("move");
  });
});

test("clicking a palette item invokes onPick with its node type", () => {
  const onPick = jest.fn();
  render(<FlowPalette onPick={onPick} />);

  TYPES.forEach((type) => {
    fireEvent.click(screen.getByTestId(`palette-item-${type}`));
  });

  expect(onPick).toHaveBeenCalledTimes(TYPES.length);
  TYPES.forEach((type) => {
    expect(onPick).toHaveBeenCalledWith(type);
  });
});

test("pressing Enter on each palette item invokes onPick with its node type", () => {
  const onPick = jest.fn();
  render(<FlowPalette onPick={onPick} />);

  TYPES.forEach((type) => {
    fireEvent.keyDown(screen.getByTestId(`palette-item-${type}`), {
      key: "Enter",
    });
  });

  expect(onPick).toHaveBeenCalledTimes(TYPES.length);
  TYPES.forEach((type) => {
    expect(onPick).toHaveBeenCalledWith(type);
  });
});

test("pressing Space on a palette item invokes onPick (and prevents scroll)", () => {
  const onPick = jest.fn();
  render(<FlowPalette onPick={onPick} />);

  fireEvent.keyDown(screen.getByTestId("palette-item-send"), { key: " " });

  expect(onPick).toHaveBeenCalledTimes(1);
  expect(onPick).toHaveBeenCalledWith("send");
});

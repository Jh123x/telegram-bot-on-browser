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

afterEach(() => {
  localStorage.clear();
});

test("renders draggable Start and State palette items", () => {
  render(<FlowPalette />);

  expect(screen.getByTestId("flow-palette")).toBeTruthy();
  const start = screen.getByTestId("palette-item-start");
  const state = screen.getByTestId("palette-item-state");

  expect(start).toHaveTextContent("Start");
  expect(state).toHaveTextContent("State");
  expect(start).toHaveAttribute("draggable", "true");
  expect(state).toHaveAttribute("draggable", "true");
});

test("dragstart on Start sets the reactflow payload to start", () => {
  render(<FlowPalette />);
  const dataTransfer = createDataTransfer();

  fireEvent.dragStart(screen.getByTestId("palette-item-start"), {
    dataTransfer,
  });

  expect(dataTransfer.setData).toHaveBeenCalledWith("application/reactflow", "start");
  expect(dataTransfer.effectAllowed).toBe("move");
});

test("dragstart on State sets the reactflow payload to state", () => {
  render(<FlowPalette />);
  const dataTransfer = createDataTransfer();

  fireEvent.dragStart(screen.getByTestId("palette-item-state"), {
    dataTransfer,
  });

  expect(dataTransfer.setData).toHaveBeenCalledWith("application/reactflow", "state");
  expect(dataTransfer.effectAllowed).toBe("move");
});

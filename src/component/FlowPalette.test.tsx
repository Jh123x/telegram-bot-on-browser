import { test, expect, afterEach, vi } from "vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FlowPalette } from "./FlowPalette.tsx";

// jest-dom's DOM nodes need no real DataTransfer; a lightweight stub is enough
// to verify the palette puts the node type on the "application/reactflow" key.
const createDataTransfer = () => ({
  setData: vi.fn(),
  getData: vi.fn(),
  dropEffect: "move",
  effectAllowed: "move",
} as unknown as DataTransfer);

// The 2-level palette: top level = categories, second level = the concrete
// node types inside the selected category. The start category is shown by
// default.
const CATEGORIES = ["start", "transform", "condition", "send"];
const CATEGORY_LABELS = ["Start", "Transform", "Condition", "Send"];

afterEach(() => {
  localStorage.clear();
});

test("renders the palette with all four category selectors", () => {
  render(<FlowPalette />);

  expect(screen.getByTestId("flow-palette")).toBeTruthy();
  CATEGORIES.forEach((cat) => {
    expect(screen.getByTestId(`palette-category-${cat}`)).toBeTruthy();
  });
  // Category labels appear on the selector buttons (the item list also shows
  // the selected category's item label, so use getAllByText for the default
  // "Start" category).
  CATEGORY_LABELS.forEach((label) => {
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  });
});

test("shows the start category items by default", () => {
  render(<FlowPalette />);

  expect(screen.getByTestId("palette-item-start")).toBeTruthy();
  // Other categories' items are hidden until their category is selected.
  expect(screen.queryByTestId("palette-item-lowercase")).toBeNull();
  expect(screen.queryByTestId("palette-item-equals")).toBeNull();
  expect(screen.queryByTestId("palette-item-random")).toBeNull();
});

test("selecting the transform category reveals the five transform nodes", () => {
  render(<FlowPalette />);

  fireEvent.click(screen.getByTestId("palette-category-transform"));

  ["lowercase", "uppercase", "trim", "replace", "extractRegex"].forEach((type) => {
    const item = screen.getByTestId(`palette-item-${type}`);
    expect(item).toHaveAttribute("draggable", "true");
  });
  expect(screen.queryByTestId("palette-item-start")).toBeNull();
});

test("selecting the condition category reveals the six trigger nodes", () => {
  render(<FlowPalette />);

  fireEvent.click(screen.getByTestId("palette-category-condition"));

  ["equals", "contains", "startsWith", "endsWith", "notEquals", "notContains"].forEach(
    (type) => {
      expect(screen.getByTestId(`palette-item-${type}`)).toBeTruthy();
    }
  );
});

test("selecting the send category reveals send and random nodes", () => {
  render(<FlowPalette />);

  fireEvent.click(screen.getByTestId("palette-category-send"));

  expect(screen.getByTestId("palette-item-send")).toBeTruthy();
  expect(screen.getByTestId("palette-item-random")).toBeTruthy();
});

test("dragstart on each visible palette item sets the reactflow payload to its type", () => {
  render(<FlowPalette />);

  const startDataTransfer = createDataTransfer();
  fireEvent.dragStart(screen.getByTestId("palette-item-start"), {
    dataTransfer: startDataTransfer,
  });
  expect(startDataTransfer.setData).toHaveBeenCalledWith(
    "application/reactflow",
    "start"
  );
  expect(startDataTransfer.effectAllowed).toBe("move");

  // Switch to the transform category and check one transform item.
  fireEvent.click(screen.getByTestId("palette-category-transform"));
  const upperDataTransfer = createDataTransfer();
  fireEvent.dragStart(screen.getByTestId("palette-item-uppercase"), {
    dataTransfer: upperDataTransfer,
  });
  expect(upperDataTransfer.setData).toHaveBeenCalledWith(
    "application/reactflow",
    "uppercase"
  );
});

test("clicking a palette item invokes onPick with its node type", () => {
  const onPick = vi.fn();
  render(<FlowPalette onPick={onPick} />);

  fireEvent.click(screen.getByTestId("palette-item-start"));
  expect(onPick).toHaveBeenCalledWith("start");

  fireEvent.click(screen.getByTestId("palette-category-send"));
  fireEvent.click(screen.getByTestId("palette-item-random"));
  expect(onPick).toHaveBeenCalledWith("random");
  expect(onPick).toHaveBeenCalledTimes(2);
});

test("pressing Enter on a palette item invokes onPick with its node type", () => {
  const onPick = vi.fn();
  render(<FlowPalette onPick={onPick} />);

  fireEvent.keyDown(screen.getByTestId("palette-item-start"), {
    key: "Enter",
  });
  expect(onPick).toHaveBeenCalledWith("start");

  fireEvent.click(screen.getByTestId("palette-category-transform"));
  fireEvent.keyDown(screen.getByTestId("palette-item-replace"), {
    key: "Enter",
  });
  expect(onPick).toHaveBeenCalledWith("replace");
});

test("pressing Space on a palette item invokes onPick (and prevents scroll)", () => {
  const onPick = vi.fn();
  render(<FlowPalette onPick={onPick} />);

  fireEvent.click(screen.getByTestId("palette-category-send"));
  fireEvent.keyDown(screen.getByTestId("palette-item-send"), { key: " " });

  expect(onPick).toHaveBeenCalledTimes(1);
  expect(onPick).toHaveBeenCalledWith("send");
});

test("palette items preview their node accent color as a dot", () => {
  render(<FlowPalette />);

  // Start category default: start dot is violet.
  const startDot = screen.getByTestId("palette-dot-start");
  expect(getComputedStyle(startDot).backgroundColor).toBe("rgb(124, 58, 237)");

  fireEvent.click(screen.getByTestId("palette-category-transform"));
  const upperDot = screen.getByTestId("palette-dot-uppercase");
  expect(getComputedStyle(upperDot).backgroundColor).toBe("rgb(56, 189, 248)");

  fireEvent.click(screen.getByTestId("palette-category-send"));
  const randomDot = screen.getByTestId("palette-dot-random");
  expect(getComputedStyle(randomDot).backgroundColor).toBe("rgb(52, 211, 153)");
});

test("category selectors are keyboard-accessible with aria-pressed", () => {
  render(<FlowPalette />);

  const transformCat = screen.getByTestId("palette-category-transform");
  expect(transformCat).toHaveAttribute("aria-pressed", "false");

  fireEvent.keyDown(transformCat, { key: "Enter" });
  expect(screen.getByTestId("palette-category-transform")).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  expect(screen.getByTestId("palette-item-lowercase")).toBeTruthy();
});

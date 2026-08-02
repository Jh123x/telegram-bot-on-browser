import { test, expect, afterEach, vi } from "vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { FlowPalette } from "./FlowPalette.tsx";
import { theme } from "../theme.ts";

// jest-dom's DOM nodes need no real DataTransfer; a lightweight stub is enough
// to verify the palette puts the node type on the "application/reactflow" key.
const createDataTransfer = () => ({
  setData: vi.fn(),
  getData: vi.fn(),
  dropEffect: "move",
  effectAllowed: "move",
} as unknown as DataTransfer);

const ALL_SIXTEEN = [
  "start",
  "lowercase",
  "uppercase",
  "trim",
  "replace",
  "extractRegex",
  "randomNumber",
  "equals",
  "contains",
  "startsWith",
  "endsWith",
  "notEquals",
  "notContains",
  "send",
  "random",
  "poll",
];

const GROUP_COUNTS: Record<string, string[]> = {
  start: ["start"],
  transform: ["lowercase", "uppercase", "trim", "replace", "extractRegex", "randomNumber"],
  condition: ["equals", "contains", "startsWith", "endsWith", "notEquals", "notContains"],
  send: ["send", "random", "poll"],
};

afterEach(() => {
  localStorage.clear();
});

test("renders the palette with all four groups and all sixteen items at once", () => {
  render(<FlowPalette />);

  expect(screen.getByTestId("flow-palette")).toBeTruthy();
  (["start", "transform", "condition", "send"] as const).forEach((cat) => {
    expect(screen.getByTestId(`palette-group-${cat}`)).toBeTruthy();
  });
  ALL_SIXTEEN.forEach((type) => {
    expect(screen.getByTestId(`palette-item-${type}`)).toBeTruthy();
  });
});

test("renders node descriptions for the palette items", () => {
  render(<FlowPalette />);

  expect(screen.getByTestId("palette-desc-extractRegex").textContent).toBe(
    "Keep text matching a pattern."
  );
  expect(screen.getByTestId("palette-desc-notContains").textContent).toBe(
    "Message does not contain the value."
  );
  expect(screen.getByTestId("palette-desc-poll").textContent).toBe(
    "Send a Telegram poll."
  );
});

test("dragstart on a palette item sets the reactflow payload to its type", () => {
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

  fireEvent.click(screen.getByTestId("palette-item-random"));
  expect(onPick).toHaveBeenCalledWith("random");

  fireEvent.click(screen.getByTestId("palette-item-poll"));
  expect(onPick).toHaveBeenCalledWith("poll");

  expect(onPick).toHaveBeenCalledTimes(3);
});

test("pressing Enter on a palette item invokes onPick with its node type", () => {
  const onPick = vi.fn();
  render(<FlowPalette onPick={onPick} />);

  fireEvent.keyDown(screen.getByTestId("palette-item-start"), { key: "Enter" });
  expect(onPick).toHaveBeenCalledWith("start");

  fireEvent.keyDown(screen.getByTestId("palette-item-replace"), { key: "Enter" });
  expect(onPick).toHaveBeenCalledWith("replace");
});

test("pressing Space on a palette item invokes onPick (and prevents scroll)", () => {
  const onPick = vi.fn();
  render(<FlowPalette onPick={onPick} />);

  fireEvent.keyDown(screen.getByTestId("palette-item-send"), { key: " " });
  expect(onPick).toHaveBeenCalledTimes(1);
  expect(onPick).toHaveBeenCalledWith("send");
});

test("palette items preview their node accent color as an icon chip", () => {
  render(<FlowPalette />);

  // Start icon is violet and renders as an inline SVG.
  const startIcon = screen.getByTestId("palette-icon-start");
  expect(getComputedStyle(startIcon).color).toBe("rgb(124, 58, 237)");
  expect(startIcon.querySelector("svg")).toBeTruthy();

  // Transform icon is sky blue.
  const upperIcon = screen.getByTestId("palette-icon-uppercase");
  expect(getComputedStyle(upperIcon).color).toBe("rgb(56, 189, 248)");

  // Send items share the green accent.
  const randomIcon = screen.getByTestId("palette-icon-random");
  expect(getComputedStyle(randomIcon).color).toBe("rgb(52, 211, 153)");
  const pollIcon = screen.getByTestId("palette-icon-poll");
  expect(getComputedStyle(pollIcon).color).toBe("rgb(52, 211, 153)");
  expect(pollIcon.querySelector("svg")).toBeTruthy();
});

test("filtering narrows the item list and hides empty group headers", () => {
  render(<FlowPalette />);
  const input = screen.getByTestId("palette-filter").querySelector("input")!;

  fireEvent.change(input, { target: { value: "lower" } });
  expect(screen.getByTestId("palette-item-lowercase")).toBeTruthy();
  expect(screen.queryByTestId("palette-item-uppercase")).toBeNull();
  expect(screen.queryByTestId("palette-item-start")).toBeNull();
  expect(screen.queryByTestId("palette-item-send")).toBeNull();
  expect(screen.queryByTestId("palette-group-start")).toBeNull();
  expect(screen.queryByTestId("palette-group-send")).toBeNull();

  fireEvent.change(input, { target: { value: "RANDOM" } });
  expect(screen.getByTestId("palette-item-random")).toBeTruthy();
  expect(screen.getByTestId("palette-item-randomNumber")).toBeTruthy();

  fireEvent.change(input, { target: { value: "zzz" } });
  ALL_SIXTEEN.forEach((type) => {
    expect(screen.queryByTestId(`palette-item-${type}`)).toBeNull();
  });
  expect(screen.getByText('No nodes match "zzz".')).toBeTruthy();

  fireEvent.change(input, { target: { value: "" } });
  ALL_SIXTEEN.forEach((type) => {
    expect(screen.getByTestId(`palette-item-${type}`)).toBeTruthy();
  });
});

test("palette items are accessible with descriptive labels and tabIndex 0", () => {
  render(<FlowPalette />);

  expect(screen.getByTestId("palette-item-start")).toHaveAttribute(
    "aria-label",
    "Add Start node"
  );
  expect(screen.getByTestId("palette-item-randomNumber")).toHaveAttribute(
    "aria-label",
    "Add Random Number node"
  );
  expect(screen.getByTestId("palette-item-start").getAttribute("tabindex")).toBe("0");
  expect(screen.getByTestId("palette-item-lowercase").getAttribute("tabindex")).toBe("0");
});

test("palette item card colors come from theme tokens (divider border, paper background)", () => {
  // Contract pin for the theme-token refactor: the item card must resolve the
  // dark theme's divider (#3a3a3c) and paper (#1c1c1e) colors via sx tokens.
  render(
    <ThemeProvider theme={theme}>
      <FlowPalette />
    </ThemeProvider>
  );

  const item = screen.getByTestId("palette-item-start");
  expect(getComputedStyle(item).borderTopColor).toBe("rgb(58, 58, 60)");
  expect(getComputedStyle(item).backgroundColor).toBe("rgb(28, 28, 30)");
});

test("palette fills the column height and scrolls internally", () => {
  render(<FlowPalette />);

  // The palette must grow to fill the left column (same height as the canvas
  // section) and must be allowed to shrink below its content height —
  // flexShrink: 0 would overflow instead of scrolling.
  const paper = screen.getByTestId("flow-palette");
  expect(getComputedStyle(paper).flexGrow).toBe("1");
  expect(getComputedStyle(paper).flexShrink).toBe("1");

  // The item list scrolls internally when content exceeds the palette height.
  const list = screen.getByTestId("palette-list");
  expect(getComputedStyle(list).overflowY).toBe("auto");
});

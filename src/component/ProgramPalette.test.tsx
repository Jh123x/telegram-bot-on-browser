import { test, expect } from "@jest/globals";
import React from "react";
import { render, screen } from "@testing-library/react";
import { ProgramPalette } from "./ProgramPalette";

test("renders the Blocks heading and reference caption", () => {
  render(<ProgramPalette />);

  expect(screen.getByText("Blocks")).toBeInTheDocument();
  expect(
    screen.getByText("What each block does. Add blocks with the buttons on each program card.")
  ).toBeInTheDocument();
});

test("renders category headers", () => {
  render(<ProgramPalette />);

  expect(screen.getByText("Triggers")).toBeInTheDocument();
  expect(screen.getByText("Logic")).toBeInTheDocument();
  expect(screen.getByText("Transform")).toBeInTheDocument();
  expect(screen.getByText("Action")).toBeInTheDocument();
});

test("renders a label and description for each block type", () => {
  render(<ProgramPalette />);

  const expectedLabels = [
    "When message equals",
    "Runs when the message is exactly the trigger value.",
    "When message contains",
    "Runs when the message includes the trigger value.",
    "When message starts with",
    "Runs when the message begins with the trigger value.",
    "When message ends with",
    "Runs when the message ends with the trigger value.",
    "message length is greater than",
    "Passes when the message is longer than the number.",
    "message length is less than",
    "Passes when the message is shorter than the number.",
    "message matches regex",
    "Passes when the message matches the regular expression.",
    "make uppercase",
    "Changes the message to UPPERCASE.",
    "make lowercase",
    "Changes the message to lowercase.",
    "trim whitespace",
    "Removes spaces at the start and end.",
    "replace text",
    "Replaces matching text with new text.",
    "concat text",
    "Adds text before or after the message.",
    "reply with text",
    "Sends a fixed reply.",
    "reply random choice",
    "Picks one reply from a list.",
    "echo the current message",
    "Sends the message as it is now.",
  ];
  for (const text of expectedLabels) {
    expect(screen.getByText(text)).toBeInTheDocument();
  }
});

test("descriptions use the palette-description testids per category and type", () => {
  render(<ProgramPalette />);

  expect(screen.getByTestId("palette-description-trigger-equals")).toBeTruthy();
  expect(screen.getByTestId("palette-description-trigger-contains")).toBeTruthy();
  expect(screen.getByTestId("palette-description-trigger-startsWith")).toBeTruthy();
  expect(screen.getByTestId("palette-description-trigger-endsWith")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-lengthGreater")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-lengthLess")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-matchesRegex")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-uppercase")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-lowercase")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-trim")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-replace")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-concat")).toBeTruthy();
  expect(screen.getByTestId("palette-description-action-reply")).toBeTruthy();
  expect(screen.getByTestId("palette-description-action-random")).toBeTruthy();
  expect(screen.getByTestId("palette-description-action-echo")).toBeTruthy();
});

test("renders no draggable elements", () => {
  render(<ProgramPalette />);
  expect(document.querySelectorAll('[draggable="true"]')).toHaveLength(0);
});

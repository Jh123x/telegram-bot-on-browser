import { test, expect } from "@jest/globals";
import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
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
    "When message does not equal",
    "Runs when the message is not exactly the trigger value.",
    "When message does not contain",
    "Runs when the message does not include the trigger value.",
    "message length is greater than",
    "Passes when the message is longer than the number.",
    "message length is less than",
    "Passes when the message is shorter than the number.",
    "message matches regex",
    "Passes when the message matches the regular expression.",
    "message length equals",
    "Passes when the message length equals the number.",
    "message is a number",
    "Passes when the message is a number.",
    "message equals",
    "Passes when the message is exactly the value.",
    "message contains",
    "Passes when the message includes the value.",
    "message starts with",
    "Passes when the message begins with the value.",
    "message ends with",
    "Passes when the message ends with the value.",
    "message does not equal",
    "Passes when the message is not exactly the value.",
    "message does not contain",
    "Passes when the message does not include the value.",
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
    "capitalize first letter",
    "Capitalizes the first letter.",
    "capitalize each word",
    "Capitalizes the first letter of each word.",
    "reverse text",
    "Reverses the text.",
    "remove text",
    "Removes matching text.",
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
  expect(screen.getByTestId("palette-description-trigger-notEquals")).toBeTruthy();
  expect(screen.getByTestId("palette-description-trigger-notContains")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-lengthGreater")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-lengthLess")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-matchesRegex")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-lengthEquals")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-isNumber")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-equals")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-contains")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-startsWith")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-endsWith")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-notEquals")).toBeTruthy();
  expect(screen.getByTestId("palette-description-logic-notContains")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-uppercase")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-lowercase")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-trim")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-replace")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-concat")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-capitalize")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-titleCase")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-reverse")).toBeTruthy();
  expect(screen.getByTestId("palette-description-transform-remove")).toBeTruthy();
  expect(screen.getByTestId("palette-description-action-reply")).toBeTruthy();
  expect(screen.getByTestId("palette-description-action-random")).toBeTruthy();
  expect(screen.getByTestId("palette-description-action-echo")).toBeTruthy();
});

test("renders no draggable elements", () => {
  render(<ProgramPalette />);
  expect(document.querySelectorAll('[draggable="true"]')).toHaveLength(0);
});

test("renders one table per section with Block Type and Description headers", () => {
  render(<ProgramPalette />);

  expect(screen.getAllByRole("columnheader", { name: "Block Type" })).toHaveLength(4);
  expect(screen.getAllByRole("columnheader", { name: "Description" })).toHaveLength(4);
  expect(screen.getByTestId("palette-table-trigger")).toBeInTheDocument();
  expect(screen.getByTestId("palette-table-logic")).toBeInTheDocument();
  expect(screen.getByTestId("palette-table-transform")).toBeInTheDocument();
  expect(screen.getByTestId("palette-table-action")).toBeInTheDocument();
});

test("each table has the right number of rows", () => {
  render(<ProgramPalette />);

  const expected = [
    ["palette-table-trigger", 6],
    ["palette-table-logic", 11],
    ["palette-table-transform", 9],
    ["palette-table-action", 3],
  ] as const;
  for (const [testId, count] of expected) {
    // +1 to account for the header row.
    expect(within(screen.getByTestId(testId)).getAllByRole("row")).toHaveLength(
      count + 1
    );
  }
});

test("starts expanded with a hide toggle", () => {
  render(<ProgramPalette />);

  const toggle = screen.getByRole("button", { name: "Hide block reference" });
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(toggle).toHaveAttribute("aria-controls", "palette-collapse");
  expect(screen.getByTestId("palette-description-trigger-equals")).toBeVisible();
});

test("clicking the toggle collapses the reference", () => {
  render(<ProgramPalette />);

  const toggle = screen.getByRole("button", { name: "Hide block reference" });
  fireEvent.click(toggle);

  expect(screen.getByRole("button", { name: "Show block reference" })).toHaveAttribute(
    "aria-expanded",
    "false"
  );
  expect(screen.getByTestId("palette-collapse")).toHaveStyle({ height: "0px" });
});

test("toggling back open shows the reference again", () => {
  render(<ProgramPalette />);

  const toggle = screen.getByRole("button", { name: "Hide block reference" });
  fireEvent.click(toggle);
  fireEvent.click(screen.getByRole("button", { name: "Show block reference" }));

  expect(screen.getByRole("button", { name: "Hide block reference" })).toHaveAttribute(
    "aria-expanded",
    "true"
  );
  expect(screen.getByTestId("palette-description-trigger-equals")).toBeVisible();
});

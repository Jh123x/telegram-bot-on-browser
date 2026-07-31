import { test, expect } from "@jest/globals";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DocsPage } from "./DocsPage.tsx";

test("renders the docs heading", () => {
  render(<DocsPage />);

  expect(
    screen.getByRole("heading", { name: "Docs" })
  ).toBeTruthy();
});

test("renders all section headings", () => {
  render(<DocsPage />);

  const headings = [
    "Getting Started",
    "How Programs Work",
    "Blocks",
    "Samples",
    "Tips",
    "Troubleshooting",
  ];

  headings.forEach((heading) => {
    expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
  });
});

test("renders key content strings", () => {
  render(<DocsPage />);

  expect(screen.getAllByText(/@BotFather/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/localStorage/i).length).toBeGreaterThan(0);
  expect(
    screen.getByText(/first program whose trigger matches/i)
  ).toBeTruthy();
  expect(screen.getAllByText(/message ends with/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/uppercase/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Heads/).length).toBeGreaterThan(0);
});

test("does not render the placeholder text", () => {
  render(<DocsPage />);

  expect(screen.queryByText("Coming soon")).toBeNull();
});

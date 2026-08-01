import { test, expect } from "@jest/globals";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
    "Variables",
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
    screen.getByText(/The first program whose trigger matches runs its blocks/i)
  ).toBeTruthy();
  expect(screen.getByText(/Later programs are skipped/i)).toBeTruthy();
  expect(screen.getAllByText(/message ends with/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/uppercase/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Heads/).length).toBeGreaterThan(0);
});

test("keeps the copy concise and free of filler words", () => {
  render(<DocsPage />);

  const body = screen.getByText(/The first program whose trigger matches runs its blocks/i);
  expect(body).toBeTruthy();
  expect(screen.queryAllByText(/additionally/i)).toHaveLength(0);
  expect(screen.queryAllByText(/please/i)).toHaveLength(0);
});

test("does not render the placeholder text", () => {
  render(<DocsPage />);

  expect(screen.queryByText("Coming soon")).toBeNull();
});

test("renders a table of contents with anchor links for every section", () => {
  render(<DocsPage />);

  expect(screen.getByText("On this page")).toBeTruthy();

  const tocLinks = [
    { name: "Getting Started", href: "#getting-started" },
    { name: "How Programs Work", href: "#how-programs-work" },
    { name: "Variables", href: "#variables" },
    { name: "Blocks", href: "#blocks" },
    { name: "Samples", href: "#samples" },
    { name: "Tips", href: "#tips" },
    { name: "Troubleshooting", href: "#troubleshooting" },
  ];

  tocLinks.forEach(({ name, href }) => {
    expect(
      screen.getByRole("link", { name: `On this page: ${name}` })
    ).toHaveAttribute("href", href);
  });
});

test("renders external resource links with correct URLs", () => {
  render(<DocsPage />);

  const expectedLinks = [
    { role: "link", name: /@BotFather/i, href: "https://t.me/BotFather" },
    {
      role: "link",
      name: "Telegram Bot API docs",
      href: "https://core.telegram.org/bots/api",
    },
    {
      role: "link",
      name: "GitHub repository",
      href: "https://github.com/Jh123x/telegram-bot-on-browser",
    },
    {
      role: "link",
      name: "Live site",
      href: "https://telebot.jh123x.com",
    },
  ];

  expectedLinks.forEach(({ role, name, href }) => {
    const link = screen.getAllByRole(role, { name })[0];
    expect(link).toBeTruthy();
    expect(link).toHaveAttribute("href", href);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });
});

test("calls onNavigate when clicking an in-app tab link", () => {
  const onNavigate = jest.fn();
  render(<DocsPage onNavigate={onNavigate} />);

  fireEvent.click(screen.getByRole("button", { name: "Open the Settings tab" }));
  expect(onNavigate).toHaveBeenCalledWith("settings");

  fireEvent.click(screen.getByRole("button", { name: "Open the Programs tab" }));
  expect(onNavigate).toHaveBeenCalledWith("programs");

  fireEvent.click(screen.getByRole("button", { name: "Open the Chat tab" }));
  expect(onNavigate).toHaveBeenCalledWith("chat");
});

test("renders styled <pre> code sample blocks with expected content", () => {
  render(<DocsPage />);

  const welcome = screen.getByTestId("code-sample-welcome");
  expect(welcome).toBeTruthy();
  expect(welcome).toHaveProperty("tagName", "PRE");
  expect(welcome.textContent).toContain("/start");
  expect(welcome.textContent).toContain("reply");

  const shout = screen.getByTestId("code-sample-shout");
  expect(shout).toBeTruthy();
  expect(shout).toHaveProperty("tagName", "PRE");
  expect(shout.textContent).toContain("uppercase");
  expect(shout.textContent).toContain("echo");

  const pipeline = screen.getByTestId("code-sample-pipeline");
  expect(pipeline).toBeTruthy();
  expect(pipeline).toHaveProperty("tagName", "PRE");
  expect(pipeline.textContent).toContain("message");
  expect(pipeline.textContent).toContain("action");
  expect(pipeline.textContent).toContain("reply");
});

test("renders a variables code sample describing {prev} and named variables", () => {
  render(<DocsPage />);

  const variables = screen.getByTestId("code-sample-variables");
  expect(variables).toBeTruthy();
  expect(variables).toHaveProperty("tagName", "PRE");
  expect(variables.textContent).toContain("shout");
  expect(variables.textContent).toContain("uppercase");
  expect(variables.textContent).toContain("{shouted}");
  expect(variables.textContent).toContain("You shouted: {shouted}!");
});

test("mentions concat and trim in the transform docs", () => {
  render(<DocsPage />);

  expect(screen.getAllByText(/concat/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/trim/i).length).toBeGreaterThan(0);
});

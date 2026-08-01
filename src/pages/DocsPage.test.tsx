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
    "How Flows Work",
    "Triggers",
    "Variables",
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
    screen.getByText(/the bot follows the first transition whose trigger matches/i)
  ).toBeTruthy();
  expect(screen.getAllByText(/message ends with/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/any other message/i).length).toBeGreaterThan(0);
});

test("keeps the copy concise and free of filler words", () => {
  render(<DocsPage />);

  const body = screen.getByText(/the bot follows the first transition whose trigger matches/i);
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
    { name: "How Flows Work", href: "#how-flows-work" },
    { name: "Triggers", href: "#triggers" },
    { name: "Variables", href: "#variables" },
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

  fireEvent.click(screen.getByRole("button", { name: "Open the Flow tab" }));
  expect(onNavigate).toHaveBeenCalledWith("flow");

  fireEvent.click(screen.getByRole("button", { name: "Open the Chat tab" }));
  expect(onNavigate).toHaveBeenCalledWith("chat");
});

test("renders styled <pre> code samples for state replies and {msg}", () => {
  render(<DocsPage />);

  const replies = screen.getByTestId("code-sample-replies");
  expect(replies).toHaveProperty("tagName", "PRE");
  expect(replies.textContent).toContain("Welcome");
  expect(replies.textContent).toContain("Try /echo or answer the quiz.");

  const msg = screen.getByTestId("code-sample-msg");
  expect(msg).toHaveProperty("tagName", "PRE");
  expect(msg.textContent).toContain("{msg}");
});

test("renders a triggers list with the fallback and negated triggers", () => {
  render(<DocsPage />);

  expect(screen.getAllByText(/message equals a value/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/message does not equal/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/message does not contain/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/any other message/i).length).toBeGreaterThan(0);
});

test("documents per-user state and {msg} interpolation", () => {
  render(<DocsPage />);

  expect(screen.getAllByText(/\{msg\}/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/tracked independently/i).length).toBeGreaterThan(0);
});

test("documents the built-in flow samples", () => {
  render(<DocsPage />);

  expect(screen.getAllByText(/Welcome Flow/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Echo Flow/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Quiz Flow/i).length).toBeGreaterThan(0);
});

test("notes that legacy saved programs still run before flows", () => {
  render(<DocsPage />);

  expect(screen.getAllByText(/saved programs still run before flows/i).length).toBeGreaterThan(0);
});

test("getting started points to dragging nodes from the palette", () => {
  render(<DocsPage />);

  expect(screen.getAllByText(/drag (Start and State )?nodes from the palette/i).length).toBeGreaterThan(0);
  expect(screen.queryByText(/buttons on each program card/i)).toBeNull();
});

test("mentions Test mode in the tips", () => {
  render(<DocsPage />);

  expect(screen.getAllByText(/Test mode/i).length).toBeGreaterThan(0);
});

test("no longer documents the old block editor", () => {
  render(<DocsPage />);

  expect(screen.queryByRole("heading", { name: "How Programs Work" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Blocks" })).toBeNull();
  expect(screen.queryByText(/Coin Flip/i)).toBeNull();
  expect(screen.queryByText(/Shout/i)).toBeNull();
  expect(screen.queryByText(/Only Numbers/i)).toBeNull();
});

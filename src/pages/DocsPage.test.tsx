import { test, expect, vi } from "vitest";
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
    "Condition Matchers",
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
    screen.getByText(/every user message starts at the/i)
  ).toBeTruthy();
  expect(screen.getAllByText(/message ends with/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/else edge/i).length).toBeGreaterThan(0);
});

test("keeps the copy concise and free of filler words", () => {
  render(<DocsPage />);

  const body = screen.getByText(/every user message starts at the/i);
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
    { name: "Condition Matchers", href: "#triggers" },
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
  const onNavigate = vi.fn();
  render(<DocsPage onNavigate={onNavigate} />);

  fireEvent.click(screen.getByRole("button", { name: "Open the Settings tab" }));
  expect(onNavigate).toHaveBeenCalledWith("settings");

  fireEvent.click(screen.getByRole("button", { name: "Open the Flow tab" }));
  expect(onNavigate).toHaveBeenCalledWith("flow");

  fireEvent.click(screen.getByRole("button", { name: "Open the Chat tab" }));
  expect(onNavigate).toHaveBeenCalledWith("chat");
});

test("renders styled <pre> code samples for send replies and {msg}", () => {
  render(<DocsPage />);

  const replies = screen.getByTestId("code-sample-replies");
  expect(replies).toHaveProperty("tagName", "PRE");
  expect(replies.textContent).toContain("Welcome");
  expect(replies.textContent).toContain("Try /echo or say hi.");

  const msg = screen.getByTestId("code-sample-msg");
  expect(msg).toHaveProperty("tagName", "PRE");
  expect(msg.textContent).toContain("{msg}");
});

test("renders a condition matchers list without a fallback option", () => {
  render(<DocsPage />);

  expect(screen.getAllByText(/message equals a value/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/message does not equal/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/message does not contain/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/message does not start with/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/message does not end with/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/else edge/i).length).toBeGreaterThan(0);
  expect(screen.queryByText(/any other message/i)).toBeNull();
});

test("documents stateless evaluation and {msg} interpolation", () => {
  render(<DocsPage />);

  expect(screen.getAllByText(/\{msg\}/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/stateless/i).length).toBeGreaterThan(0);
});

test("documents the built-in flow samples", () => {
  render(<DocsPage />);

  expect(screen.getAllByText(/Dice Bot/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Poll Bot/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Shout Bot/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Quote Bot/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Greeting Bot/i).length).toBeGreaterThan(0);
  expect(screen.queryByText(/Quiz Flow/i)).toBeNull();
});

test("no longer mentions legacy saved programs", () => {
  render(<DocsPage />);

  expect(screen.queryByText(/saved programs/i)).toBeNull();
  expect(screen.queryByText(/block-based/i)).toBeNull();
});

test("getting started points to dragging nodes from the palette", () => {
  render(<DocsPage />);

  expect(screen.getAllByText(/drag Start, Transform, Condition and Send nodes/i).length).toBeGreaterThan(0);
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
  expect(screen.queryByText(/Shout Back/i)).toBeNull();
  expect(screen.queryByText(/Only Numbers/i)).toBeNull();
});

test("in-body tab links call onNavigate", () => {
  const onNavigate = vi.fn();
  render(<DocsPage onNavigate={onNavigate} />);

  // Getting Started section links.
  fireEvent.click(screen.getByRole("button", { name: "Settings tab" }));
  expect(onNavigate).toHaveBeenLastCalledWith("settings");

  fireEvent.click(screen.getByRole("button", { name: "Flow tab" }));
  expect(onNavigate).toHaveBeenLastCalledWith("flow");

  // "Chat tab" also appears in the troubleshooting section, so grab the first.
  const chatLinks = screen.getAllByRole("button", { name: "Chat tab" });
  expect(chatLinks.length).toBeGreaterThan(0);
  fireEvent.click(chatLinks[0]);
  expect(onNavigate).toHaveBeenLastCalledWith("chat");

  // The troubleshooting section's chat link also navigates.
  fireEvent.click(chatLinks[chatLinks.length - 1]);
  expect(onNavigate).toHaveBeenCalledTimes(4);
});

import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { TestChat } from "./TestChat.tsx";
import { renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { Program } from "../interfaces/program.ts";

const makeStore = (programs: Program[]) =>
  setupStore({
    bot: { token: "", programs, response: [], users: [] },
  });

const replyBlock = (id: string, value: string) => ({
  id,
  category: "action" as const,
  kind: "reply" as const,
  value,
  value2: "",
  fallback: "",
});

test("renders the Test Chat heading, input and send button", () => {
  renderWithProviders(<TestChat />, { store: makeStore([]) });

  expect(screen.getByText("Test Chat")).toBeTruthy();
  expect(screen.getByLabelText("Message")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Send" })).toBeTruthy();
});

test("sending a matching message shows the bot reply and matched program name", () => {
  const program: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [replyBlock("b1", "Welcome!")],
  };
  renderWithProviders(<TestChat />, { store: makeStore([program]) });

  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "/start" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(screen.getByText("Matched program: Greet")).toBeTruthy();
  expect(screen.getByText("Welcome!")).toBeTruthy();
});

test("sending a non-matching message shows the no-match note", () => {
  const program: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [replyBlock("b1", "Welcome!")],
  };
  renderWithProviders(<TestChat />, { store: makeStore([program]) });

  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "nope" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(screen.getByText(/No program matched/)).toBeTruthy();
});

test("the first matching program wins", () => {
  const p1: Program = {
    id: "p1",
    name: "First",
    trigger: { type: "equals", value: "hi" },
    blocks: [replyBlock("b1", "First wins")],
  };
  const p2: Program = {
    id: "p2",
    name: "Second",
    trigger: { type: "contains", value: "hi" },
    blocks: [replyBlock("b2", "Second")],
  };
  renderWithProviders(<TestChat />, { store: makeStore([p1, p2]) });

  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "hi" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(screen.getByText("First wins")).toBeTruthy();
  expect(screen.queryByText("Second")).toBeNull();
});

test("multiple replies appear as separate bot messages", () => {
  const program: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [replyBlock("b1", "one"), replyBlock("b2", "two")],
  };
  renderWithProviders(<TestChat />, { store: makeStore([program]) });

  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "/start" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(screen.getByText("one")).toBeTruthy();
  expect(screen.getByText("two")).toBeTruthy();
});

test("a matched program that produces no reply shows the silent note", () => {
  const program: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [
      {
        id: "b1",
        category: "logic",
        kind: "lengthGreater",
        value: "100",
        value2: "",
        fallback: "",
      },
    ],
  };
  renderWithProviders(<TestChat />, { store: makeStore([program]) });

  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "/start" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(screen.getByText(/produced no reply/)).toBeTruthy();
});

test("Enter key sends the message", () => {
  const program: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [replyBlock("b1", "Welcome!")],
  };
  renderWithProviders(<TestChat />, { store: makeStore([program]) });

  const input = screen.getByLabelText("Message");
  fireEvent.change(input, { target: { value: "/start" } });
  fireEvent.keyDown(input, { key: "Enter" });

  expect(screen.getByText("Welcome!")).toBeTruthy();
});

test("Clear empties the conversation", () => {
  const program: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [replyBlock("b1", "Welcome!")],
  };
  renderWithProviders(<TestChat />, { store: makeStore([program]) });

  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "/start" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(screen.getByText("Welcome!")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect(screen.queryByText("Welcome!")).toBeNull();
});

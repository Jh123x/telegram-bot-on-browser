import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen, within } from "@testing-library/react";
import { ProgramEditor } from "./ProgramEditor";
import { renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { BotWithConfig } from "../redux/types.ts";
import { Program } from "../interfaces/program.ts";

const makeProgram = (name: string, triggerValue = ""): Program => ({
  id: name.toLowerCase() + "-id",
  name,
  trigger: { type: "equals", value: triggerValue },
  actions: [],
});

const makeStore = (programs: Program[] = []) =>
  setupStore<BotWithConfig>({
    bot: { token: "", programs, response: [], users: [] },
  });

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

test("renders Programs header, Blocks palette, Samples, and empty-state text when no programs", () => {
  const store = makeStore();
  renderWithProviders(<ProgramEditor />, { store });

  expect(screen.getByText("Programs")).toBeTruthy();
  expect(screen.getByText("Blocks")).toBeTruthy();
  expect(screen.getByText("Samples")).toBeTruthy();
  expect(
    screen.getByText(
      "No programs yet — drag a block or load a sample above."
    )
  ).toBeTruthy();
});

test("clicking + New Program adds a default program", () => {
  const store = makeStore();
  renderWithProviders(<ProgramEditor />, { store });

  fireEvent.click(screen.getByRole("button", { name: "+ New Program" }));

  expect(store.getState().bot.programs).toHaveLength(1);
  const program = store.getState().bot.programs[0];
  expect(program.name).toBe("New Program");
  expect(program.trigger).toEqual({ type: "equals", value: "" });
  expect(program.actions).toEqual([]);
});

test("clicking Coin Flip sample adds it", () => {
  const store = makeStore();
  renderWithProviders(<ProgramEditor />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Coin Flip" }));

  expect(store.getState().bot.programs).toHaveLength(1);
  expect(store.getState().bot.programs[0].name).toBe("Coin Flip");
  expect(store.getState().bot.programs[0].trigger.value).toBe("/flip");
});

test("persists programs to localStorage and persists edited user details", () => {
  const store = makeStore();
  renderWithProviders(<ProgramEditor />, { store });

  fireEvent.click(screen.getByRole("button", { name: "+ New Program" }));

  expect(JSON.parse(localStorage.getItem("programs")!)).toEqual(
    store.getState().bot.programs
  );

  // Persistence of user-typed details
  const preloaded: Program = {
    id: "p-greet",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    actions: [{ id: "a1", type: "reply", value: "hi" }],
  };
  const store2 = makeStore([preloaded]);
  renderWithProviders(<ProgramEditor />, { store: store2 });

  fireEvent.change(
    within(screen.getByTestId("program-card-Greet")).getByLabelText(
      "Program name"
    ),
    { target: { value: "Renamed" } }
  );

  const stored = JSON.parse(localStorage.getItem("programs")!);
  expect(stored[0].name).toBe("Renamed");
  expect(store2.getState().bot.programs[0].name).toBe("Renamed");
});

test("move down reorders programs", () => {
  const p1 = makeProgram("First");
  const p2 = makeProgram("Second");
  const store = makeStore([p1, p2]);
  renderWithProviders(<ProgramEditor />, { store });

  const firstCard = screen.getByTestId("program-card-First");
  fireEvent.click(within(firstCard).getByRole("button", { name: "Move down" }));

  expect(store.getState().bot.programs.map((p) => p.name)).toEqual([
    "Second",
    "First",
  ]);
});

test("renders programs from store", () => {
  const store = makeStore([makeProgram("Visible")]);
  renderWithProviders(<ProgramEditor />, { store });

  expect(screen.getByTestId("program-card-Visible")).toBeTruthy();
});

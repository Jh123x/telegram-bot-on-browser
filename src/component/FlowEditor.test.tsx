import { test, expect, afterEach } from "@jest/globals";
import React from "react";
import { fireEvent, screen, within } from "@testing-library/react";
import { FlowEditor } from "./FlowEditor.tsx";
import { renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { BotWithConfig } from "../redux/types.ts";
import { Flow } from "../interfaces/flow.ts";

const makeFlow = (name: string, id = name.toLowerCase() + "-id"): Flow => ({
  id,
  name,
  startNodeId: "",
  nodes: [],
  edges: [],
});

const makeStore = (flows: Flow[] = []) =>
  setupStore<BotWithConfig>({
    bot: { token: "", programs: [], flows, response: [], users: [] },
  });

afterEach(() => {
  localStorage.clear();
});

test("renders the editor: canvas wrapper, toolbar, palette, samples, and empty state when no flows", () => {
  const store = makeStore();
  renderWithProviders(<FlowEditor />, { store });

  expect(screen.getByTestId("flow-editor")).toBeTruthy();
  expect(screen.getByTestId("flow-canvas")).toBeTruthy();
  expect(screen.getByTestId("flow-palette")).toBeTruthy();
  expect(
    screen.getByText(
      "No flows yet — create a new flow and drag nodes from the palette, or load a sample."
    )
  ).toBeTruthy();
});

test("New Flow dispatches addFlow and selects the new flow", () => {
  const store = makeStore();
  renderWithProviders(<FlowEditor />, { store });

  fireEvent.click(screen.getByRole("button", { name: "+ New Flow" }));

  const flows = store.getState().bot.flows;
  expect(flows).toHaveLength(1);
  expect(flows[0].name).toBe("New Flow");
  expect(flows[0].nodes).toEqual([]);
  // The new flow is now being edited (its name shows in the editor's own Name field).
  expect(
    screen.getByText("New Flow", { selector: ".flow-name-display" })
  ).toBeTruthy();
});

test("typing the flow name dispatches updateFlow", () => {
  const flow = makeFlow("Original");
  const store = makeStore([flow]);
  renderWithProviders(<FlowEditor />, { store });

  fireEvent.change(screen.getByLabelText("Flow name"), {
    target: { value: "Renamed" },
  });

  expect(store.getState().bot.flows[0].name).toBe("Renamed");
});

test("Delete Flow removes the flow and selects a remaining one", () => {
  const f1 = makeFlow("First", "f1");
  const f2 = makeFlow("Second", "f2");
  const store = makeStore([f1, f2]);
  renderWithProviders(<FlowEditor />, { store });

  // Select the first flow then delete it.
  fireEvent.click(screen.getByTestId("flow-item-f1"));
  fireEvent.click(screen.getByRole("button", { name: "Delete Flow" }));

  expect(store.getState().bot.flows.map((f) => f.id)).toEqual(["f2"]);
});

test("renders validation errors for an invalid flow", () => {
  const empty = makeFlow("Empty Flow", "empty"); // no nodes -> no start node
  const store = makeStore([empty]);
  renderWithProviders(<FlowEditor />, { store });

  expect(screen.getByText(/Flow must have a start node/)).toBeTruthy();
});

test("switching between flows updates which flow is edited", () => {
  const f1 = makeFlow("First", "f1");
  const f2 = makeFlow("Second", "f2");
  const store = makeStore([f1, f2]);
  renderWithProviders(<FlowEditor />, { store });

  // Name field initially shows "First" (first flow selected).
  expect(screen.getByLabelText("Flow name")).toHaveValue("First");

  fireEvent.click(screen.getByTestId("flow-item-f2"));

  expect(screen.getByLabelText("Flow name")).toHaveValue("Second");
});

import { test, expect, vi } from "vitest";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { FlowSamples } from "./FlowSamples.tsx";
import { renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { BotWithConfig } from "../redux/types.ts";
import { SAMPLE_FLOWS } from "../logic/flowSamples.ts";

const makeStore = () =>
  setupStore<BotWithConfig>({
    bot: { token: "", flows: [], response: [], users: [] },
  });

test("renders all sample flow names", () => {
  renderWithProviders(<FlowSamples />, { store: makeStore() });

  SAMPLE_FLOWS.forEach((sample) => {
    expect(screen.getByText(sample.name)).toBeTruthy();
  });
});

test("clicking a sample calls onLoaded with a fresh-id copy", () => {
  const sample = SAMPLE_FLOWS[1]; // "Poll Bot" (a condition/if flow)
  const onLoaded = vi.fn();
  renderWithProviders(<FlowSamples onLoaded={onLoaded} />, { store: makeStore() });

  fireEvent.click(screen.getByText(sample.name));

  expect(onLoaded).toHaveBeenCalledTimes(1);
  const flow = onLoaded.mock.calls[0][0];
  expect(flow.name).toBe(sample.flow.name || sample.name);
  // Fresh ids: the loaded flow/node/edge ids must differ from the sample.
  expect(flow.id).not.toBe(sample.flow.id);
  expect(flow.nodes.map((n) => n.id)).not.toEqual(
    sample.flow.nodes.map((n) => n.id)
  );
  // Structure preserved: same number of nodes/edges and the startNodeId
  // points at a node that exists in the copy.
  expect(flow.nodes).toHaveLength(sample.flow.nodes.length);
  expect(flow.edges).toHaveLength(sample.flow.edges.length);
  expect(flow.nodes.some((n) => n.id === flow.startNodeId)).toBe(true);
});

test("clicking a sample preserves the branch handles in the loaded flow", () => {
  const onLoaded = vi.fn();
  renderWithProviders(<FlowSamples onLoaded={onLoaded} />, { store: makeStore() });

  fireEvent.click(screen.getByText("Dice Bot"));

  const flow = onLoaded.mock.calls[0][0];
  // Dice Bot has plain edges (start -> lowercase -> gate) plus condition
  // edges that carry an "if" sourceHandle (the gate's first dice branch).
  expect(flow.edges.length).toBeGreaterThan(2);
  // A plain edge (no sourceHandle) is preserved.
  const plainEdge = flow.edges.find((e: { sourceHandle?: string }) => e.sourceHandle == null);
  expect(plainEdge).toBeTruthy();
  // An "if" branch edge (gate condition -> first dice condition) survives.
  const ifEdge = flow.edges.find((e: { sourceHandle?: string }) => e.sourceHandle === "if");
  expect(ifEdge).toBeTruthy();
});

test("onLoaded receives the prepared flow", () => {
  const onLoaded = vi.fn();
  const store = makeStore();
  renderWithProviders(<FlowSamples onLoaded={onLoaded} />, { store });

  fireEvent.click(screen.getByText("Dice Bot"));

  expect(onLoaded).toHaveBeenCalledTimes(1);
  expect(onLoaded.mock.calls[0][0].name).toBe("Dice Bot");
});

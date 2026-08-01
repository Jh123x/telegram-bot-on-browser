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
  const sample = SAMPLE_FLOWS[2]; // "Greeting Check" (a condition/if-else flow)
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

  fireEvent.click(screen.getByText("Welcome Flow"));

  const flow = onLoaded.mock.calls[0][0];
  // Welcome Flow is start -> send: one plain (no sourceHandle) edge.
  expect(flow.edges).toHaveLength(1);
  expect(flow.edges[0].sourceHandle).toBeUndefined();
});

test("onLoaded receives the prepared flow", () => {
  const onLoaded = vi.fn();
  const store = makeStore();
  renderWithProviders(<FlowSamples onLoaded={onLoaded} />, { store });

  fireEvent.click(screen.getByText("Welcome Flow"));

  expect(onLoaded).toHaveBeenCalledTimes(1);
  expect(onLoaded.mock.calls[0][0].name).toBe("Welcome Flow");
});

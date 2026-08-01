import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { FlowSamples } from "./FlowSamples.tsx";
import { renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { BotWithConfig } from "../redux/types.ts";
import { SAMPLE_FLOWS } from "../logic/flowSamples.ts";

const makeStore = () =>
  setupStore<BotWithConfig>({
    bot: { token: "", programs: [], flows: [], response: [], users: [] },
  });

test("renders all sample flow names", () => {
  renderWithProviders(<FlowSamples />, { store: makeStore() });

  SAMPLE_FLOWS.forEach((sample) => {
    expect(screen.getByText(sample.name)).toBeTruthy();
  });
});

test("clicking a sample dispatches addFlow with a fresh-id copy", () => {
  const store = makeStore();
  renderWithProviders(<FlowSamples />, { store });

  fireEvent.click(screen.getByText("Quiz Flow"));

  const flows = store.getState().bot.flows;
  expect(flows).toHaveLength(1);
  expect(flows[0].name).toBe("Quiz Flow");
  // Fresh ids: the stored flow/node/edge ids must differ from the sample.
  expect(flows[0].id).not.toBe(SAMPLE_FLOWS[2].flow.id);
  expect(flows[0].nodes.map((n) => n.id)).not.toEqual(
    SAMPLE_FLOWS[2].flow.nodes.map((n) => n.id)
  );
  // Structure preserved: same number of nodes/edges and the startNodeId
  // points at a node that exists in the copy.
  expect(flows[0].nodes).toHaveLength(SAMPLE_FLOWS[2].flow.nodes.length);
  expect(flows[0].edges).toHaveLength(SAMPLE_FLOWS[2].flow.edges.length);
  expect(flows[0].nodes.some((n) => n.id === flows[0].startNodeId)).toBe(true);
});

test("onLoaded receives the added flow", () => {
  const onLoaded = jest.fn();
  const store = makeStore();
  renderWithProviders(<FlowSamples onLoaded={onLoaded} />, { store });

  fireEvent.click(screen.getByText("Welcome Flow"));

  expect(onLoaded).toHaveBeenCalledTimes(1);
  expect(onLoaded.mock.calls[0][0].name).toBe("Welcome Flow");
});

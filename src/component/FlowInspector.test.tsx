import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { FlowInspector } from "./FlowInspector.tsx";
import { renderWithProviders } from "../redux/testUtils.tsx";
import { Flow } from "../interfaces/flow.ts";

const makeFlow = (overrides: Partial<Flow> = {}): Flow => ({
  id: "f1",
  name: "Flow",
  startNodeId: "start",
  nodes: [
    {
      id: "start",
      type: "start",
      position: { x: 0, y: 0 },
      data: { label: "Start", replies: [] },
    },
    {
      id: "state1",
      type: "state",
      position: { x: 120, y: 0 },
      data: { label: "Hello", replies: ["Hi there", "Welcome"] },
    },
  ],
  edges: [
    {
      id: "e1",
      source: "start",
      target: "state1",
      data: { trigger: { type: "fallback", value: "" } },
    },
  ],
  ...overrides,
});

const renderInspector = (
  flow: Flow,
  selectedNodeId: string | null,
  selectedEdgeId: string | null,
  onUpdate = () => {}
) =>
  renderWithProviders(
    <FlowInspector
      flow={flow}
      selectedNodeId={selectedNodeId}
      selectedEdgeId={selectedEdgeId}
      onUpdate={onUpdate}
    />
  );

test("shows a hint when nothing is selected", () => {
  renderInspector(makeFlow(), null, null);
  expect(screen.getByText("Select a node or edge to edit it.")).toBeTruthy();
});

test("editing a state node label dispatches onUpdate", () => {
  const onUpdate = jest.fn();
  renderInspector(makeFlow(), "state1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("State label"), {
    target: { value: "Renamed" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "state1",
          data: expect.objectContaining({ label: "Renamed" }),
        }),
      ]),
    })
  );
});

test("editing replies splits the textarea on newlines", () => {
  const onUpdate = jest.fn();
  renderInspector(makeFlow(), "state1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Replies (one per line)"), {
    target: { value: "First\nSecond\nThird" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "state1",
          data: expect.objectContaining({ replies: ["First", "Second", "Third"] }),
        }),
      ]),
    })
  );
});

test("the replies field is hidden for a start node", () => {
  renderInspector(makeFlow(), "start", null);
  expect(screen.queryByLabelText("Replies (one per line)")).toBeNull();
  expect(screen.getByText("Start Node")).toBeTruthy();
});

test("editing an edge trigger type dispatches onUpdate", async () => {
  const onUpdate = jest.fn();
  renderInspector(makeFlow(), null, "e1", onUpdate);

  // MUI Select: open the listbox (rendered in a portal) and pick equals.
  fireEvent.mouseDown(screen.getByRole("combobox"));
  fireEvent.click(await screen.findByRole("option", { name: "message equals" }));

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      edges: expect.arrayContaining([
        expect.objectContaining({
          id: "e1",
          data: expect.objectContaining({
            trigger: expect.objectContaining({ type: "equals" }),
          }),
        }),
      ]),
    })
  );
});

test("editing an edge trigger value dispatches onUpdate", () => {
  const flow = makeFlow({
    edges: [
      {
        id: "e1",
        source: "start",
        target: "state1",
        data: { trigger: { type: "equals", value: "/start" } },
      },
    ],
  });
  const onUpdate = jest.fn();
  renderInspector(flow, null, "e1", onUpdate);

  fireEvent.change(screen.getByLabelText("Trigger value"), {
    target: { value: "/go" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      edges: expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            trigger: expect.objectContaining({ type: "equals", value: "/go" }),
          }),
        }),
      ]),
    })
  );
});

test("the trigger value input is hidden for a fallback trigger", () => {
  renderInspector(makeFlow(), null, "e1");
  expect(screen.queryByLabelText("Trigger value")).toBeNull();
  expect(screen.getByText("any other message")).toBeTruthy();
});

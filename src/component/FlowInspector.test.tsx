import { test, expect, vi } from "vitest";
import React, { useState } from "react";
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
      data: { label: "Start" },
    },
    {
      id: "transform1",
      type: "uppercase",
      position: { x: 120, y: 0 },
      data: { label: "Upper" },
    },
    {
      id: "replace1",
      type: "replace",
      position: { x: 160, y: 0 },
      data: { label: "Swap", find: "a", replacement: "b" },
    },
    {
      id: "condition1",
      type: "contains",
      position: { x: 240, y: 0 },
      data: { label: "Has hi", value: "hi" },
    },
    {
      id: "send1",
      type: "send",
      position: { x: 360, y: 0 },
      data: { label: "Hello", replies: ["Hi there", "Welcome"] },
    },
    {
      id: "random1",
      type: "send",
      position: { x: 400, y: 0 },
      data: { label: "Flip", replies: ["Heads", "Tails"] },
    },
    {
      id: "poll1",
      type: "poll",
      position: { x: 440, y: 0 },
      data: { label: "Pick" },
    },
  ],
  edges: [
    { id: "e_if", source: "condition1", target: "send1", sourceHandle: "if" },
    { id: "e_else", source: "condition1", target: "start", sourceHandle: "else" },
    { id: "e_plain", source: "start", target: "transform1" },
  ],
  ...overrides,
});

const renderInspector = (
  flow: Flow,
  selectedNodeId: string | null,
  selectedEdgeId: string | null,
  onUpdate = () => {},
  onDelete = () => {}
) =>
  renderWithProviders(
    <FlowInspector
      flow={flow}
      selectedNodeId={selectedNodeId}
      selectedEdgeId={selectedEdgeId}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );

// Stateful harness: re-renders the inspector with the updated flow so
// conditional fields (quiz-only controls) appear after a Select change.
const PollHarness = ({ onUpdate }: { onUpdate: (f: Flow) => void }) => {
  const [f, setF] = useState(makeFlow());
  return (
    <FlowInspector
      flow={f}
      selectedNodeId="poll1"
      selectedEdgeId={null}
      onUpdate={(next) => {
        setF(next);
        onUpdate(next);
      }}
    />
  );
};

test("shows a hint when nothing is selected", () => {
  renderInspector(makeFlow(), null, null);
  expect(screen.getByText("Select a node or edge to edit it.")).toBeTruthy();
});

// ----- Start node -----

test("start panel shows only the label field and no replies/edit fields", () => {
  renderInspector(makeFlow(), "start", null);
  expect(screen.getByText("Start Node")).toBeTruthy();
  expect(screen.getByLabelText("Node label")).toBeTruthy();
  expect(screen.queryByLabelText(/replies/i)).toBeNull();
  expect(screen.queryByLabelText(/trigger/i)).toBeNull();
  expect(screen.queryByLabelText(/find/i)).toBeNull();
});

test("editing the start label dispatches onUpdate", () => {
  const onUpdate = vi.fn();
  renderInspector(makeFlow(), "start", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Node label"), {
    target: { value: "Renamed" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "start",
          data: expect.objectContaining({ label: "Renamed" }),
        }),
      ]),
    })
  );
});

// ----- Transform node -----

test("transform panel shows the label and no type selector", () => {
  renderInspector(makeFlow(), "transform1", null);
  expect(screen.getByText("Transform Node")).toBeTruthy();
  expect(screen.getByLabelText("Node label")).toBeTruthy();
  // The operation is the node type itself — no per-node select anymore.
  expect(screen.queryByRole("combobox")).toBeNull();
});

test("a plain transform (uppercase) shows no Find/Replacement/Pattern fields", () => {
  renderInspector(makeFlow(), "transform1", null);
  expect(screen.queryByLabelText("Find")).toBeNull();
  expect(screen.queryByLabelText("Replacement")).toBeNull();
  expect(screen.queryByLabelText("Pattern")).toBeNull();
});

test("replace transform reveals Find and Replacement fields", () => {
  renderInspector(makeFlow(), "replace1", null);
  expect(screen.getByLabelText("Find")).toBeTruthy();
  expect(screen.getByLabelText("Replacement")).toBeTruthy();
  expect(screen.queryByLabelText("Pattern")).toBeNull();
});

test("editing the Find field dispatches onUpdate with the flat data", () => {
  const onUpdate = vi.fn();
  renderInspector(makeFlow(), "replace1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Find"), {
    target: { value: "x" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "replace1",
          data: expect.objectContaining({ find: "x", replacement: "b" }),
        }),
      ]),
    })
  );
});

test("a replace node without find/provided values shows empty Find/Replacement fields", () => {
  const flow = makeFlow({
    nodes: [
      {
        id: "re1",
        type: "replace",
        position: { x: 0, y: 0 },
        data: { label: "Swap" },
      },
    ],
  });
  renderInspector(flow, "re1", null);

  expect((screen.getByLabelText("Find") as HTMLInputElement).value).toBe("");
  expect(
    (screen.getByLabelText("Replacement") as HTMLInputElement).value
  ).toBe("");
});

test("editing the Replacement field dispatches onUpdate", () => {
  const onUpdate = vi.fn();
  renderInspector(makeFlow(), "replace1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Replacement"), {
    target: { value: "z" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "replace1",
          data: expect.objectContaining({ find: "a", replacement: "z" }),
        }),
      ]),
    })
  );
});

test("extract regex transform reveals the Pattern field", () => {
  const flow = makeFlow({
    nodes: [
      {
        id: "re1",
        type: "extractRegex",
        position: { x: 0, y: 0 },
        data: { label: "Grab", pattern: "\\d+" },
      },
    ],
  });
  renderInspector(flow, "re1", null);
  expect(screen.getByLabelText("Pattern")).toBeTruthy();
  expect(screen.queryByLabelText("Find")).toBeNull();
  expect(screen.queryByLabelText("Replacement")).toBeNull();
});

test("editing the Pattern field dispatches onUpdate", () => {
  const flow = makeFlow({
    nodes: [
      {
        id: "re1",
        type: "extractRegex",
        position: { x: 0, y: 0 },
        data: { label: "Grab", pattern: "\\d+" },
      },
    ],
  });
  const onUpdate = vi.fn();
  renderInspector(flow, "re1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Pattern"), {
    target: { value: "[a-z]+" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "re1",
          data: expect.objectContaining({ pattern: "[a-z]+" }),
        }),
      ]),
    })
  );
});

test("random number transform reveals Min and Max fields with a hint", () => {
  const flow = makeFlow({
    nodes: [
      {
        id: "rn1",
        type: "randomNumber",
        position: { x: 0, y: 0 },
        data: { label: "Roll", min: "1", max: "20" },
      },
    ],
  });
  renderInspector(flow, "rn1", null);
  expect(screen.getByLabelText("Min")).toHaveValue("1");
  expect(screen.getByLabelText("Max")).toHaveValue("20");
  expect(screen.getByText("Picks a random whole number between Min and Max (inclusive).")).toBeTruthy();
  expect(screen.queryByLabelText("Pattern")).toBeNull();
});

test("editing Min and Max dispatches onUpdate", () => {
  const flow = makeFlow({
    nodes: [
      {
        id: "rn1",
        type: "randomNumber",
        position: { x: 0, y: 0 },
        data: { label: "Roll", min: "1", max: "6" },
      },
    ],
  });
  const onUpdate = vi.fn();
  renderInspector(flow, "rn1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Min"), { target: { value: "2" } });

  expect(onUpdate).toHaveBeenLastCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "rn1",
          data: expect.objectContaining({ min: "2" }),
        }),
      ]),
    })
  );

  fireEvent.change(screen.getByLabelText("Max"), { target: { value: "12" } });

  expect(onUpdate).toHaveBeenLastCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "rn1",
          data: expect.objectContaining({ max: "12" }),
        }),
      ]),
    })
  );
});

test("concat front transform reveals the Text field", () => {
  const flow = makeFlow({
    nodes: [
      {
        id: "c1",
        type: "concatFront",
        position: { x: 0, y: 0 },
        data: { label: "Prefix", text: "!" },
      },
    ],
  });
  renderInspector(flow, "c1", null);
  expect(screen.getByLabelText("Text")).toHaveValue("!");
  expect(screen.queryByLabelText("Template")).toBeNull();
});

test("editing the concat front Text field dispatches onUpdate with data.text", () => {
  const flow = makeFlow({
    nodes: [
      {
        id: "c1",
        type: "concatFront",
        position: { x: 0, y: 0 },
        data: { label: "Prefix", text: "" },
      },
    ],
  });
  const onUpdate = vi.fn();
  renderInspector(flow, "c1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Text"), {
    target: { value: ">>" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "c1",
          data: expect.objectContaining({ text: ">>" }),
        }),
      ]),
    })
  );
});

test("concat back transform reveals the Text field", () => {
  const flow = makeFlow({
    nodes: [
      {
        id: "c2",
        type: "concatBack",
        position: { x: 0, y: 0 },
        data: { label: "Suffix", text: "!!" },
      },
    ],
  });
  renderInspector(flow, "c2", null);
  expect(screen.getByLabelText("Text")).toHaveValue("!!");
});

test("editing the concat back Text field dispatches onUpdate with data.text", () => {
  const flow = makeFlow({
    nodes: [
      {
        id: "c2",
        type: "concatBack",
        position: { x: 0, y: 0 },
        data: { label: "Suffix", text: "" },
      },
    ],
  });
  const onUpdate = vi.fn();
  renderInspector(flow, "c2", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Text"), {
    target: { value: "<<" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "c2",
          data: expect.objectContaining({ text: "<<" }),
        }),
      ]),
    })
  );
});

test("template transform reveals the Template field with a hint", () => {
  const flow = makeFlow({
    nodes: [
      {
        id: "t1",
        type: "template",
        position: { x: 0, y: 0 },
        data: { label: "Fmt", template: "Hi {msg}" },
      },
    ],
  });
  renderInspector(flow, "t1", null);
  expect(screen.getByLabelText("Template")).toHaveValue("Hi {msg}");
  expect(screen.getByText("Use {msg} for the current message.")).toBeTruthy();
  expect(screen.queryByLabelText("Text")).toBeNull();
});

test("editing the template field dispatches onUpdate with data.template", () => {
  const flow = makeFlow({
    nodes: [
      {
        id: "t1",
        type: "template",
        position: { x: 0, y: 0 },
        data: { label: "Fmt", template: "" },
      },
    ],
  });
  const onUpdate = vi.fn();
  renderInspector(flow, "t1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Template"), {
    target: { value: "Hello, {msg}!" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "t1",
          data: expect.objectContaining({ template: "Hello, {msg}!" }),
        }),
      ]),
    })
  );
});

// ----- Condition node -----

test("condition panel shows label, type caption, and trigger value field", () => {
  renderInspector(makeFlow(), "condition1", null);
  expect(screen.getByText("Condition Node")).toBeTruthy();
  expect(screen.getByLabelText("Trigger value")).toBeTruthy();
  // The trigger TYPE is the node type — shown as a caption, not a select.
  expect(screen.getByText("contains")).toBeTruthy();
  expect(screen.queryByRole("combobox")).toBeNull();
});

test("editing the condition trigger value dispatches onUpdate", () => {
  const onUpdate = vi.fn();
  renderInspector(makeFlow(), "condition1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Trigger value"), {
    target: { value: "hello" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "condition1",
          data: expect.objectContaining({ value: "hello" }),
        }),
      ]),
    })
  );
});

test("editing the condition node label dispatches onUpdate", () => {
  const onUpdate = vi.fn();
  renderInspector(makeFlow(), "condition1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Node label"), {
    target: { value: "Renamed cond" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "condition1",
          data: expect.objectContaining({ label: "Renamed cond", value: "hi" }),
        }),
      ]),
    })
  );
});

// ----- Send node -----

test("send panel shows the label and replies multiline", () => {
  renderInspector(makeFlow(), "send1", null);
  expect(screen.getByText("Send Node")).toBeTruthy();
  expect(screen.getByLabelText("Replies (one per line)")).toBeTruthy();
});

test("editing replies splits the textarea on newlines", () => {
  const onUpdate = vi.fn();
  renderInspector(makeFlow(), "send1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Replies (one per line)"), {
    target: { value: "First\nSecond\nThird" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "send1",
          data: expect.objectContaining({ replies: ["First", "Second", "Third"] }),
        }),
      ]),
    })
  );
});

test("editing the send node label dispatches onUpdate", () => {
  const onUpdate = vi.fn();
  renderInspector(makeFlow(), "send1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Node label"), {
    target: { value: "Renamed send" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "send1",
          data: expect.objectContaining({ label: "Renamed send" }),
        }),
      ]),
    })
  );
});

// ----- Send node (replies variant) -----

test("send panel shows the label and replies multiline with no random hint", () => {
  renderInspector(makeFlow(), "random1", null);
  expect(screen.getByText("Send Node")).toBeTruthy();
  expect(screen.getByLabelText("Replies (one per line)")).toBeTruthy();
  expect(screen.queryByText("Sends one of these lines, chosen at random.")).toBeNull();
});

test("editing the replies textarea splits on newlines", () => {
  const onUpdate = vi.fn();
  renderInspector(makeFlow(), "random1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Replies (one per line)"), {
    target: { value: "Heads\nTails\nMaybe" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "random1",
          data: expect.objectContaining({ replies: ["Heads", "Tails", "Maybe"] }),
        }),
      ]),
    })
  );
});

// ----- Poll node -----

test("poll panel shows the label and a format caption, with no replies field", () => {
  renderInspector(makeFlow(), "poll1", null);
  expect(screen.getByText("Poll Node")).toBeTruthy();
  expect(screen.getByLabelText("Node label")).toBeTruthy();
  expect(
    screen.getByText(/Parses \/poll <title> option1, option2, option3 from the message/i)
  ).toBeTruthy();
  // Poll data has no replies field, so no replies textarea is shown.
  expect(screen.queryByLabelText(/replies/i)).toBeNull();
  expect(screen.queryByLabelText(/options/i)).toBeNull();
});

test("poll panel defaults to a regular anonymous poll with multiple-answers off", () => {
  renderInspector(makeFlow(), "poll1", null);
  expect(screen.getByLabelText("Poll type")).toHaveTextContent("Regular poll");
  expect(screen.getByText("Allow multiple answers")).toBeTruthy();
  // Regular polls do not show quiz-only fields.
  expect(screen.queryByLabelText(/correct option/i)).toBeNull();
  expect(screen.queryByLabelText(/explanation/i)).toBeNull();
});

test("switching the poll type to quiz reveals the quiz-only fields", async () => {
  renderWithProviders(<PollHarness onUpdate={() => {}} />);
  fireEvent.mouseDown(screen.getByLabelText("Poll type"));
  const quiz = await screen.findByRole("option", { name: "Quiz" });
  fireEvent.click(quiz);
  expect(screen.getByLabelText("Correct option (0-based)")).toBeTruthy();
  expect(screen.getByLabelText("Explanation (quiz)")).toBeTruthy();
  expect(screen.queryByText("Allow multiple answers")).toBeNull();
});

test("editing poll config fields dispatches onUpdate", async () => {
  const onUpdate = vi.fn();
  renderWithProviders(<PollHarness onUpdate={onUpdate} />);

  fireEvent.mouseDown(screen.getByLabelText("Poll type"));
  const quiz = await screen.findByRole("option", { name: "Quiz" });
  fireEvent.click(quiz);

  fireEvent.change(screen.getByLabelText("Correct option (0-based)"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("Explanation (quiz)"), {
    target: { value: "It is B" },
  });
  fireEvent.change(screen.getByLabelText("Open period (seconds, 5-600)"), {
    target: { value: "60" },
  });

  expect(onUpdate).toHaveBeenLastCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "poll1",
          data: expect.objectContaining({
            pollType: "quiz",
            correctOptionId: "1",
            explanation: "It is B",
            openPeriod: "60",
          }),
        }),
      ]),
    })
  );
});

test("toggling the anonymous switch dispatches isAnonymous", () => {
  const onUpdate = vi.fn();
  renderWithProviders(<PollHarness onUpdate={onUpdate} />);

  fireEvent.click(screen.getByRole("switch", { name: /Public \(not anonymous\)/ }));

  expect(onUpdate).toHaveBeenLastCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "poll1",
          data: expect.objectContaining({ isAnonymous: "false" }),
        }),
      ]),
    })
  );
});

test("toggling multiple answers dispatches allowsMultipleAnswers", () => {
  const onUpdate = vi.fn();
  renderWithProviders(<PollHarness onUpdate={onUpdate} />);

  fireEvent.click(screen.getByRole("switch", { name: "Allow multiple answers" }));

  expect(onUpdate).toHaveBeenLastCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "poll1",
          data: expect.objectContaining({ allowsMultipleAnswers: "true" }),
        }),
      ]),
    })
  );
});

test("editing the poll node label dispatches onUpdate", () => {
  const onUpdate = vi.fn();
  renderInspector(makeFlow(), "poll1", null, onUpdate);

  fireEvent.change(screen.getByLabelText("Node label"), {
    target: { value: "Renamed poll" },
  });

  expect(onUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          id: "poll1",
          data: expect.objectContaining({ label: "Renamed poll" }),
        }),
      ]),
    })
  );
});

// ----- Edge panel (read-only) -----

test("edge panel shows the read-only If branch caption", () => {
  renderInspector(makeFlow(), null, "e_if");
  expect(screen.getByText("Edge")).toBeTruthy();
  expect(screen.getByText("If branch (condition true)")).toBeTruthy();
  expect(screen.queryByLabelText(/trigger/i)).toBeNull();
  expect(screen.queryByRole("combobox")).toBeNull();
});

test("edge panel shows the read-only Else branch caption", () => {
  renderInspector(makeFlow(), null, "e_else");
  expect(screen.getByText("Else branch (condition false)")).toBeTruthy();
});

test("edge panel shows the generic Connection caption for plain edges", () => {
  renderInspector(makeFlow(), null, "e_plain");
  expect(screen.getByText("Connection")).toBeTruthy();
});

// ----- Auto-scroll -----

test("scrolls the panel into view when a node is selected", () => {
  const scrollSpy = vi.fn();
  Element.prototype.scrollIntoView = scrollSpy;
  const { rerender } = renderInspector(makeFlow(), null, null);

  expect(scrollSpy).not.toHaveBeenCalled();

  rerender(
    <FlowInspector
      flow={makeFlow()}
      selectedNodeId="condition1"
      selectedEdgeId={null}
      onUpdate={() => {}}
    />
  );

  expect(scrollSpy).toHaveBeenCalledTimes(1);
});

test("does not scroll the panel when selection is cleared", () => {
  const scrollSpy = vi.fn();
  Element.prototype.scrollIntoView = scrollSpy;
  const { rerender } = renderInspector(makeFlow(), "condition1", null);

  expect(scrollSpy).toHaveBeenCalledTimes(1);

  rerender(
    <FlowInspector
      flow={makeFlow()}
      selectedNodeId={null}
      selectedEdgeId={null}
      onUpdate={() => {}}
    />
  );

  expect(scrollSpy).toHaveBeenCalledTimes(1);
});

// ----- Label input keeps focus (regression for the deselect bug) -----

test("typing in the node label keeps the input focused after updates", () => {
  // The label field must stay MOUNTED across onUpdate-triggered re-renders.
  // A nested component definition would remount it and drop focus; the module
  // level LabelField keeps the same DOM node alive. We simulate the store
  // round-trip: onUpdate replaces the flow and re-renders the inspector.
  const Harness = () => {
    const [flow, setFlow] = React.useState(makeFlow());
    return (
      <FlowInspector
        flow={flow}
        selectedNodeId="start"
        selectedEdgeId={null}
        onUpdate={setFlow}
      />
    );
  };
  renderWithProviders(<Harness />);

  const input = screen.getByLabelText("Node label") as HTMLInputElement;
  input.focus();
  expect(document.activeElement).toBe(input);

  fireEvent.change(input, { target: { value: "R" } });
  expect(document.activeElement).toBe(screen.getByLabelText("Node label"));
});

// ----- Delete button -----

test("does not render a delete button when nothing is selected", () => {
  renderInspector(makeFlow(), null, null);
  expect(screen.queryByTestId("flow-inspector-delete")).toBeNull();
});

test("renders a delete button for a selected node and invokes onDelete", () => {
  const onDelete = vi.fn();
  renderInspector(makeFlow(), "condition1", null, () => {}, onDelete);

  const button = screen.getByTestId("flow-inspector-delete");
  expect(button.textContent).toContain("Delete node");
  fireEvent.click(button);
  expect(onDelete).toHaveBeenCalledTimes(1);
});

test("renders a delete button for a selected edge and invokes onDelete", () => {
  const onDelete = vi.fn();
  renderInspector(makeFlow(), null, "e_if", () => {}, onDelete);

  const button = screen.getByTestId("flow-inspector-delete");
  expect(button.textContent).toContain("Delete edge");
  fireEvent.click(button);
  expect(onDelete).toHaveBeenCalledTimes(1);
});

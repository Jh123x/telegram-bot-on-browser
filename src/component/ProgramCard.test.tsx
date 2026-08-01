import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen, within } from "@testing-library/react";
import { useSelector } from "react-redux";
import { ProgramCard } from "./ProgramCard";
import { renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { BotWithConfig } from "../redux/types.ts";
import { Program } from "../interfaces/program.ts";

const makeProgram = (): Program => ({
  id: "p1",
  name: "Greet",
  trigger: { type: "equals", value: "/start" },
  blocks: [
    {
      id: "b1",
      category: "action",
      kind: "reply",
      value: "hi",
      value2: "",
      fallback: "",
    },
  ],
});

const makeThreeBlockProgram = (): Program => ({
  id: "p1",
  name: "Greet",
  trigger: { type: "equals", value: "/start" },
  blocks: [
    {
      id: "b1",
      category: "action",
      kind: "reply",
      value: "hi",
      value2: "",
      fallback: "",
    },
    {
      id: "b2",
      category: "transform",
      kind: "uppercase",
      value: "",
      value2: "",
      fallback: "",
    },
    {
      id: "b3",
      category: "action",
      kind: "echo",
      value: "",
      value2: "",
      fallback: "",
    },
  ],
});

const blockIds = (program: Program): string[] =>
  program.blocks.map((b) => b.id);

const createDataTransfer = (payload: string) => ({
  setData: jest.fn(),
  getData: jest.fn(() => payload),
  dropEffect: "move",
  effectAllowed: "move",
} as unknown as DataTransfer);

const makeStore = (programs: Program[]) =>
  setupStore<BotWithConfig>({
    bot: { token: "", programs, response: [], users: [] },
  });

const renderCard = (program: Program, index: number, total: number) => {
  const store = makeStore([program]);
  const onMoveUp = jest.fn();
  const onMoveDown = jest.fn();
  const result = renderWithProviders(
    <ProgramCard
      program={program}
      index={index}
      total={total}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
    />,
    { store }
  );
  return { store, onMoveUp, onMoveDown, unmount: result.unmount };
};

test("renders program name, trigger select, trigger value, block label and value", () => {
  const p = makeProgram();
  renderCard(p, 0, 1);

  expect(screen.getByTestId("program-card-Greet")).toBeTruthy();
  expect(screen.getByTestId("trigger-zone-p1")).toBeTruthy();
  expect(screen.getByTestId("blocks-zone-p1")).toBeTruthy();

  const name = screen.getByLabelText("Program name") as HTMLInputElement;
  expect(name.value).toBe("Greet");

  const triggerValue = screen.getByLabelText("Trigger value") as HTMLInputElement;
  expect(triggerValue.value).toBe("/start");

  expect(screen.getByText("Action")).toBeTruthy();
  const actionValue = screen.getByLabelText("Response") as HTMLInputElement;
  expect(actionValue.value).toBe("hi");
});

test("block rows show a category chip and step number", () => {
  renderCard(makeProgram(), 0, 1);

  // Category label rendered inside the block row (chip).
  const zone = screen.getByTestId("blocks-zone-p1");
  expect(within(zone).getByText("Action")).toBeTruthy();
  // Step number showing pipeline order.
  expect(within(zone).getByText("1.")).toBeTruthy();
});

test("changing the name field dispatches updateProgram", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  fireEvent.change(screen.getByLabelText("Program name"), {
    target: { value: "NewName" },
  });
  expect(store.getState().bot.programs[0].name).toBe("NewName");
});

test("changing trigger value field dispatches update", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  fireEvent.change(screen.getByLabelText("Trigger value"), {
    target: { value: "/hello" },
  });
  expect(store.getState().bot.programs[0].trigger.value).toBe("/hello");
});

test("changing trigger select type to ends with dispatches update with value unchanged", async () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  fireEvent.mouseDown(within(screen.getByTestId("trigger-zone-p1")).getByRole("combobox"));
  const option = await screen.findByRole("option", {
    name: "message ends with",
  });
  fireEvent.click(option);
  const trigger = store.getState().bot.programs[0].trigger;
  expect(trigger.type).toBe("endsWith");
  expect(trigger.value).toBe("/start");
});

test("add logic appends a logic lengthGreater block", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  fireEvent.click(screen.getByRole("button", { name: "Add logic" }));
  const blocks = store.getState().bot.programs[0].blocks;
  expect(blocks).toHaveLength(2);
  expect(blocks[1].category).toBe("logic");
  expect(blocks[1].kind).toBe("lengthGreater");
});

test("add transform appends a transform uppercase block", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  fireEvent.click(screen.getByRole("button", { name: "Add transform" }));
  const blocks = store.getState().bot.programs[0].blocks;
  expect(blocks).toHaveLength(2);
  expect(blocks[1].category).toBe("transform");
  expect(blocks[1].kind).toBe("uppercase");
});

test("add reply/random/echo appends blocks", () => {
  const store = makeStore([makeProgram()]);

  // Render through a harness that (like the real ProgramEditor) subscribes to
  // the store and forwards the live program down as a prop, so each added
  // block is reflected in the card.
  const Harness = () => {
    const programs = useSelector<BotWithConfig, Program[]>(
      (state) => state.bot.programs
    );
    return (
      <ProgramCard
        program={programs[0]}
        index={0}
        total={1}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
      />
    );
  };
  renderWithProviders(<Harness />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Add reply" }));
  expect(store.getState().bot.programs[0].blocks).toHaveLength(2);
  expect(store.getState().bot.programs[0].blocks[1].kind).toBe("reply");

  fireEvent.click(screen.getByRole("button", { name: "Add random" }));
  expect(store.getState().bot.programs[0].blocks[2].kind).toBe("random");

  fireEvent.click(screen.getByRole("button", { name: "Add echo" }));
  expect(store.getState().bot.programs[0].blocks[3].kind).toBe("echo");
});

test("logic kind select change resets value, value2 and fallback", async () => {
  const p: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [
      {
        id: "b1",
        category: "logic",
        kind: "lengthLess",
        value: "5",
        value2: "",
        fallback: "Too long",
      },
    ],
  };
  const { store } = renderCard(p, 0, 1);
  const zone = screen.getByTestId("blocks-zone-p1");

  fireEvent.mouseDown(
    within(zone).getAllByRole("combobox")[0]
  );
  const option = await screen.findByRole("option", {
    name: "message matches regex",
  });
  fireEvent.click(option);

  const block = store.getState().bot.programs[0].blocks[0];
  expect(block.kind).toBe("matchesRegex");
  expect(block.value).toBe("");
  expect(block.value2).toBe("");
  expect(block.fallback).toBe("");
});

test("typing into logic Number field updates value", () => {
  const p: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [
      {
        id: "b1",
        category: "logic",
        kind: "lengthLess",
        value: "",
        value2: "",
        fallback: "",
      },
    ],
  };
  const { store } = renderCard(p, 0, 1);
  fireEvent.change(screen.getByLabelText("Number"), {
    target: { value: "7" },
  });
  expect(store.getState().bot.programs[0].blocks[0].value).toBe("7");
});

test("content-matching logic kinds render a Value field that updates value", () => {
  for (const kind of [
    "equals",
    "contains",
    "startsWith",
    "endsWith",
    "notEquals",
    "notContains",
  ] as const) {
    const p: Program = {
      id: "p1",
      name: "Greet",
      trigger: { type: "equals", value: "/start" },
      blocks: [
        {
          id: "b1",
          category: "logic",
          kind,
          value: "",
          value2: "",
          fallback: "",
        },
      ],
    };
    const { store, unmount } = renderCard(p, 0, 1);
    const valueField = screen.getByLabelText("Value");
    fireEvent.change(valueField, { target: { value: "hello" } });
    expect(store.getState().bot.programs[0].blocks[0].value).toBe("hello");
    unmount();
  }
});

test("Else reply fallback field updates fallback", () => {
  const p: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [
      {
        id: "b1",
        category: "logic",
        kind: "lengthLess",
        value: "5",
        value2: "",
        fallback: "",
      },
    ],
  };
  const { store } = renderCard(p, 0, 1);
  fireEvent.change(screen.getByLabelText("Else reply (optional)"), {
    target: { value: "Too long" },
  });
  expect(store.getState().bot.programs[0].blocks[0].fallback).toBe("Too long");
});

test("reply Response field is a multiline textarea", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  expect(screen.getByLabelText("Response").tagName).toBe("TEXTAREA");
});

test("typing a multi-line reply preserves newlines in the store", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  const textarea = screen.getByLabelText("Response");
  fireEvent.change(textarea, { target: { value: "line one\nline two" } });
  expect(store.getState().bot.programs[0].blocks[0].value).toBe(
    "line one\nline two"
  );
});

test("logic Else reply field is a multiline textarea and preserves newlines", () => {
  const p: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [
      {
        id: "b1",
        category: "logic",
        kind: "lengthLess",
        value: "5",
        value2: "",
        fallback: "",
      },
    ],
  };
  const { store } = renderCard(p, 0, 1);
  const fallbackField = screen.getByLabelText("Else reply (optional)");
  expect(fallbackField.tagName).toBe("TEXTAREA");
  fireEvent.change(fallbackField, { target: { value: "no\nway" } });
  expect(store.getState().bot.programs[0].blocks[0].fallback).toBe("no\nway");
});

test("replace block shows Find and Replace with fields and both update value and value2", () => {
  const p: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [
      {
        id: "b1",
        category: "transform",
        kind: "replace",
        value: "",
        value2: "",
        fallback: "",
      },
    ],
  };
  const { store } = renderCard(p, 0, 1);
  const findField = screen.getByLabelText("Find") as HTMLInputElement;
  const replaceWith = screen.getByLabelText("Replace with") as HTMLInputElement;
  expect(findField.value).toBe("");
  expect(replaceWith.value).toBe("");

  fireEvent.change(findField, { target: { value: "say " } });
  fireEvent.change(replaceWith, { target: { value: "" } });

  const block = store.getState().bot.programs[0].blocks[0];
  expect(block.value).toBe("say ");
  expect(block.value2).toBe("");
});

test("clicking delete block removes that block", () => {
  const p = makeProgram();
  p.blocks = [
    { id: "b1", category: "action", kind: "reply", value: "hi", value2: "", fallback: "" },
    { id: "b2", category: "action", kind: "echo", value: "", value2: "", fallback: "" },
  ];
  const { store } = renderCard(p, 0, 1);
  const zone = screen.getByTestId("blocks-zone-p1");
  fireEvent.click(within(zone).getAllByRole("button", { name: "Delete block" })[1]);
  const blocks = store.getState().bot.programs[0].blocks;
  expect(blocks).toHaveLength(1);
  expect(blocks[0].id).toBe("b1");
});

test("clicking Delete Program dispatches removeProgram", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  fireEvent.click(screen.getByRole("button", { name: "Delete Program" }));
  expect(store.getState().bot.programs).toHaveLength(0);
});

test("move up/down buttons call callbacks and disabled states are correct", () => {
  const p1 = makeProgram();
  const { onMoveUp, onMoveDown } = renderCard(p1, 0, 2);
  const upBtn = screen.getByRole("button", { name: "Move up" });
  const downBtn = screen.getByRole("button", { name: "Move down" });
  expect((upBtn as HTMLButtonElement).disabled).toBe(true);
  expect((downBtn as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(downBtn);
  expect(onMoveDown).toHaveBeenCalledWith("p1");

  const p2 = { ...p1, id: "p2", name: "Other" };
  const store2 = makeStore([p1, p2]);
  const onMoveUp2 = jest.fn();
  const onMoveDown2 = jest.fn();
  renderWithProviders(
    <ProgramCard
      program={p2}
      index={1}
      total={2}
      onMoveUp={onMoveUp2}
      onMoveDown={onMoveDown2}
    />,
    { store: store2 }
  );
  const card2 = screen.getByTestId("program-card-Other");
  const upBtn2 = within(card2).getByRole("button", { name: "Move up" });
  const downBtn2 = within(card2).getByRole("button", { name: "Move down" });
  expect((upBtn2 as HTMLButtonElement).disabled).toBe(false);
  expect((downBtn2 as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(upBtn2);
  expect(onMoveUp2).toHaveBeenCalledWith("p2");
});

test("renders a drag handle on each block row", () => {
  renderCard(makeThreeBlockProgram(), 0, 1);
  expect(screen.getAllByTestId(/^block-drag-handle-/)).toHaveLength(3);
});

test("dragging block b1 onto block b3 reorders blocks", () => {
  const p = makeThreeBlockProgram();
  const { store } = renderCard(p, 0, 1);
  const dt = createDataTransfer(JSON.stringify({ blockId: "b1" }));
  fireEvent.dragStart(screen.getByTestId("block-drag-handle-b1"), {
    dataTransfer: dt,
  });
  fireEvent.dragOver(screen.getByTestId("block-row-b3"), {
    dataTransfer: dt,
  });
  fireEvent.drop(screen.getByTestId("block-row-b3"), { dataTransfer: dt });
  expect(blockIds(store.getState().bot.programs[0])).toEqual([
    "b2",
    "b3",
    "b1",
  ]);
});

test("dragging block b3 onto block b1 reorders blocks", () => {
  const p = makeThreeBlockProgram();
  const { store } = renderCard(p, 0, 1);
  const dt = createDataTransfer(JSON.stringify({ blockId: "b3" }));
  fireEvent.dragStart(screen.getByTestId("block-drag-handle-b3"), {
    dataTransfer: dt,
  });
  fireEvent.dragOver(screen.getByTestId("block-row-b1"), {
    dataTransfer: dt,
  });
  fireEvent.drop(screen.getByTestId("block-row-b1"), { dataTransfer: dt });
  expect(blockIds(store.getState().bot.programs[0])).toEqual([
    "b3",
    "b1",
    "b2",
  ]);
});

test("dropping a block on itself keeps the order", () => {
  const p = makeThreeBlockProgram();
  const { store } = renderCard(p, 0, 1);
  const dt = createDataTransfer(JSON.stringify({ blockId: "b2" }));
  fireEvent.dragStart(screen.getByTestId("block-drag-handle-b2"), {
    dataTransfer: dt,
  });
  fireEvent.dragOver(screen.getByTestId("block-row-b2"), {
    dataTransfer: dt,
  });
  fireEvent.drop(screen.getByTestId("block-row-b2"), { dataTransfer: dt });
  expect(blockIds(store.getState().bot.programs[0])).toEqual([
    "b1",
    "b2",
    "b3",
  ]);
});

test("dropping with a malformed payload keeps the order", () => {
  const p = makeThreeBlockProgram();
  const { store } = renderCard(p, 0, 1);
  const dt = createDataTransfer("not-json");
  fireEvent.dragStart(screen.getByTestId("block-drag-handle-b1"), {
    dataTransfer: dt,
  });
  fireEvent.dragOver(screen.getByTestId("block-row-b3"), {
    dataTransfer: dt,
  });
  fireEvent.drop(screen.getByTestId("block-row-b3"), { dataTransfer: dt });
  expect(blockIds(store.getState().bot.programs[0])).toEqual([
    "b1",
    "b2",
    "b3",
  ]);
});

const getTransformProgram = (): Program => ({
  id: "p1",
  name: "Greet",
  trigger: { type: "equals", value: "/start" },
  blocks: [
    {
      id: "b1",
      category: "transform",
      kind: "uppercase",
      value: "",
      value2: "",
      fallback: "",
    },
    {
      id: "b2",
      category: "action",
      kind: "echo",
      value: "",
      value2: "",
      fallback: "",
    },
  ],
});

const getLogicProgram = (): Program => ({
  id: "p1",
  name: "Greet",
  trigger: { type: "equals", value: "/start" },
  blocks: [
    {
      id: "b1",
      category: "logic",
      kind: "lengthLess",
      value: "10",
      value2: "",
      fallback: "Too long",
    },
  ],
});

test("renders a value chip after a transform block showing the transformed preview", () => {
  renderCard(getTransformProgram(), 0, 1);
  expect(screen.getByTestId("value-hint-b1")).toBeTruthy();
  expect(screen.getByText("HELLO WORLD")).toBeTruthy();
});

test("renders an input port and an output port marker per block", () => {
  renderCard(getTransformProgram(), 0, 1);
  expect(screen.getByTestId("block-input-b1")).toBeTruthy();
  expect(screen.getByTestId("block-output-b1")).toBeTruthy();
  expect(screen.getByTestId("block-input-b2")).toBeTruthy();
  expect(screen.getByTestId("block-output-b2")).toBeTruthy();
});

test("logic node shows an else fallback hint", () => {
  renderCard(getLogicProgram(), 0, 1);
  expect(screen.getByTestId("value-hint-b1")).toBeTruthy();
  expect(screen.getByText(/else → Too long/)).toBeTruthy();
});

test("logic node shows else silent when no fallback is set", () => {
  const p = getLogicProgram();
  p.blocks[0].fallback = "";
  renderCard(p, 0, 1);
  expect(screen.getByText(/else → silent/)).toBeTruthy();
});

test("trigger node shows a user message input port and label", () => {
  renderCard(makeProgram(), 0, 1);
  expect(screen.getByTestId("trigger-input-p1")).toBeTruthy();
  expect(within(screen.getByTestId("trigger-zone-p1")).getByText("message")).toBeTruthy();
});

test("transform block renders a Variable name (optional) field", () => {
  renderCard(getTransformProgram(), 0, 1);
  const field = screen.getByLabelText("Variable name (optional)") as HTMLInputElement;
  expect(field).toBeTruthy();
  expect(field.value).toBe("");
});

test("typing into the Variable name field updates outputVar in the store", () => {
  const { store } = renderCard(getTransformProgram(), 0, 1);
  fireEvent.change(screen.getByLabelText("Variable name (optional)"), {
    target: { value: "shouted" },
  });
  expect(store.getState().bot.programs[0].blocks[0].outputVar).toBe("shouted");
});

test("value hint chip shows the variable binding when outputVar is set", () => {
  const p = getTransformProgram();
  p.blocks[0].outputVar = "shouted";
  renderCard(p, 0, 1);
  expect(screen.getByText("{shouted} = HELLO WORLD")).toBeTruthy();
});

test("replace block also renders the Variable name (optional) field", () => {
  const p: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [
      {
        id: "b1",
        category: "transform",
        kind: "replace",
        value: "",
        value2: "",
        fallback: "",
      },
    ],
  };
  renderCard(p, 0, 1);
  expect(screen.getByLabelText("Variable name (optional)")).toBeTruthy();
  expect(screen.getByLabelText("Find")).toBeTruthy();
  expect(screen.getByLabelText("Replace with")).toBeTruthy();
});

test("concat block shows Append and Prepend text fields", () => {
  const p = makeProgram();
  p.blocks = [
    {
      id: "b-concat",
      category: "transform",
      kind: "concat",
      value: "!",
      value2: "",
      fallback: "",
    },
  ];
  renderCard(p, 0, 1);

  expect(screen.getByLabelText("Append text")).toBeTruthy();
  expect(screen.getByLabelText("Prepend text")).toBeTruthy();
});

test("echo block shows a live preview of the message it will echo", () => {
  const p = makeProgram();
  p.blocks = [
    {
      id: "b-up",
      category: "transform",
      kind: "uppercase",
      value: "",
      value2: "",
      fallback: "",
    },
    {
      id: "b-echo",
      category: "action",
      kind: "echo",
      value: "",
      value2: "",
      fallback: "",
    },
  ];
  renderCard(p, 0, 1);

  // The flowing value after the uppercase transform is HELLO WORLD.
  expect(screen.getByText(/Echoes: "HELLO WORLD"/)).toBeTruthy();
});

test("variable name field shows a tooltip explaining how to use variables", async () => {
  const p = makeProgram();
  p.blocks = [
    {
      id: "b1",
      category: "transform",
      kind: "uppercase",
      value: "",
      value2: "",
      fallback: "",
    },
  ];
  renderCard(p, 0, 1);

  fireEvent.mouseOver(screen.getByLabelText("Variable name (optional)"));

  const tooltip = await screen.findByRole("tooltip");
  expect(tooltip.textContent).toContain("{name}");
  expect(tooltip.textContent).toContain("{prev}");
});

test("transform hint chip shows a tooltip when a variable is bound", async () => {
  const p = makeProgram();
  p.blocks = [
    {
      id: "b1",
      category: "transform",
      kind: "uppercase",
      value: "",
      value2: "",
      fallback: "",
      outputVar: "shouted",
    },
  ];
  renderCard(p, 0, 1);

  const chip = screen.getByTestId("value-hint-b1").firstElementChild!;
  fireEvent.mouseOver(chip);

  const tooltip = await screen.findByRole("tooltip");
  expect(tooltip.textContent).toContain("{shouted}");
});

test("changing trigger select type to message does not equal dispatches update with value unchanged", async () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  fireEvent.mouseDown(within(screen.getByTestId("trigger-zone-p1")).getByRole("combobox"));
  const option = await screen.findByRole("option", {
    name: "message does not equal",
  });
  fireEvent.click(option);
  const trigger = store.getState().bot.programs[0].trigger;
  expect(trigger.type).toBe("notEquals");
  expect(trigger.value).toBe("/start");
});

test("remove transform block renders a Remove text input and updates value", () => {
  const p: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [
      {
        id: "b1",
        category: "transform",
        kind: "remove",
        value: "",
        value2: "",
        fallback: "",
      },
    ],
  };
  const { store } = renderCard(p, 0, 1);
  const removeField = screen.getByLabelText("Remove text") as HTMLInputElement;
  expect(removeField.value).toBe("");

  fireEvent.change(removeField, { target: { value: "l" } });

  const block = store.getState().bot.programs[0].blocks[0];
  expect(block.value).toBe("l");
});

test("isNumber logic block renders (no value needed) and the Else reply fallback field", () => {
  const p: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [
      {
        id: "b1",
        category: "logic",
        kind: "isNumber",
        value: "",
        value2: "",
        fallback: "Not a number",
      },
    ],
  };
  renderCard(p, 0, 1);
  expect(screen.getByText("(no value needed)")).toBeTruthy();
  expect(screen.getByLabelText("Else reply (optional)")).toBeTruthy();
});

test("lengthEquals logic block renders a Number input (not a Regex input)", () => {
  const p: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [
      {
        id: "b1",
        category: "logic",
        kind: "lengthEquals",
        value: "5",
        value2: "",
        fallback: "",
      },
    ],
  };
  const { store } = renderCard(p, 0, 1);
  const numberField = screen.getByLabelText("Number") as HTMLInputElement;
  expect(numberField.value).toBe("5");
  expect(screen.queryByLabelText("Regex")).toBeNull();

  fireEvent.change(numberField, { target: { value: "7" } });
  expect(store.getState().bot.programs[0].blocks[0].value).toBe("7");
});

test("remove transform value hint chip shows the preview with matches stripped", () => {
  const p: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [
      {
        id: "b1",
        category: "transform",
        kind: "remove",
        value: "l",
        value2: "",
        fallback: "",
      },
    ],
  };
  renderCard(p, 0, 1);
  expect(screen.getByTestId("value-hint-b1")).toBeTruthy();
  expect(screen.getByText("Heo Word")).toBeTruthy();
});

test("capitalize/titleCase/reverse transform blocks render (no value needed) and the Variable name field", () => {
  for (const kind of ["capitalize", "titleCase", "reverse"] as const) {
    const p: Program = {
      id: "p1",
      name: "Greet",
      trigger: { type: "equals", value: "/start" },
      blocks: [
        {
          id: "b1",
          category: "transform",
          kind,
          value: "",
          value2: "",
          fallback: "",
        },
      ],
    };
    const store = makeStore([p]);
    const { unmount } = renderWithProviders(
      <ProgramCard
        program={p}
        index={0}
        total={1}
        onMoveUp={jest.fn()}
        onMoveDown={jest.fn()}
      />,
      { store }
    );
    expect(screen.getByText("(no value needed)")).toBeTruthy();
    expect(screen.getByLabelText("Variable name (optional)")).toBeTruthy();
    expect(screen.queryByLabelText("Remove text")).toBeNull();
    unmount();
  }
});

test("empty program card points to the add buttons instead of dragging", () => {
  const p: Program = {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    blocks: [],
  };
  renderCard(p, 0, 1);

  expect(
    screen.getByText(/No blocks yet — use the buttons below to add/i)
  ).toBeTruthy();
  expect(screen.queryByText(/drag/i)).toBeNull();
  expect(screen.getByRole("button", { name: "Add logic" })).toBeTruthy();
});

test("renders move up/down buttons on every block row", () => {
  renderCard(makeThreeBlockProgram(), 0, 1);
  expect(screen.getAllByRole("button", { name: "Move block up" })).toHaveLength(3);
  expect(screen.getAllByRole("button", { name: "Move block down" })).toHaveLength(3);
});

test("first block up and last block down buttons are disabled", () => {
  renderCard(makeThreeBlockProgram(), 0, 1);
  const firstRow = screen.getByTestId("block-row-b1");
  const lastRow = screen.getByTestId("block-row-b3");
  const midRow = screen.getByTestId("block-row-b2");
  const firstUp = within(firstRow).getByRole("button", { name: "Move block up" });
  const firstDown = within(firstRow).getByRole("button", { name: "Move block down" });
  const midUp = within(midRow).getByRole("button", { name: "Move block up" });
  const midDown = within(midRow).getByRole("button", { name: "Move block down" });
  const lastUp = within(lastRow).getByRole("button", { name: "Move block up" });
  const lastDown = within(lastRow).getByRole("button", { name: "Move block down" });
  expect((firstUp as HTMLButtonElement).disabled).toBe(true);
  expect((firstDown as HTMLButtonElement).disabled).toBe(false);
  expect((midUp as HTMLButtonElement).disabled).toBe(false);
  expect((midDown as HTMLButtonElement).disabled).toBe(false);
  expect((lastUp as HTMLButtonElement).disabled).toBe(false);
  expect((lastDown as HTMLButtonElement).disabled).toBe(true);
});

test("single-block program disables both move up and move down buttons", () => {
  renderCard(makeProgram(), 0, 1);
  const row = screen.getByTestId("block-row-b1");
  const up = within(row).getByRole("button", { name: "Move block up" });
  const down = within(row).getByRole("button", { name: "Move block down" });
  expect((up as HTMLButtonElement).disabled).toBe(true);
  expect((down as HTMLButtonElement).disabled).toBe(true);
});

test("clicking move up on the second block reorders blocks", () => {
  const { store } = renderCard(makeThreeBlockProgram(), 0, 1);
  const secondRow = screen.getByTestId("block-row-b2");
  fireEvent.click(
    within(secondRow).getByRole("button", { name: "Move block up" })
  );
  const program = store.getState().bot.programs[0];
  expect(blockIds(program)).toEqual(["b2", "b1", "b3"]);
});

test("clicking move down on the first block reorders blocks", () => {
  const { store } = renderCard(makeThreeBlockProgram(), 0, 1);
  const firstRow = screen.getByTestId("block-row-b1");
  fireEvent.click(
    within(firstRow).getByRole("button", { name: "Move block down" })
  );
  const program = store.getState().bot.programs[0];
  expect(blockIds(program)).toEqual(["b2", "b1", "b3"]);
});

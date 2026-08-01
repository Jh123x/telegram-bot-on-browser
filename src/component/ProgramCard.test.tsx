import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen, within } from "@testing-library/react";
import { ProgramCard } from "./ProgramCard";
import { renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { BotWithConfig } from "../redux/types.ts";
import { Program } from "../interfaces/program.ts";

const createDataTransfer = (payload: string) =>
  ({
    setData: jest.fn(),
    getData: jest.fn(() => payload),
    dropEffect: "move",
    effectAllowed: "move",
  } as unknown as DataTransfer);

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

const makeStore = (programs: Program[]) =>
  setupStore<BotWithConfig>({
    bot: { token: "", programs, response: [], users: [] },
  });

const renderCard = (program: Program, index: number, total: number) => {
  const store = makeStore([program]);
  const onMoveUp = jest.fn();
  const onMoveDown = jest.fn();
  renderWithProviders(
    <ProgramCard
      program={program}
      index={index}
      total={total}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
    />,
    { store }
  );
  return { store, onMoveUp, onMoveDown };
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
  const { store } = renderCard(makeProgram(), 0, 1);
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

test("dropping a trigger block updates trigger type keeping value", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  const paper = screen.getByTestId("program-card-Greet");
  fireEvent.drop(paper, {
    dataTransfer: createDataTransfer(
      JSON.stringify({ kind: "trigger", type: "contains" })
    ),
  });
  const trigger = store.getState().bot.programs[0].trigger;
  expect(trigger.type).toBe("contains");
  expect(trigger.value).toBe("/start");
});

test("dropping a trigger endsWith block updates trigger type", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  const paper = screen.getByTestId("program-card-Greet");
  fireEvent.drop(paper, {
    dataTransfer: createDataTransfer(
      JSON.stringify({ kind: "trigger", type: "endsWith" })
    ),
  });
  expect(store.getState().bot.programs[0].trigger.type).toBe("endsWith");
});

test("dropping a block payload appends a block with correct category and kind", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  const paper = screen.getByTestId("program-card-Greet");
  fireEvent.drop(paper, {
    dataTransfer: createDataTransfer(
      JSON.stringify({ kind: "block", category: "logic", type: "lengthGreater" })
    ),
  });
  const blocks = store.getState().bot.programs[0].blocks;
  expect(blocks).toHaveLength(2);
  expect(blocks[1].category).toBe("logic");
  expect(blocks[1].kind).toBe("lengthGreater");

  fireEvent.drop(paper, {
    dataTransfer: createDataTransfer(
      JSON.stringify({ kind: "block", category: "transform", type: "replace" })
    ),
  });
  const blocks2 = store.getState().bot.programs[0].blocks;
  expect(blocks2).toHaveLength(3);
  expect(blocks2[2].category).toBe("transform");
  expect(blocks2[2].kind).toBe("replace");
});

test("dropping an action block payload appends an action block", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  const paper = screen.getByTestId("program-card-Greet");
  fireEvent.drop(paper, {
    dataTransfer: createDataTransfer(
      JSON.stringify({ kind: "block", category: "action", type: "random" })
    ),
  });
  const blocks = store.getState().bot.programs[0].blocks;
  expect(blocks).toHaveLength(2);
  expect(blocks[1].category).toBe("action");
  expect(blocks[1].kind).toBe("random");
  expect(blocks[1].value).toBe("");
});

test("dropping malformed JSON does not crash and state unchanged", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  const paper = screen.getByTestId("program-card-Greet");
  expect(() =>
    fireEvent.drop(paper, { dataTransfer: createDataTransfer("not-json") })
  ).not.toThrow();
  expect(store.getState().bot.programs[0].trigger.type).toBe("equals");
  expect(store.getState().bot.programs[0].blocks).toHaveLength(1);
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

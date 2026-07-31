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
  actions: [{ id: "a1", type: "reply", value: "hi" }],
});

const makeStore = (programs: Program[]) =>
  setupStore<BotWithConfig>({
    bot: { token: "", programs, response: [], users: [] },
  });

const renderCard = (
  program: Program,
  index: number,
  total: number
) => {
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

test("renders program name, trigger select, trigger value, action label and value", () => {
  const p = makeProgram();
  renderCard(p, 0, 1);

  expect(screen.getByTestId("program-card-Greet")).toBeTruthy();
  expect(screen.getByTestId("trigger-zone-p1")).toBeTruthy();
  expect(screen.getByTestId("actions-zone-p1")).toBeTruthy();

  const name = screen.getByLabelText("Program name") as HTMLInputElement;
  expect(name.value).toBe("Greet");

  const triggerValue = screen.getByLabelText("Trigger value") as HTMLInputElement;
  expect(triggerValue.value).toBe("/start");

  expect(screen.getByText("reply with text")).toBeTruthy();
  const actionValue = screen.getByLabelText("Response") as HTMLInputElement;
  expect(actionValue.value).toBe("hi");
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

test("changing trigger select type dispatches update with value unchanged", async () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  fireEvent.mouseDown(screen.getByRole("combobox"));
  const option = await screen.findByRole("option", { name: "message contains" });
  fireEvent.click(option);
  const trigger = store.getState().bot.programs[0].trigger;
  expect(trigger.type).toBe("contains");
  expect(trigger.value).toBe("/start");
});

test("add reply/random/echo appends actions", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  fireEvent.click(screen.getByRole("button", { name: "Add reply" }));
  expect(store.getState().bot.programs[0].actions).toHaveLength(2);
  expect(store.getState().bot.programs[0].actions[1].type).toBe("reply");

  fireEvent.click(screen.getByRole("button", { name: "Add random" }));
  expect(store.getState().bot.programs[0].actions[2].type).toBe("random");

  fireEvent.click(screen.getByRole("button", { name: "Add echo" }));
  expect(store.getState().bot.programs[0].actions[3].type).toBe("echo");
});

test("clicking delete action removes that action", () => {
  const p = makeProgram();
  p.actions = [
    { id: "a1", type: "reply", value: "hi" },
    { id: "a2", type: "echo", value: "" },
  ];
  const { store } = renderCard(p, 0, 1);
  fireEvent.click(screen.getByRole("button", { name: "Delete action 2" }));
  const actions = store.getState().bot.programs[0].actions;
  expect(actions).toHaveLength(1);
  expect(actions[0].id).toBe("a1");
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

  // second instance at index 1 of 2 -> move down disabled
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

test("dropping an action block appends an action with empty value", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  const paper = screen.getByTestId("program-card-Greet");
  fireEvent.drop(paper, {
    dataTransfer: createDataTransfer(
      JSON.stringify({ kind: "action", type: "random" })
    ),
  });
  const actions = store.getState().bot.programs[0].actions;
  expect(actions).toHaveLength(2);
  expect(actions[1].type).toBe("random");
  expect(actions[1].value).toBe("");
});

test("dropping malformed JSON does not crash and state unchanged", () => {
  const { store } = renderCard(makeProgram(), 0, 1);
  const paper = screen.getByTestId("program-card-Greet");
  expect(() =>
    fireEvent.drop(paper, { dataTransfer: createDataTransfer("not-json") })
  ).not.toThrow();
  expect(store.getState().bot.programs[0].trigger.type).toBe("equals");
  expect(store.getState().bot.programs[0].actions).toHaveLength(1);
});

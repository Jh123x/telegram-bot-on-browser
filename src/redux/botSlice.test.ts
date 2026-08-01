import { test, expect } from "@jest/globals";
import { configureStore } from "@reduxjs/toolkit";
import { botSlice, defaultBotState } from "./botSlice";
import { BotWithConfig } from "./types";
import { Program } from "../interfaces/program";

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: "p1",
    name: "Greet",
    trigger: { type: "equals", value: "/start" },
    actions: [{ id: "a1", type: "reply", value: "hi" }],
    ...overrides,
  };
}

function setupStore(preloadedState?) {
  return configureStore<BotWithConfig>({
    reducer: { bot: botSlice.reducer },
    preloadedState: preloadedState ?? { bot: defaultBotState },
  });
}

test("default state has empty programs", () => {
  const store = setupStore();
  expect(store.getState().bot.programs).toEqual([]);
});

test("setPrograms replaces the programs array", () => {
  const store = setupStore();
  const programs: Program[] = [makeProgram(), makeProgram({ id: "p2" })];
  store.dispatch(botSlice.actions.setPrograms(programs));
  expect(store.getState().bot.programs).toEqual(programs);
});

test("addProgram appends a program", () => {
  const store = setupStore();
  store.dispatch(botSlice.actions.addProgram(makeProgram()));
  expect(store.getState().bot.programs).toEqual([makeProgram()]);
});

test("updateProgram replaces the program with matching id and leaves others", () => {
  const store = setupStore();
  store.dispatch(
    botSlice.actions.setPrograms([
      makeProgram(),
      makeProgram({ id: "p2", name: "Other" }),
    ])
  );
  store.dispatch(
    botSlice.actions.updateProgram(
      makeProgram({ id: "p1", name: "Updated", trigger: { type: "contains", value: "/help" } })
    )
  );
  const state = store.getState().bot.programs;
  expect(state).toHaveLength(2);
  expect(state[0].name).toBe("Updated");
  expect(state[0].trigger).toEqual({ type: "contains", value: "/help" });
  expect(state[1].name).toBe("Other");
});

test("updateProgram with unknown id leaves state unchanged", () => {
  const store = setupStore();
  const programs = [makeProgram()];
  store.dispatch(botSlice.actions.setPrograms(programs));
  store.dispatch(botSlice.actions.updateProgram(makeProgram({ id: "unknown" })));
  expect(store.getState().bot.programs).toEqual(programs);
});

test("removeProgram removes the program by id", () => {
  const store = setupStore();
  store.dispatch(
    botSlice.actions.setPrograms([
      makeProgram(),
      makeProgram({ id: "p2", name: "Other" }),
    ])
  );
  store.dispatch(botSlice.actions.removeProgram("p1"));
  const state = store.getState().bot.programs;
  expect(state).toHaveLength(1);
  expect(state[0].id).toBe("p2");
});

test("setSelectedUserId stores the selected user id", () => {
  const store = setupStore();
  expect(store.getState().bot.selectedUserId).toBeNull();

  store.dispatch(botSlice.actions.setSelectedUserId(42));
  expect(store.getState().bot.selectedUserId).toBe(42);

  store.dispatch(botSlice.actions.setSelectedUserId(null));
  expect(store.getState().bot.selectedUserId).toBeNull();
});

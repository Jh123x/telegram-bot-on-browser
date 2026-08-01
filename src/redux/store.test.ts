import { test, expect } from "@jest/globals";
import { store } from "./store.ts";
import { botSlice } from "./botSlice.ts";

test("the real store initializes the bot slice to the default state", () => {
  expect(store.getState().bot).toBeDefined();
  expect(store.getState().bot.token).toBe("");
  expect(store.getState().bot.flows).toEqual([]);
  expect(store.getState().bot.users).toEqual([]);
  expect(store.getState().bot.hydrated).toBe(false);
});

test("setToken dispatches and reduces through the real store", () => {
  store.dispatch(botSlice.actions.setToken("abc:secret"));
  expect(store.getState().bot.token).toBe("abc:secret");

  store.dispatch(botSlice.actions.resetAll());
  expect(store.getState().bot.token).toBe("");
});

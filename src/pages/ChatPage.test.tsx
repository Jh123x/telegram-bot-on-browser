import { test, expect } from "@jest/globals";
import React from "react";
import { screen } from "@testing-library/react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { ChatPage } from "./ChatPage.tsx";
import { BrowserBot } from "../interfaces/bot";

beforeEach(() => {
  (global as any).Worker = class {
    postMessage() {}
    terminate() {}
  };
});

afterEach(() => {
  delete (global as any).Worker;
});

test("renders the chat page with custom message and log box", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<ChatPage bot={new BrowserBot("TOKEN")} />, { store });

  expect(screen.getByText("Send a Custom message")).toBeTruthy();
  expect(screen.getByText("Date")).toBeTruthy();
  expect(screen.getByText("Message")).toBeTruthy();
});

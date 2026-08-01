import { test, expect } from "@jest/globals";
import React from "react";
import { screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { SettingsPage } from "./SettingsPage.tsx";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

test("renders the settings page title and the token input", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<SettingsPage />, { store });

  expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "API Token" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
});

test("renders the token value from the store in the input", () => {
  const store = setupStore({
    bot: { token: "abc:TOKEN", programs: [], response: [], users: [] },
  });
  renderWithProviders(<SettingsPage />, { store });

  expect(screen.getByDisplayValue("abc:TOKEN")).toBeTruthy();
});

test("renders the iOS-style BOT section header", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<SettingsPage />, { store });

  expect(screen.getByText("BOT")).toBeTruthy();
});

test("renders the token input and Save button as rows inside the grouped card", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<SettingsPage />, { store });

  // The API Token input (a password field) and the Save button are both present as rows.
  expect(screen.getByPlaceholderText("Enter your API token")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
});

test("renders the localStorage caption below the card", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<SettingsPage />, { store });

  expect(screen.getByText(/stored locally in your browser/i)).toBeTruthy();
});

test("clicking Save writes the current token from the store to localStorage", () => {
  const store = setupStore({
    bot: { token: "ios:persist", programs: [], response: [], users: [] },
  });
  renderWithProviders(<SettingsPage />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(localStorage.getItem("token")).toBe("ios:persist");
});

test("renders the new settings controls", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<SettingsPage />, { store });

  expect(screen.getByText("Auto start bot on load")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Export settings" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Import settings" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Reset to default" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /☕ Buy me a coffee/i })).toBeTruthy();
});

import { test, expect } from "@jest/globals";
import React from "react";
import { screen } from "@testing-library/react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { SettingsPage } from "./SettingsPage.tsx";

test("renders the settings page with the token input", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<SettingsPage />, { store });

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

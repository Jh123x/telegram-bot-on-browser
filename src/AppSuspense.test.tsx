import { vi, test, expect, beforeEach } from "vitest";
// A module that never resolves: the lazy import stays pending forever, so the
// Suspense fallback must remain visible. This deterministically exercises the
// loading state without racing the real chunk transform. The mock is scoped
// to this file — the SettingsPage module is real everywhere else.
vi.mock("./pages/SettingsPage.tsx", () => new Promise(() => {}));

import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import {
  generateDefaultState,
  renderWithProviders,
  setupStore,
} from "./redux/testUtils.tsx";
import App from "./App.tsx";

beforeEach(() => {
  localStorage.clear();
});

test("shows the page skeleton while a lazy page chunk is loading", async () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<App />, { store });

  fireEvent.click(screen.getByRole("tab", { name: "Settings" }));

  // The fallback skeleton is visible while the chunk is pending...
  expect(screen.getByTestId("page-skeleton")).toBeTruthy();
  expect(screen.getByTestId("page-skeleton-settings")).toBeTruthy();

  // ...and stays visible even after a tick (the chunk never arrives here, so
  // the app must keep showing the skeleton instead of a blank area).
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(screen.getByTestId("page-skeleton-settings")).toBeTruthy();
});

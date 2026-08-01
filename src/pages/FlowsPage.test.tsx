import { test, expect } from "@jest/globals";
import React from "react";
import { screen } from "@testing-library/react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { FlowsPage } from "./FlowsPage.tsx";

test("renders the Flows page with the graph editor", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<FlowsPage />, { store });

  expect(screen.getByTestId("flow-editor")).toBeTruthy();
});

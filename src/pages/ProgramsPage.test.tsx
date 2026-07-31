import { test, expect } from "@jest/globals";
import React from "react";
import { screen } from "@testing-library/react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { ProgramsPage } from "./ProgramsPage.tsx";

test("renders the programs page with the Blocks palette", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<ProgramsPage />, { store });

  expect(screen.getByText("Programs")).toBeTruthy();
  expect(screen.getByText("Blocks")).toBeTruthy();
});

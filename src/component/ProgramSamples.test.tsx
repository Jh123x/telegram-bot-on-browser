import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { ProgramSamples } from "./ProgramSamples";
import {
  generateDefaultState,
  renderWithProviders,
  setupStore,
} from "../redux/testUtils.tsx";

test("renders all sample names", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<ProgramSamples />, { store });

  expect(screen.getByText("Samples")).toBeInTheDocument();
  expect(
    screen.getByText("Click a sample to add it as a program.")
  ).toBeInTheDocument();

  for (const name of ["Welcome", "Coin Flip", "Help", "Echo Clean", "Shout", "Shout Back", "Short Replies", "Only Numbers", "Title Case", "Palindrome", "Capitalize"]) {
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  }
});

test("lays out sample buttons with a gap so they do not touch each other", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<ProgramSamples />, { store });

  const container = screen.getByTestId("samples-buttons");
  expect(container).toHaveStyle({ display: "flex" });
  expect(container).toHaveStyle({ gap: "8px" });
});

test("clicking Coin Flip dispatches addProgram with a fresh program", () => {
  const store = setupStore(generateDefaultState());
  renderWithProviders(<ProgramSamples />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Coin Flip" }));

  const programs = store.getState().bot.programs;
  expect(programs).toHaveLength(1);
  expect(programs[0].name).toBe("Coin Flip");
  expect(programs[0].trigger).toEqual({ type: "equals", value: "/flip" });
  expect(programs[0].blocks[0].id).not.toBe("sample-flip");
  expect(programs[0].blocks[0]).toMatchObject({
    category: "action",
    kind: "random",
    value: "Heads\nTails",
  });
});

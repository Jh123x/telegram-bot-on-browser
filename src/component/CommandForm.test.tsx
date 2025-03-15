import { test, expect } from "@jest/globals";
import React from "react";
import { CommandForm } from "./CommandForm.tsx";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";

test("renders command form correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<CommandForm />, { store: store });
    expect(component).toMatchSnapshot();
});

import { test, expect } from "@jest/globals";
import React from "react";
import { CommandTable } from "./CommandTable.tsx";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";

test("renders command table interface correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<CommandTable />, { store: store });
    expect(component).toMatchSnapshot();
});

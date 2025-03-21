import { test, expect } from "@jest/globals";
import React from "react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { LogBox } from "./logs.tsx";

test("renders log box interface correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<LogBox />, { store: store });
    expect(component).toMatchSnapshot();
});

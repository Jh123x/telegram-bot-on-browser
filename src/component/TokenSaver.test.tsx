import { test, expect } from "@jest/globals";
import React from "react";
import { TokenSaver } from "./TokenSaver";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";

test("renders token saver interface correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<TokenSaver />, { store: store });
    expect(component).toMatchSnapshot();
});

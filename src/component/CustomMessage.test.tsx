import { test, expect } from "@jest/globals";
import React from "react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { CustomChat } from "./CustomMessage.tsx";

test("renders custom chat interface correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<CustomChat />, { store: store });
    expect(component).toMatchSnapshot();
});

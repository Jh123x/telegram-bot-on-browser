import { test, expect } from "@jest/globals";
import React from "react";
import { BotInterface } from "./BotInterface";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";

test("renders bot interface correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<BotInterface />, { store: store });
    expect(component).toMatchSnapshot();
});

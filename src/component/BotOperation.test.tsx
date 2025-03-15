import { test, expect } from "@jest/globals";
import React from "react";
import { BotOperation } from "./BotOperation.tsx";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";

test("renders bot operation interface correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<BotOperation />, { store: store });
    expect(component).toMatchSnapshot();
});

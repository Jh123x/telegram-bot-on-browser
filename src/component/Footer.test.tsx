import { test, expect } from "@jest/globals";
import React from "react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { Footer } from "./Footer.tsx";

test("renders footer correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<Footer />, { store: store });
    expect(component).toMatchSnapshot();
});

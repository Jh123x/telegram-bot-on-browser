import { test, expect } from "@jest/globals";
import React from "react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { Navbar } from "./Navbar.tsx";

test("renders navbar correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<Navbar />, { store: store });
    expect(component).toMatchSnapshot();
});

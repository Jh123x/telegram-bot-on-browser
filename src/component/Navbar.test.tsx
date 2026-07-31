import { test, expect } from "@jest/globals";
import React from "react";
import { screen } from "@testing-library/react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { Navbar } from "./Navbar.tsx";

test("renders navbar correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<Navbar />, { store: store });
    expect(component).toMatchSnapshot();
});

test("renders the brand title", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<Navbar />, { store: store });

    expect(screen.getByText("BrowserBot")).toBeInTheDocument();
});

test("renders the brand title as a heading", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<Navbar />, { store: store });

    const title = screen.getByText("BrowserBot");
    expect(title.tagName).toBe("H6");
});

test("navbar has no navigation links", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<Navbar />, { store: store });

    expect(screen.queryAllByRole("link")).toHaveLength(0);
});

import { test, expect } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { Footer } from "./Footer.tsx";

test("renders footer correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<Footer />, { store: store });
    expect(component).toMatchSnapshot();
});

test("renders the copyright text", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<Footer />, { store: store });

    expect(screen.getByText(/Copyright ©/)).toBeInTheDocument();
});

test("renders the author link with the correct href", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<Footer />, { store: store });

    const authorLink = screen.getByRole("link", { name: "Jh123x" });
    expect(authorLink).toBeInTheDocument();
    expect(authorLink).toHaveAttribute("href", "https://jh123x.com/");
});

test("renders the current year", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<Footer />, { store: store });

    const year = String(new Date().getFullYear());
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
});

test("footer renders exactly one link", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<Footer />, { store: store });

    expect(screen.getAllByRole("link")).toHaveLength(1);
});

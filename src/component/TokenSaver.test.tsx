import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { TokenSaver } from "./TokenSaver";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";

const tokenInput = () =>
    screen.getByPlaceholderText("Enter your API token") as HTMLInputElement;

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    localStorage.clear();
});

test("renders token saver interface correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<TokenSaver />, { store: store });
    expect(component).toMatchSnapshot();
});

test("typing into the token field dispatches setToken to the store", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<TokenSaver />, { store });

    fireEvent.change(tokenInput(), { target: { value: "123:MY-TOKEN" } });

    expect(store.getState().bot.token).toBe("123:MY-TOKEN");
});

test("clicking Save writes the current token to localStorage", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<TokenSaver />, { store });

    fireEvent.change(tokenInput(), { target: { value: "abc:persist-me" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(localStorage.getItem("token")).toBe("abc:persist-me");
});

test("preloaded token is rendered in the token field", () => {
    const store = setupStore({
        bot: { token: "preloaded-token", response: [], users: [] },
    });
    renderWithProviders(<TokenSaver />, { store });

    expect(tokenInput().value).toBe("preloaded-token");
});

test("renders the iOS-style BOT section header", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<TokenSaver />, { store });

    expect(screen.getByText("BOT")).toBeTruthy();
});

test("renders the localStorage caption below the card", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<TokenSaver />, { store });

    expect(screen.getByText(/stored locally in your browser/i)).toBeTruthy();
});

test("token input is masked with type password by default", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<TokenSaver />, { store });

    expect(tokenInput().type).toBe("password");
    expect(screen.getByRole("button", { name: "Show" })).toBeTruthy();
});

test("clicking Show reveals the token as text", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<TokenSaver />, { store });

    fireEvent.click(screen.getByRole("button", { name: "Show" }));

    expect(tokenInput().type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide" })).toBeTruthy();
});

test("clicking Hide masks the token again", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<TokenSaver />, { store });

    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(tokenInput().type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(tokenInput().type).toBe("password");
});

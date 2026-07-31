import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { TokenSaver } from "./TokenSaver";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";

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

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "123:MY-TOKEN" } });

    expect(store.getState().bot.token).toBe("123:MY-TOKEN");
});

test("clicking Save writes the current token to localStorage", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<TokenSaver />, { store });

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "abc:persist-me" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(localStorage.getItem("token")).toBe("abc:persist-me");
});

test("preloaded token is rendered in the token field", () => {
    const store = setupStore({
        bot: { token: "preloaded-token", programs: [], response: [], users: [] },
    });
    renderWithProviders(<TokenSaver />, { store });

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("preloaded-token");
});

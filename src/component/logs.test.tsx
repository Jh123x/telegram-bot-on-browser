import { test, expect } from "@jest/globals";
import React from "react";
import { screen } from "@testing-library/react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { LogBox } from "./logs.tsx";

test("renders log box interface correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<LogBox />, { store: store });
    expect(component).toMatchSnapshot();
});

test("renders response entries with user and message from the store", () => {
    const store = setupStore({
        bot: {
            token: "TOKEN",
            commands: [],
            response: [
                { FromUser: "alice", UserID: 42, Message: "hello there", TimeStamp: 1720000000000 },
                { FromUser: "bob", UserID: 7, Message: "bonjour", TimeStamp: 1720000001000 },
            ],
            users: [],
        },
    });
    renderWithProviders(<LogBox />, { store });

    expect(screen.getByText("alice")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText("hello there")).toBeTruthy();
    expect(screen.getByText("bob")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("bonjour")).toBeTruthy();
});

test("renders the header labels date, user, user id, message", () => {
    const store = setupStore(generateDefaultState());
    renderWithProviders(<LogBox />, { store });

    expect(screen.getByText("Date")).toBeTruthy();
    expect(screen.getByText("User")).toBeTruthy();
    expect(screen.getByText("UserID")).toBeTruthy();
    expect(screen.getByText("Message")).toBeTruthy();
});

test("renders the ISO timestamp of each response", () => {
    const store = setupStore({
        bot: {
            token: "TOKEN",
            commands: [],
            response: [
                { FromUser: "alice", UserID: 42, Message: "hi", TimeStamp: 1720000000000 },
            ],
            users: [],
        },
    });
    renderWithProviders(<LogBox />, { store });

    expect(screen.getByText(new Date(1720000000000).toISOString())).toBeTruthy();
});

test("shows no user rows when the response list is empty", () => {
    const store = setupStore(generateDefaultState());
    const { container } = renderWithProviders(<LogBox />, { store });

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(0);
});

import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { generateDefaultState, renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { CustomChat } from "./CustomMessage.tsx";
import { BrowserBot } from "../interfaces/bot";

test("renders custom chat interface correctly", () => {
    const store = setupStore(generateDefaultState());
    const component = renderWithProviders(<CustomChat />, { store: store });
    expect(component).toMatchSnapshot();
});

test("renders users from the store in the select", () => {
    const store = setupStore({
        bot: {
            token: "TOKEN",
            programs: [],
            response: [],
            users: [{ Username: "alice", UserID: 42 }],
        },
    });
    renderWithProviders(<CustomChat />, { store });

    expect(screen.getByRole("combobox")).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole("combobox"));
    expect(screen.getByText("alice (42)")).toBeTruthy();
});

test("selecting a user, typing a message, and clicking Send calls bot.sendMessage with the user ID and message", () => {
    const bot = new BrowserBot("123:TOKEN");
    const spy = jest.spyOn(bot, "sendMessage");

    const store = setupStore({
        bot: {
            token: "TOKEN",
            programs: [],
            response: [],
            users: [{ Username: "alice", UserID: 42 }],
        },
    });
    renderWithProviders(<CustomChat bot={bot} />, { store });

    // Select the alice option (UserID 42)
    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("alice (42)"));

    // Type a message
    const textbox = screen.getByRole("textbox");
    fireEvent.change(textbox, { target: { value: "hello there" } });

    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(spy).toHaveBeenCalledWith(42, "hello there");
});

test("clicking Send without a selected user does nothing", () => {
    const bot = new BrowserBot("123:TOKEN");
    const spy = jest.spyOn(bot, "sendMessage");

    const store = setupStore(generateDefaultState());
    renderWithProviders(<CustomChat bot={bot} />, { store });

    const textbox = screen.getByRole("textbox");
    fireEvent.change(textbox, { target: { value: "nobody picked" } });

    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(spy).not.toHaveBeenCalled();
});

test("clicking Send with no bot prop does nothing", () => {
    const store = setupStore({
        bot: {
            token: "TOKEN",
            programs: [],
            response: [],
            users: [{ Username: "alice", UserID: 42 }],
        },
    });
    renderWithProviders(<CustomChat />, { store });

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("alice (42)"));

    const textbox = screen.getByRole("textbox");
    fireEvent.change(textbox, { target: { value: "no bot" } });

    expect(() => fireEvent.click(screen.getByRole("button", { name: "Send" }))).not.toThrow();
});

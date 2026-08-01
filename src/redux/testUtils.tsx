import React from "react";
import { render } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { botSlice, defaultBotState } from "./botSlice";
import { BotWithConfig } from "./types";

export const generateDefaultState = (): BotWithConfig => {
  return {
    bot: defaultBotState,
  };
};

export const setupStore = (preloadedState) => {
  return configureStore<BotWithConfig>({
    reducer: {
      bot: botSlice.reducer,
    },
    preloadedState: {
      // Merge partial fixtures over the defaults so a fixture that omits a
      // now-required field (e.g. `flows`) still gets a valid store state.
      bot: { ...defaultBotState, ...(preloadedState?.bot ?? {}) },
    },
  });
};

export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    // Automatically create a store instance if no store was passed in
    store = setupStore(preloadedState),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return <Provider store={store}>{children}</Provider>;
  }

  // Return an object with the store and all of RTL's query functions
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

import React from "react";
import { render } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { botSlice, defaultBotState } from "./botSlice";

export const generateDefaultState = () => {
  return {
    bot: defaultBotState,
  };
};

export const setupStore = (preloadedState) => {
  return configureStore({
    reducer: {
      bot: botSlice.reducer,
    },
    preloadedState,
  });
};

export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    // Automatically create a store instance if no store was passed in
    store = configureStore({
      reducer: { bot: botSlice.reducer },
      preloadedState: preloadedState,
    }),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return <Provider store={store}>{children}</Provider>;
  }

  // Return an object with the store and all of RTL's query functions
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

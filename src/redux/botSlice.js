import { createSlice } from "@reduxjs/toolkit";

export class BotState {
  constructor(token, commands) {
    this.token = token;
    this.commands = commands;
  }
}

export const defaultBotState = {
  token: "",
  commands: [],
};

export const botSlice = createSlice({
  name: "bot",
  initialState: defaultBotState,
  reducers: {
    setToken: (state, action) => {
      state.token = action.payload;
    },
    addCommands: (state, action) => {
      state.commands = [...state.commands, action.payload];
    },
    setCommands: (state, action) => {
      state.commands = action.payload;
    },
  },
});

export const { setToken, addCommands, setCommands } = botSlice.actions;

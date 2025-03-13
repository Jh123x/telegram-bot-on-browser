import { createSlice } from "@reduxjs/toolkit";
import { IBotState } from "./types";

export class BotState {
  token: string
  commands: string[]

  constructor(token: string, commands: string[]) {
    this.token = token;
    this.commands = commands;
  }
}

export const defaultBotState: IBotState = {
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

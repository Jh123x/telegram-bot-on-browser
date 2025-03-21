import { createSlice } from "@reduxjs/toolkit";
import { Command, IBotState, Response, User } from "./types";

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
  response: [],
  users: [],
};

export const botSlice = createSlice({
  name: "bot",
  initialState: defaultBotState,
  reducers: {
    setToken: (state, action: { payload: string, type: string }) => {
      state.token = action.payload;
    },
    addCommands: (state, action: { payload: Command, type: string }) => {
      state.commands = [...state.commands, action.payload];
    },
    setCommands: (state, action: { payload: Command[], type: string }) => {
      state.commands = action.payload;
    },
    addResponse: (state, action: { payload: Response, type: string }) => {
      state.response = [...state.response, action.payload];
    },
    addUser: (state, action: { payload: User, type: string }) => {
      const newUser = action.payload
      for (const user of state.users) {
        if (user.UserID === newUser.UserID && user.Username === newUser.Username) return
      }
      state.users = [...state.users, action.payload]
    },
  },
});

export const { setToken, addCommands, setCommands, addResponse, addUser } = botSlice.actions;

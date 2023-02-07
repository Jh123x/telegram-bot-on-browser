import { createSlice } from "@reduxjs/toolkit";

export const botSlice = createSlice({
  name: "bot",
  initialState: {
    token: "",
    commands: [],
  },
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

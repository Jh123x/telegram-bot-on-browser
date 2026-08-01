import { createSlice } from "@reduxjs/toolkit";
import { IBotState, Response, User } from "./types";
import { Program } from "../interfaces/program.ts";

export const defaultBotState: IBotState = {
  token: "",
  programs: [],
  response: [],
  users: [],
  selectedUserId: null,
  autoStart: false,
  hydrated: false,
};

export const botSlice = createSlice({
  name: "bot",
  initialState: defaultBotState,
  reducers: {
    setToken: (state, action: { payload: string, type: string }) => {
      state.token = action.payload;
    },
    setPrograms: (state, action: { payload: Program[], type: string }) => {
      state.programs = action.payload;
    },
    addProgram: (state, action: { payload: Program, type: string }) => {
      state.programs = [...state.programs, action.payload];
    },
    updateProgram: (state, action: { payload: Program, type: string }) => {
      state.programs = state.programs.map((program) => program.id === action.payload.id ? action.payload : program);
    },
    removeProgram: (state, action: { payload: string, type: string }) => {
      state.programs = state.programs.filter((program) => program.id !== action.payload);
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
    setSelectedUserId: (state, action: { payload: number | null, type: string }) => {
      state.selectedUserId = action.payload;
    },
    setAutoStart: (state, action: { payload: boolean, type: string }) => {
      state.autoStart = action.payload;
    },
    setHydrated: (state, action: { payload: boolean, type: string }) => {
      state.hydrated = action.payload;
    },
    resetAll: () => ({ ...defaultBotState }),
  },
});

export const { setToken, setPrograms, addProgram, updateProgram, removeProgram, addResponse, addUser, setSelectedUserId, setAutoStart, setHydrated, resetAll } = botSlice.actions;

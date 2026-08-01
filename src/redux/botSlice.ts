import { createSlice } from "@reduxjs/toolkit";
import { IBotState, Response, User } from "./types.ts";
import { Program } from "../interfaces/program.ts";
import { Flow } from "../interfaces/flow.ts";

export const defaultBotState: IBotState = {
  token: "",
  programs: [],
  flows: [],
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
    setFlows: (state, action: { payload: Flow[], type: string }) => {
      state.flows = action.payload;
    },
    addFlow: (state, action: { payload: Flow, type: string }) => {
      state.flows = [...(state.flows ?? []), action.payload];
    },
    updateFlow: (state, action: { payload: Flow, type: string }) => {
      state.flows = (state.flows ?? []).map((flow) => flow.id === action.payload.id ? action.payload : flow);
    },
    removeFlow: (state, action: { payload: string, type: string }) => {
      state.flows = (state.flows ?? []).filter((flow) => flow.id !== action.payload);
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
    setUsers: (state, action: { payload: User[], type: string }) => {
      state.users = action.payload;
    },
    setResponse: (state, action: { payload: Response[], type: string }) => {
      state.response = action.payload;
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

export const { setToken, setPrograms, setFlows, addFlow, updateFlow, removeFlow, addResponse, addUser, setUsers, setResponse, setSelectedUserId, setAutoStart, setHydrated, resetAll } = botSlice.actions;

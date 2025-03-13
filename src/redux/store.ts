import { configureStore } from "@reduxjs/toolkit";
import { botSlice } from "./botSlice.ts";

export const store = configureStore({
  reducer: {
    bot: botSlice.reducer,
  },
});

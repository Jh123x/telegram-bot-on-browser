import { configureStore } from "@reduxjs/toolkit";
import { botSlice } from "./botSlice";

export const store = configureStore({
  reducer: {
    bot: botSlice.reducer,
  },
});

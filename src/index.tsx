import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";
import { Provider } from "react-redux";
import { store } from "./redux/store.ts";

// React Flow observes the canvas viewport with a ResizeObserver. When a
// notification lands in the same frame the observer's own callback changes
// layout (common during mount with fitView, tab switches, or node drags),
// Chromium reports a benign "ResizeObserver loop completed with undelivered
// notifications" error. It never affects functionality, but it pollutes the
// console. Filter exactly that message; all other errors keep normal handling.
window.addEventListener("error", (event) => {
  if (event.message.includes("ResizeObserver loop")) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

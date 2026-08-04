import { test, expect, vi } from "vitest";
import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { defaultBotState } from "../redux/botSlice.ts";
import { AppSettings } from "./AppSettings.tsx";

// A new-model flow: start → condition (contains "hi") → if/else sends, plus
// a transform node — exercises all four node types and trigger-less edges.
const validFlow = {
  id: "f1",
  name: "Order",
  startNodeId: "n1",
  nodes: [
    {
      id: "n1",
      type: "start",
      position: { x: 0, y: 0 },
      data: { label: "Start" },
    },
    {
      id: "n2",
      type: "trim",
      position: { x: 200, y: 0 },
      data: { label: "Clean" },
    },
    {
      id: "n3",
      type: "contains",
      position: { x: 400, y: 0 },
      data: { label: "Has hi", value: "hi" },
    },
    {
      id: "n4",
      type: "send",
      position: { x: 600, y: -120 },
      data: { label: "Greet", replies: ["Hello! 👋"] },
    },
    {
      id: "n5",
      type: "send",
      position: { x: 600, y: 120 },
      data: { label: "Nudge", replies: ["Say hi!"] },
    },
    {
      id: "n6",
      type: "poll",
      position: { x: 600, y: 240 },
      data: { label: "Pick" },
    },
    {
      id: "n7",
      type: "randomNumber",
      position: { x: 600, y: 360 },
      data: { label: "Roll", min: "1", max: "20" },
    },
  ],
  edges: [
    { id: "e1", source: "n1", target: "n2" },
    { id: "e2", source: "n2", target: "n3" },
    { id: "e3", source: "n3", target: "n4", sourceHandle: "if" },
    { id: "e4", source: "n3", target: "n5", sourceHandle: "else" },
  ],
};

const seedState = {
  bot: {
    token: "abc:TOKEN",
    flows: [validFlow],
    response: [],
    users: [],
    autoStart: false,
  },
};

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  (URL as any).createObjectURL = originalCreateObjectURL;
  (URL as any).revokeObjectURL = originalRevokeObjectURL;
  vi.restoreAllMocks();
});

test("renders the auto-start switch, export, import, reset and coffee controls", () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  expect(screen.getByText("Auto start bot on load")).toBeTruthy();
  expect(screen.getByRole("switch")).toBeTruthy();

  expect(screen.getByRole("button", { name: "Export settings" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Import settings" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Reset to default" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /☕ Buy me a coffee/i })).toBeTruthy();

  expect(screen.getByTestId("import-settings-input")).toBeTruthy();
  expect(screen.getByTestId("import-status")).toBeTruthy();
});

test("toggling auto start dispatches setAutoStart and persists to localStorage", () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  expect(store.getState().bot.autoStart).toBe(false);

  fireEvent.click(screen.getByRole("switch"));

  expect(store.getState().bot.autoStart).toBe(true);
  expect(localStorage.getItem("autoStart")).toBe("true");
});

test("renders a poll rate input showing the stored value in seconds", () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  const input = screen.getByLabelText(/poll rate/i);
  expect(input).toHaveValue(5);
});

test("changing poll rate dispatches setPollRate and persists to localStorage", () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  fireEvent.change(screen.getByLabelText(/poll rate/i), {
    target: { value: "2" },
  });

  expect(store.getState().bot.pollRate).toBe(2);
  expect(localStorage.getItem("pollRate")).toBe("2");
});

test("coffee link points to buymeacoffee.com/jh123x and opens in a new tab", () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  const link = screen.getByRole("link", { name: /☕ Buy me a coffee/i });
  expect(link).toHaveAttribute("href", "https://buymeacoffee.com/jh123x");
  expect(link).toHaveAttribute("target", "_blank");
  expect(link.getAttribute("rel")).toContain("noopener");
});

test("export settings downloads a JSON file with the current settings", async () => {
  (URL as any).createObjectURL = vi.fn(() => "blob:mock");
  (URL as any).revokeObjectURL = vi.fn();
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});

  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Export settings" }));

  expect((URL as any).createObjectURL).toHaveBeenCalledTimes(1);
  const blob: Blob = (URL as any).createObjectURL.mock.calls[0][0];
  const text = await readBlob(blob);
  const parsed = JSON.parse(text);

  expect(parsed).toEqual({
    version: 1,
    token: "abc:TOKEN",
    flows: [validFlow],
    autoStart: false,
    pollRate: 5,
  });
  expect(clickSpy).toHaveBeenCalledTimes(1);
  expect((URL as any).revokeObjectURL).toHaveBeenCalledWith("blob:mock");
});

test("import settings applies token, resets flows to empty and applies autoStart", async () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [],
        autoStart: true,
      }),
    ],
    "s.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(store.getState().bot.token).toBe("imp-token");
  // An empty flows list imports as empty.
  expect(store.getState().bot.flows).toEqual([]);
  expect(store.getState().bot.autoStart).toBe(true);
  expect(localStorage.getItem("token")).toBe("imp-token");
  expect(localStorage.getItem("autoStart")).toBe("true");
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Settings imported."
  );
});

test("import settings collapses multiple flows to the first one", async () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  const second = { ...validFlow, id: "f2", name: "Second Flow" };
  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [validFlow, second],
      }),
    ],
    "s.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  const flows = store.getState().bot.flows;
  expect(flows).toHaveLength(1);
  expect(flows[0].id).toBe(validFlow.id);
  expect(flows[0].name).toBe("Order");
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Settings imported."
  );
});

test("import settings restores pollRate when present in the file", async () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [],
        pollRate: 3,
      }),
    ],
    "s.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(store.getState().bot.pollRate).toBe(3);
  expect(localStorage.getItem("pollRate")).toBe("3");
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Settings imported."
  );
});

test("import settings without pollRate keeps the default", async () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [],
        autoStart: false,
      }),
    ],
    "s.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(store.getState().bot.pollRate).toBe(5);
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Settings imported."
  );
});

test("import settings with an invalid pollRate falls back to the default", async () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [],
        pollRate: -3,
      }),
    ],
    "s.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  // A negative/zero rate would make the poll worker spin in a tight loop
  // (setTimeout with <= 0 fires immediately), so invalid numbers must be
  // rejected the same way as a missing pollRate.
  expect(store.getState().bot.pollRate).toBe(5);
  expect(localStorage.getItem("pollRate")).toBe("5");
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Settings imported."
  );
});

test("import with an invalid file shows an error and changes nothing", async () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("autoStart", "false");
  renderWithProviders(<AppSettings />, { store });

  const file = new File(["not json"], "bad.json", { type: "application/json" });

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.token).toBe("abc:TOKEN");
  expect(store.getState().bot.autoStart).toBe(false);
  expect(localStorage.getItem("token")).toBe("abc:TOKEN");
});

test("import with a valid-JSON-but-wrong-shape file shows an error and changes nothing", async () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  const file = new File([JSON.stringify({ token: 123 })], "bad.json", {
    type: "application/json",
  });

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.token).toBe("abc:TOKEN");
  expect(store.getState().bot.autoStart).toBe(false);
});

test("reset to default clears the store and localStorage after confirm", () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  localStorage.setItem("autoStart", "false");
  localStorage.setItem("pollRate", "3");
  renderWithProviders(<AppSettings />, { store });

  expect(store.getState().bot.flows).toEqual([validFlow]);
  expect(store.getState().bot.pollRate).toBe(3);

  vi.spyOn(window, "confirm").mockReturnValue(true);

  fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));

  expect(store.getState().bot).toEqual(defaultBotState);
  expect(localStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("flows")).toBeNull();
  expect(localStorage.getItem("autoStart")).toBeNull();
  expect(localStorage.getItem("pollRate")).toBeNull();
});

test("reset to default does nothing when confirm is declined", () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  renderWithProviders(<AppSettings />, { store });

  vi.spyOn(window, "confirm").mockReturnValue(false);

  fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));

  expect(store.getState().bot.token).toBe("abc:TOKEN");
  expect(store.getState().bot.autoStart).toBe(false);
  expect(localStorage.getItem("token")).toBe("abc:TOKEN");
});

const readBlob = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });

test("import settings restores flows into the store and localStorage", async () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [validFlow],
        autoStart: true,
      }),
    ],
    "s.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(store.getState().bot.flows).toEqual([validFlow]);
  expect(localStorage.getItem("flows")).toBe(JSON.stringify([validFlow]));
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Settings imported."
  );
});

test("importing a file without flows shows an error and changes nothing", async () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        autoStart: false,
      }),
    ],
    "s.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  // flows is required — a file without it is rejected, nothing changes.
  expect(store.getState().bot.token).toBe("abc:TOKEN");
  expect(store.getState().bot.flows).toEqual([validFlow]);
  expect(localStorage.getItem("flows")).toBe(JSON.stringify([validFlow]));
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
});

test("import with an invalid flows array shows an error and changes nothing", async () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [{ id: "no-name" }],
        autoStart: false,
      }),
    ],
    "bad.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.token).toBe("abc:TOKEN");
  expect(store.getState().bot.flows).toEqual([validFlow]);
  expect(localStorage.getItem("flows")).toBe(JSON.stringify([validFlow]));
});

test("import rejects a flow whose node is missing data.label and changes nothing", async () => {
  // The flow passes the old top-level check but has a malformed node (no
  // data.label). Deep validation must reject it before it can crash the
  // FlowInspector / canvas.
  const badFlow = {
    id: "f-bad",
    name: "Bad",
    startNodeId: "n1",
    nodes: [
      {
        id: "n1",
        type: "start",
        position: { x: 0, y: 0 },
        data: { replies: [] }, // missing label
      },
    ],
    edges: [],
  };
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [badFlow],
        autoStart: false,
      }),
    ],
    "bad.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.token).toBe("abc:TOKEN");
  expect(store.getState().bot.flows).toEqual([validFlow]);
  expect(localStorage.getItem("flows")).toBe(JSON.stringify([validFlow]));
});


test("import accepts a new-model flow with transform/condition/send nodes and trigger-less edges", async () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [validFlow],
        autoStart: true,
      }),
    ],
    "s.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(screen.getByTestId("import-status").textContent).toContain(
    "Settings imported."
  );
  expect(store.getState().bot.flows).toEqual([validFlow]);
});

test("import accepts a flow with the negated/concat/template node types", async () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  renderWithProviders(<AppSettings />, { store });

  const newTypesFlow = {
    id: "f-new",
    name: "New Nodes",
    startNodeId: "n1",
    nodes: [
      { id: "n1", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
      { id: "n2", type: "notStartsWith", position: { x: 120, y: 0 }, data: { label: "Not Cmd", value: "/" } },
      { id: "n3", type: "concatFront", position: { x: 240, y: 0 }, data: { label: "Prefix", text: "> " } },
      { id: "n4", type: "concatBack", position: { x: 360, y: 0 }, data: { label: "Suffix", text: "!" } },
      { id: "n5", type: "template", position: { x: 480, y: 0 }, data: { label: "Format", template: "You said: {msg}" } },
      { id: "n6", type: "notEndsWith", position: { x: 600, y: 0 }, data: { label: "Not Q", value: "?" } },
      { id: "n7", type: "send", position: { x: 720, y: 0 }, data: { label: "Reply", replies: ["{msg}"] } },
      { id: "n8", type: "sendTo", position: { x: 840, y: 0 }, data: { label: "Forward", replies: ["Your message"], confirm: "Forwarded!" } },
      { id: "n9", type: "question", position: { x: 960, y: 0 }, data: { label: "Ask", prompt: "What is 2 + 2?", answers: ["4", "four"], correctReply: "Correct!", wrongReply: "Try again." } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3", sourceHandle: "if" },
      { id: "e3", source: "n3", target: "n4" },
      { id: "e4", source: "n4", target: "n5" },
      { id: "e5", source: "n5", target: "n6" },
      { id: "e6", source: "n6", target: "n7", sourceHandle: "if" },
    ],
  };

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [newTypesFlow],
        autoStart: true,
      }),
    ],
    "s.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(screen.getByTestId("import-status").textContent).toContain(
    "Settings imported."
  );
  expect(store.getState().bot.flows).toEqual([newTypesFlow]);
});

test("import rejects a template node whose template field is not a string", async () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  renderWithProviders(<AppSettings />, { store });

  const badFlow = {
    id: "f-bad-template",
    name: "Bad Template",
    startNodeId: "n1",
    nodes: [
      { id: "n1", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
      { id: "n2", type: "template", position: { x: 120, y: 0 }, data: { label: "T", template: 42 } },
    ],
    edges: [],
  };

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [badFlow],
        autoStart: false,
      }),
    ],
    "bad.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.token).toBe("abc:TOKEN");
  expect(store.getState().bot.flows).toEqual([validFlow]);
  expect(localStorage.getItem("flows")).toBe(JSON.stringify([validFlow]));
});

test("import rejects a question node whose answers is not a string array", async () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  renderWithProviders(<AppSettings />, { store });

  const badFlow = {
    id: "f-bad-question",
    name: "Bad Question",
    startNodeId: "n1",
    nodes: [
      { id: "n1", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
      {
        id: "n2",
        type: "question",
        position: { x: 120, y: 0 },
        data: { label: "Ask", prompt: "Pick?", answers: [42] },
      },
    ],
    edges: [],
  };

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [badFlow],
        autoStart: false,
      }),
    ],
    "bad.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.token).toBe("abc:TOKEN");
  expect(store.getState().bot.flows).toEqual([validFlow]);
  expect(localStorage.getItem("flows")).toBe(JSON.stringify([validFlow]));
});

test("import rejects a flow containing a legacy state node and changes nothing", async () => {
  const legacyFlow = {
    id: "f-legacy",
    name: "Legacy",
    startNodeId: "n1",
    nodes: [
      { id: "n1", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
      {
        id: "n2",
        type: "state",
        position: { x: 120, y: 0 },
        data: { label: "Old State", replies: ["hi"] },
      },
    ],
    edges: [
      {
        id: "e1",
        source: "n1",
        target: "n2",
        data: { trigger: { type: "fallback", value: "" } },
      },
    ],
  };
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [legacyFlow],
        autoStart: false,
      }),
    ],
    "bad.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.token).toBe("abc:TOKEN");
  expect(store.getState().bot.flows).toEqual([validFlow]);
});

test("import rejects an edge carrying legacy trigger data and changes nothing", async () => {
  const badEdgeFlow = {
    id: "f-bad-edge",
    name: "Bad Edge",
    startNodeId: "n1",
    nodes: [
      { id: "n1", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
      { id: "n2", type: "send", position: { x: 120, y: 0 }, data: { label: "Go", replies: ["ok"] } },
    ],
    edges: [
      {
        id: "e1",
        source: "n1",
        target: "n2",
        data: { trigger: { type: "contains", value: "hi" } },
      },
    ],
  };
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [badEdgeFlow],
        autoStart: false,
      }),
    ],
    "bad.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.flows).toEqual([validFlow]);
});

test("Import settings button opens the hidden file input", () => {
  const clickSpy = vi
    .spyOn(HTMLInputElement.prototype, "click")
    .mockImplementation(() => {});
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  fireEvent.click(screen.getByRole("button", { name: "Import settings" }));

  expect(clickSpy).toHaveBeenCalledTimes(1);
});

// Builds a settings file whose single flow is invalid in the given way and
// returns the error caption asserted by the caller.
const importBadFlow = async (flow: unknown) => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        flows: [flow],
        autoStart: false,
      }),
    ],
    "bad.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  // Wait for the async FileReader import to finish (status text is the
  // completion signal) instead of a fixed sleep — fixed sleeps race under
  // parallel workers.
  await waitFor(() =>
    expect(screen.getByTestId("import-status").textContent).not.toBe("")
  );

  return store;
};

const baseInvalidFlow = (nodePatch: Record<string, unknown>) => ({
  id: "f-bad",
  name: "Bad",
  startNodeId: "n1",
  nodes: [
    {
      id: "n1",
      type: "start",
      position: { x: 0, y: 0 },
      data: { label: "Start" },
    },
    {
      id: "n2",
      type: "contains",
      position: { x: 120, y: 0 },
      data: { label: "Check", value: "hi", ...nodePatch },
    },
  ],
  edges: [{ id: "e1", source: "n1", target: "n2" }],
});

test("import rejects a condition node whose value is not a string", async () => {
  const store = await importBadFlow(baseInvalidFlow({ value: 42 }));
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.flows).toEqual([validFlow]);
});

test("import rejects a node whose find is not a string", async () => {
  const flow = {
    ...baseInvalidFlow({}),
    nodes: [
      {
        id: "n1",
        type: "start",
        position: { x: 0, y: 0 },
        data: { label: "Start" },
      },
      {
        id: "n2",
        type: "replace",
        position: { x: 120, y: 0 },
        data: { label: "Swap", find: 123 },
      },
    ],
  };
  const store = await importBadFlow(flow);
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.flows).toEqual([validFlow]);
});

test("import rejects a node whose replacement is not a string", async () => {
  const flow = {
    ...baseInvalidFlow({}),
    nodes: [
      {
        id: "n1",
        type: "start",
        position: { x: 0, y: 0 },
        data: { label: "Start" },
      },
      {
        id: "n2",
        type: "replace",
        position: { x: 120, y: 0 },
        data: { label: "Swap", replacement: null },
      },
    ],
  };
  const store = await importBadFlow(flow);
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.flows).toEqual([validFlow]);
});

test("import rejects a node whose pattern is not a string", async () => {
  const flow = {
    ...baseInvalidFlow({}),
    nodes: [
      {
        id: "n1",
        type: "start",
        position: { x: 0, y: 0 },
        data: { label: "Start" },
      },
      {
        id: "n2",
        type: "extractRegex",
        position: { x: 120, y: 0 },
        data: { label: "Extract", pattern: ["x"] },
      },
    ],
  };
  const store = await importBadFlow(flow);
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.flows).toEqual([validFlow]);
});

test("import rejects a node whose replies is not an array", async () => {
  const flow = {
    ...baseInvalidFlow({}),
    nodes: [
      {
        id: "n1",
        type: "start",
        position: { x: 0, y: 0 },
        data: { label: "Start" },
      },
      {
        id: "n2",
        type: "send",
        position: { x: 120, y: 0 },
        data: { label: "Say", replies: "hi" },
      },
    ],
  };
  const store = await importBadFlow(flow);
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.flows).toEqual([validFlow]);
});

test("import rejects a node whose replies array contains a non-string", async () => {
  const flow = {
    ...baseInvalidFlow({}),
    nodes: [
      {
        id: "n1",
        type: "start",
        position: { x: 0, y: 0 },
        data: { label: "Start" },
      },
      {
        id: "n2",
        type: "send",
        position: { x: 120, y: 0 },
        data: { label: "Say", replies: ["ok", 42] },
      },
    ],
  };
  const store = await importBadFlow(flow);
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.flows).toEqual([validFlow]);
});

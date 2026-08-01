import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { act } from "@testing-library/react";
import { renderWithProviders, setupStore } from "../redux/testUtils.tsx";
import { defaultBotState } from "../redux/botSlice.ts";
import { AppSettings } from "./AppSettings.tsx";

const validProgram = {
  id: "p1",
  name: "Greet",
  trigger: { type: "equals", value: "/start" },
  blocks: [
    {
      id: "b1",
      category: "action",
      kind: "reply",
      value: "hi",
      value2: "",
      fallback: "",
    },
  ],
};

const validFlow = {
  id: "f1",
  name: "Order",
  startNodeId: "n1",
  nodes: [
    {
      id: "n1",
      type: "start",
      position: { x: 0, y: 0 },
      data: { label: "Start", replies: [] },
    },
  ],
  edges: [],
};

const seedState = {
  bot: {
    token: "abc:TOKEN",
    programs: [validProgram],
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
  jest.restoreAllMocks();
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

test("coffee link points to buymeacoffee.com/jh123x and opens in a new tab", () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  const link = screen.getByRole("link", { name: /☕ Buy me a coffee/i });
  expect(link).toHaveAttribute("href", "https://buymeacoffee.com/jh123x");
  expect(link).toHaveAttribute("target", "_blank");
  expect(link.getAttribute("rel")).toContain("noopener");
});

test("export settings downloads a JSON file with the current settings", async () => {
  (URL as any).createObjectURL = jest.fn(() => "blob:mock");
  (URL as any).revokeObjectURL = jest.fn();
  const clickSpy = jest
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
    programs: [validProgram],
    flows: [validFlow],
    autoStart: false,
  });
  expect(clickSpy).toHaveBeenCalledTimes(1);
  expect((URL as any).revokeObjectURL).toHaveBeenCalledWith("blob:mock");
});

test("import settings applies token, programs and autoStart", async () => {
  const store = setupStore(seedState);
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        programs: [validProgram],
        autoStart: true,
      }),
    ],
    "s.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

  expect(store.getState().bot.token).toBe("imp-token");
  expect(store.getState().bot.programs).toEqual([validProgram]);
  expect(store.getState().bot.autoStart).toBe(true);
  expect(localStorage.getItem("token")).toBe("imp-token");
  expect(localStorage.getItem("programs")).toBe(JSON.stringify([validProgram]));
  expect(localStorage.getItem("autoStart")).toBe("true");
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Settings imported."
  );
});

test("import with an invalid file shows an error and changes nothing", async () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("programs", JSON.stringify([validProgram]));
  localStorage.setItem("autoStart", "false");
  renderWithProviders(<AppSettings />, { store });

  const file = new File(["not json"], "bad.json", { type: "application/json" });

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.token).toBe("abc:TOKEN");
  expect(store.getState().bot.programs).toEqual([validProgram]);
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
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.token).toBe("abc:TOKEN");
  expect(store.getState().bot.programs).toEqual([validProgram]);
  expect(store.getState().bot.autoStart).toBe(false);
});

test("reset to default clears the store and localStorage after confirm", () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("programs", JSON.stringify([validProgram]));
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  localStorage.setItem("autoStart", "false");
  renderWithProviders(<AppSettings />, { store });

  expect(store.getState().bot.flows).toEqual([validFlow]);

  jest.spyOn(window, "confirm").mockReturnValue(true);

  fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));

  expect(store.getState().bot).toEqual(defaultBotState);
  expect(localStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("programs")).toBeNull();
  expect(localStorage.getItem("flows")).toBeNull();
  expect(localStorage.getItem("autoStart")).toBeNull();
});

test("reset to default does nothing when confirm is declined", () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  renderWithProviders(<AppSettings />, { store });

  jest.spyOn(window, "confirm").mockReturnValue(false);

  fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));

  expect(store.getState().bot.token).toBe("abc:TOKEN");
  expect(store.getState().bot.programs).toEqual([validProgram]);
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
        programs: [validProgram],
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
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

  expect(store.getState().bot.flows).toEqual([validFlow]);
  expect(localStorage.getItem("flows")).toBe(JSON.stringify([validFlow]));
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Settings imported."
  );
});

test("importing an old-format file without flows succeeds and resets flows to empty", async () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("programs", JSON.stringify([validProgram]));
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        programs: [validProgram],
        autoStart: false,
      }),
    ],
    "s.json",
    { type: "application/json" }
  );

  fireEvent.change(screen.getByTestId("import-settings-input"), {
    target: { files: [file] },
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

  expect(store.getState().bot).toMatchObject({
    token: "imp-token",
    programs: [validProgram],
    flows: [],
  });
  expect(localStorage.getItem("flows")).toBe("[]");
  expect(screen.getByTestId("import-status").textContent).toContain(
    "Settings imported."
  );
});

test("import with an invalid flows array shows an error and changes nothing", async () => {
  const store = setupStore(seedState);
  localStorage.setItem("token", "abc:TOKEN");
  localStorage.setItem("programs", JSON.stringify([validProgram]));
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        programs: [validProgram],
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
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

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
  localStorage.setItem("programs", JSON.stringify([validProgram]));
  localStorage.setItem("flows", JSON.stringify([validFlow]));
  renderWithProviders(<AppSettings />, { store });

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        token: "imp-token",
        programs: [validProgram],
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
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

  expect(screen.getByTestId("import-status").textContent).toContain(
    "Could not import settings"
  );
  expect(store.getState().bot.token).toBe("abc:TOKEN");
  expect(store.getState().bot.flows).toEqual([validFlow]);
  expect(localStorage.getItem("flows")).toBe(JSON.stringify([validFlow]));
});


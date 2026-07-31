import { test, expect } from "@jest/globals";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Navbar, Page } from "./Navbar.tsx";

const renderNavbar = (
  props: Partial<{
    page: Page;
    onPageChange: (p: Page) => void;
    started: boolean;
    onStart: () => void;
    onStop: () => void;
  }> = {}
) => {
  const page = props.page ?? "programs";
  const onPageChange = props.onPageChange ?? jest.fn();
  const started = props.started ?? false;
  const onStart = props.onStart ?? jest.fn();
  const onStop = props.onStop ?? jest.fn();
  return {
    onPageChange,
    onStart,
    onStop,
    ...render(
      <Navbar
        page={page}
        onPageChange={onPageChange}
        started={started}
        onStart={onStart}
        onStop={onStop}
      />
    ),
  };
};

test("renders brand, four tabs, and Bot stopped with Start enabled and Stop disabled when not started", () => {
  renderNavbar();

  expect(screen.getByText("BrowserBot")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Programs" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Chat" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Settings" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Docs" })).toBeInTheDocument();

  expect(screen.getByText(/Bot stopped/i)).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Start" }) as HTMLButtonElement)
      .disabled
  ).toBe(false);
  expect(
    (screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement).disabled
  ).toBe(true);
});

test("clicking Start calls onStart", () => {
  const { onStart } = renderNavbar();

  fireEvent.click(screen.getByRole("button", { name: "Start" }));

  expect(onStart).toHaveBeenCalledTimes(1);
});

test("when started shows Bot started and clicking Stop calls onStop", () => {
  const { onStop } = renderNavbar({ started: true });

  expect(screen.getByText(/Bot started/i)).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Start" }) as HTMLButtonElement)
      .disabled
  ).toBe(true);
  expect(
    (screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement).disabled
  ).toBe(false);

  fireEvent.click(screen.getByRole("button", { name: "Stop" }));

  expect(onStop).toHaveBeenCalledTimes(1);
});

test("tabs inherit the app bar text color so labels stay visible on the primary background", () => {
  renderNavbar();

  // The AppBar background is primary (blue). The default Tabs textColor is
  // "primary", which makes the selected tab's label the same color as the
  // background — invisible. Inheriting the AppBar's contrast text keeps
  // every label readable on the bar.
  const tab = screen.getByRole("tab", { name: "Programs" });
  expect(tab.className).toContain("MuiTab-textColorInherit");
});

test("clicking a tab calls onPageChange with the right value", () => {
  const { onPageChange } = renderNavbar({ page: "programs" });

  fireEvent.click(screen.getByRole("tab", { name: "Docs" }));
  expect(onPageChange).toHaveBeenCalledWith("docs");

  fireEvent.click(screen.getByRole("tab", { name: "Chat" }));
  expect(onPageChange).toHaveBeenCalledWith("chat");
});

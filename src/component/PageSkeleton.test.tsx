import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import React from "react";
import { PageSkeleton } from "./PageSkeleton.tsx";
import type { Page } from "./Navbar.tsx";

// Skeletons are the Suspense fallback while a lazy page chunk downloads. They
// must mirror the target page's layout so the swap is invisible. Each page
// gets a page-specific testid so tests can assert the right fallback shows.
const PAGES: Page[] = ["flow", "chat", "settings", "docs"];

describe("PageSkeleton", () => {
  test("renders a skeleton for every page", () => {
    for (const page of PAGES) {
      const { container } = render(<PageSkeleton page={page} />);
      expect(screen.getByTestId(`page-skeleton-${page}`)).toBeTruthy();
      // The fallback must contain actual MUI skeleton primitives, not an
      // empty shell — otherwise it fails its job as a loading placeholder.
      expect(container.querySelectorAll(".MuiSkeleton-root").length).toBeGreaterThan(0);
      container.remove();
    }
  });

  test("flow skeleton mirrors the editor layout: left rail + canvas + inspector", () => {
    const { container } = render(<PageSkeleton page="flow" />);
    const root = screen.getByTestId("page-skeleton-flow");
    // Three regions: palette/samples rail, canvas stage, inspector panel.
    expect(root.querySelectorAll("[data-skeleton-region]").length).toBe(3);
    expect(screen.getByTestId("skeleton-rail")).toBeTruthy();
    expect(screen.getByTestId("skeleton-canvas")).toBeTruthy();
    expect(screen.getByTestId("skeleton-inspector")).toBeTruthy();
    expect(container.querySelectorAll(".MuiSkeleton-root").length).toBeGreaterThan(5);
  });

  test("chat skeleton mirrors the chat layout: sidebar + bubbles + composer", () => {
    const { container } = render(<PageSkeleton page="chat" />);
    const root = screen.getByTestId("page-skeleton-chat");
    expect(root.querySelectorAll("[data-skeleton-region]").length).toBe(3);
    expect(screen.getByTestId("skeleton-sidebar")).toBeTruthy();
    expect(screen.getByTestId("skeleton-conversation")).toBeTruthy();
    expect(screen.getByTestId("skeleton-composer")).toBeTruthy();
    expect(container.querySelectorAll(".MuiSkeleton-root").length).toBeGreaterThan(5);
  });

  test("settings skeleton renders stacked setting rows", () => {
    const { container } = render(<PageSkeleton page="settings" />);
    expect(screen.getByTestId("page-skeleton-settings")).toBeTruthy();
    // A settings page is a list of rows; assert several labelled rows exist.
    const rows = container.querySelectorAll("[data-testid^='skeleton-setting-row']");
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  test("docs skeleton renders a document outline", () => {
    const { container } = render(<PageSkeleton page="docs" />);
    expect(screen.getByTestId("page-skeleton-docs")).toBeTruthy();
    // Docs = headings + paragraphs + a code block.
    expect(screen.getByTestId("skeleton-docs-heading")).toBeTruthy();
    expect(screen.getByTestId("skeleton-docs-code")).toBeTruthy();
    expect(container.querySelectorAll(".MuiSkeleton-root").length).toBeGreaterThan(5);
  });
});

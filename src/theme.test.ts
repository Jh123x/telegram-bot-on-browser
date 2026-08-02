import { test, expect } from "vitest";
import { GRAPH_COLORS, edgeColorFor } from "./theme.ts";

test("GRAPH_COLORS.node has the four node types each with accent and bg tokens", () => {
  expect(Object.keys(GRAPH_COLORS.node).sort()).toEqual([
    "condition",
    "send",
    "start",
    "transform",
  ]);
  for (const node of Object.values(GRAPH_COLORS.node) as {
    accent: string;
    bg: string;
  }[]) {
    expect(typeof node.accent).toBe("string");
    expect(node.accent).toMatch(/^#/);
    expect(node.accent.length).toBeGreaterThan(1);
    expect(typeof node.bg).toBe("string");
    expect(node.bg).toMatch(/^rgba\(/);
    expect(node.bg.length).toBeGreaterThan(5);
  }
});

test("edgeColorFor maps branch handles to their edge tokens", () => {
  expect(edgeColorFor("if")).toBe(GRAPH_COLORS.edge.if);
  expect(edgeColorFor("else")).toBe(GRAPH_COLORS.edge.else);
  expect(edgeColorFor(undefined)).toBe(GRAPH_COLORS.edge.plain);
});

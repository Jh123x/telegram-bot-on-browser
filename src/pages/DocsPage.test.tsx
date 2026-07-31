import { test, expect } from "@jest/globals";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DocsPage } from "./DocsPage.tsx";

test("renders the docs page with a placeholder", () => {
  render(<DocsPage />);

  expect(screen.getByText("Docs")).toBeTruthy();
  expect(screen.getByText("Coming soon")).toBeTruthy();
});

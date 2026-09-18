import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";

describe("Phase 0 web shell", () => {
  it("renders a public placeholder without private configuration", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "EasyConnect MCP Gateway" })).toBeDefined();
    expect(screen.getByText(/Phase 0 shell/i)).toBeDefined();
    expect(document.body.textContent).not.toMatch(/token|secret|password|api[_ -]?key/i);
  });
});

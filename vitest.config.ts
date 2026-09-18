import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["apps/**/*.test.{ts,tsx}", "scripts/**/*.test.{ts,tsx}"],
  },
});

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@": new URL(".", import.meta.url).pathname },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/analysis/**", "lib/gates.ts", "app/api/payment/**"],
      reporter: ["text", "html"],
    },
    setupFiles: ["tests/setup.ts"],
    typecheck: {
      tsconfig: "./tests/tsconfig.json",
    },
  },
})

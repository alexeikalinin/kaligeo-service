// Global test setup
// Ensure no real DB/external calls leak into unit tests

// Silence console.error/warn in tests (they're tested explicitly where needed)
vi.spyOn(console, "error").mockImplementation(() => {})
vi.spyOn(console, "warn").mockImplementation(() => {})
vi.spyOn(console, "log").mockImplementation(() => {})

# Architecture

Phase 0 establishes a deliberately small public application boundary:

- `apps/server` owns the Node HTTP entry point and exposes only `GET /health/live`.
- `apps/web` owns the public React placeholder and contains no private configuration.
- `docs-public` contains publishable architecture notes only.

The server boundary is exposed through `createServerApp()`, which starts a local HTTP
server and returns an explicit `close()` function for tests. Liveness is not readiness:
database checks, persistence, authentication, and downstream health checks are deferred.

MCP transport and protocol behavior, Admin API, persistence, HTTP execution, Compose, CI,
and production calls are explicitly outside Phase 0 Task 2.

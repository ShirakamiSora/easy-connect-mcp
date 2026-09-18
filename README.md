# EasyConnect MCP Gateway

This repository is the public engineering boundary for a small, local-first MCP Gateway.
Phase 0 establishes configuration, documentation, testing, formatting, private-file
verification, and a local official MCP TypeScript SDK probe. The probe validates the
supported SDK protocol boundary without production calls. Application services, Admin API,
persistence, executor, and Phase 1 behavior remain outside this task.

## Local checks

Install dependencies with `npm install`, then run:

```text
npm run verify:private
npm run format:check
npm run lint
npm test
```

`npm run dev` starts the Phase 0 backend on `127.0.0.1:3000`; its current endpoint is
`GET /health/live`. Start the web shell separately with `npm --prefix apps/web run dev`.
Build both the TypeScript checks and the web bundle with `npm run build`.

Copy `.env.example` to `.env` for local configuration. Never add credentials, private design
documents, certificates, internal topology, or production endpoints to public files.

See [`docs-public/README.md`](docs-public/README.md) for the public documentation boundary.

Phase 0 is **incomplete**: T-001 and T-002 remain open. Passing tests do not
establish dual-version MCP support. See the protocol matrix for the observed limits.

Before committing, set a GitHub noreply email and a public pseudonym in this
repository's Git configuration, then run `git config core.hooksPath .githooks`.
The pre-commit hook checks the actual index and commit email. CI also checks
reachable history and runs Gitleaks. Do not bypass failures; scanner diagnostics
omit matched values. These checks reduce risk but do not certify that all personal
information is absent. `--export` explicitly skips Git checks for source exports only.

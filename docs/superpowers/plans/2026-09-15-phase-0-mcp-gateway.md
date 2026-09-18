# Phase 0 MCP Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立符合 v0.2 设计的 MCP Gateway Phase 0 工程骨架，并用本地虚拟示例验证两个 MCP 协议版本的官方 TypeScript SDK 支持。

**Architecture:** 使用单仓库、模块化单体结构，后端位于 `apps/server`，前端位于 `apps/web`，公开文档位于 `docs-public`。Phase 0 只建立启动、测试和协议验证边界，不实现数据库模型、管理员、配置 CRUD、HTTP 执行器或真实生产调用。

**Tech Stack:** TypeScript、Node.js、React、官方 MCP TypeScript SDK、PostgreSQL、Docker Compose、Vitest、ESLint、Prettier、GitHub Actions。

**Spec:** `PRIVATE_MCP_Gateway_详细设计文档_v0.2.md`，重点依据第 3、5、14、21、23、25、27 章及 `PRIVATE_CODEX_BOOTSTRAP.md` 的 Phase 0 任务。

## Global Constraints

- V1 是单实例、单租户、单本地管理员；Phase 0 不实现业务功能。
- MCP 只验证 Streamable HTTP 入口及官方 SDK 行为；不实现 stdio 或 legacy HTTP+SSE。
- 同时验证 MCP `2025-11-25` 和 `2026-07-28`；不能用一个版本的通过替代另一个版本。
- 不调用真实生产 API；所有协议验证使用本地虚拟示例或 mock。
- 不添加 Redis、重试、熔断、健康探测、OpenAPI 导入、任意代码执行或匿名调用后门。
- 私有设计、真实 URL/IP、凭证、Token、证书私钥、内部拓扑和真实审计不得进入公开源码、fixture、README 或截图。
- 启动目录统一使用 `apps/server` 和 `apps/web`。
- Phase 0 的 T-001/T-002 结果必须记录实际证据；未验证的契约标记为待收口，不宣称已实现。

### Task 1: 初始化仓库边界与公共工程配置

**Files:**

- Create: `.gitignore`
- Create: `.env.example`
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `.prettierrc.json`
- Create: `eslint.config.mjs`
- Create: `README.md`
- Create: `docs-public/README.md`
- Test: `scripts/verify-private-files.mjs`

**Interfaces:**

- Produces workspace scripts `dev`, `build`, `test`, `lint`, `format:check`, `verify:private`，供后续任务和 CI 使用。
- Produces a path verification command that exits non-zero if private design files or secret-like paths are tracked or staged.

- [ ] **Step 1: Write the failing path-policy test**

  In `scripts/verify-private-files.mjs`, define the expected blocked path patterns and make the test fail when a blocked file is supplied through a temporary fixture argument.

- [ ] **Step 2: Run the test to verify it fails**

  Run `node scripts/verify-private-files.mjs --fixture-check`.
  Expected: FAIL because the verifier has not yet been implemented.

- [ ] **Step 3: Implement the minimal repository configuration**

  Add ignore rules for `.private/`, `PRIVATE_*`, `*PRIVATE_DESIGN*`, `*CODEX_BOOTSTRAP*`, design DOCX files, `.env` except `.env.example`, certificate/key files, `secrets/`, `credentials/`, `logs/`, `data/`, and `tmp/`. Add only scripts needed by Phase 0. Keep `README.md` public and describe the product boundary without private details.

- [ ] **Step 4: Run path and config checks**

  Run `npm run verify:private`, `npm run format:check`, and `npm run lint`.
  Expected: PASS; private files remain untracked/ignored and public documentation contains no secrets.

- [ ] **Step 5: Commit the isolated setup**

  Run `git add .gitignore .env.example package.json tsconfig.base.json vitest.config.ts .prettierrc.json eslint.config.mjs README.md docs-public/ scripts/` and commit with `chore: initialize phase 0 repository boundary`.

### Task 2: Create server and web skeletons with explicit module boundaries

**Files:**

- Create: `apps/server/package.json`
- Create: `apps/server/src/index.ts`
- Create: `apps/server/src/app.ts`
- Create: `apps/server/src/health.ts`
- Create: `apps/server/test/health.test.ts`
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/App.test.tsx`
- Create: `docs-public/architecture.md`

**Interfaces:**

- `createServerApp(): { app: unknown; close(): Promise<void> }` exposes a testable server boundary without introducing Admin API or MCP behavior.
- `GET /health/live` returns a stable local liveness response; readiness/database checks remain explicitly unimplemented until Phase 1.
- `App` renders a public placeholder identifying the Phase 0 shell and does not expose configuration or downstream-call controls.

- [ ] **Step 1: Write failing health and render tests**

  Add a server test asserting `GET /health/live` returns HTTP 200 and a web test asserting the Phase 0 shell renders without private configuration values.

- [ ] **Step 2: Run the focused tests to verify failure**

  Run `npm test -- apps/server/test/health.test.ts apps/web/src/App.test.tsx`.
  Expected: FAIL because the application entry points do not exist.

- [ ] **Step 3: Implement the minimal skeleton**

  Add a small server app with only liveness handling, a Node entry point, and a React shell. Keep server, MCP adapter, domain, persistence, security, and admin modules as documented boundaries rather than creating placeholder business logic.

- [ ] **Step 4: Run focused tests and build**

  Run `npm test -- apps/server/test/health.test.ts apps/web/src/App.test.tsx` and `npm run build`.
  Expected: PASS with no real downstream network access.

- [ ] **Step 5: Commit the skeleton**

  Run `git add apps docs-public/architecture.md` and commit with `chore: add phase 0 application skeletons`.

### Task 3: Add PostgreSQL Compose and CI quality gates

**Files:**

- Create: `docker-compose.yml`
- Create: `.github/workflows/ci.yml`
- Create: `docs-public/development.md`
- Modify: `package.json`

**Interfaces:**

- `docker compose config` validates a local PostgreSQL service without application secrets or production hosts.
- CI runs the same `verify:private`, `lint`, `format:check`, `test`, and `build` scripts used locally.

- [ ] **Step 1: Add configuration checks before implementation**

  Extend the repository verification test to reject production hostnames, credential-shaped values, and private design paths in tracked public files.

- [ ] **Step 2: Run the focused verification and observe failure**

  Run `npm run verify:private`.
  Expected: FAIL until the scan and Compose/CI configuration are present and valid.

- [ ] **Step 3: Implement local infrastructure and CI**

  Add PostgreSQL Compose with a local-only service, non-secret example defaults, a named volume for disposable development data, and no Redis. Add GitHub Actions using Node setup, dependency install, and the exact local quality commands. Document startup and teardown without claiming migrations or readiness behavior.

- [ ] **Step 4: Verify infrastructure and quality gates**

  Run `docker compose config`, `npm run verify:private`, `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`.
  Expected: all pass; no real service is contacted by tests.

- [ ] **Step 5: Commit infrastructure**

  Run `git add docker-compose.yml .github/ package.json docs-public/development.md scripts/` and commit with `chore: add phase 0 ci and postgres compose`.

### Task 4: Validate both MCP SDK protocol versions with local virtual examples

**Files:**

- Create: `apps/server/src/mcp-probe.ts`
- Create: `apps/server/test/mcp-probe.test.ts`
- Create: `docs-public/mcp-protocol-matrix.md`
- Modify: `apps/server/package.json`
- Modify: `package.json`

**Interfaces:**

- `runMcpProbe(protocolVersion: string): Promise<ProbeResult>` runs a local in-memory or loopback virtual server/client exchange and returns observed initialize, tools/list, and tools/call behavior without production networking.
- `ProbeResult` records SDK package version, requested protocol version, transport, HTTP methods observed, lifecycle status, result/error mapping observations, and unresolved T-001/T-002 items.

- [ ] **Step 1: Write failing protocol matrix tests**

  Add one test per required version asserting the probe reports the requested version, uses Streamable HTTP, exposes a deterministic local tool, and records the result without contacting a non-loopback host.

- [ ] **Step 2: Run the tests to verify failure**

  Run `npm test -- apps/server/test/mcp-probe.test.ts`.
  Expected: FAIL because the SDK dependency and probe are not yet configured.

- [ ] **Step 3: Pin and implement the official SDK probe**

  Pin the SDK version only after checking its published API and TypeScript types locally. Use the official SDK lifecycle and transport implementation; do not hand-write MCP protocol framing. Keep the probe tool virtual, return a small JSON result, and reject any non-loopback endpoint configuration.

- [ ] **Step 4: Run both protocol probes and capture evidence**

  Run `npm test -- apps/server/test/mcp-probe.test.ts` and the explicit probe command for `2025-11-25` and `2026-07-28`. Record actual output in `docs-public/mcp-protocol-matrix.md`. If the SDK cannot support either version, record `DECISION REQUIRED` with the exact package/version/error instead of adding a custom protocol stack.

- [ ] **Step 5: Verify the complete Phase 0 gate**

  Run `npm run verify:private`, `docker compose config`, `npm run lint`, `npm run format:check`, `npm test`, and `npm run build`. Confirm no production URL, credential, token, private design file, or business-call bypass appears in tracked files.

- [ ] **Step 6: Commit the protocol evidence**

  Run `git add apps/server package.json package-lock.json docs-public/mcp-protocol-matrix.md` and commit with `test: validate dual mcp protocol sdk support`.

## Phase 0 Exit Report

Before claiming completion, report the exact files changed, commands actually run, test/build/Compose results, SDK package and version, observed behavior for both protocol versions, unresolved T-001/T-002 items, and the explicit non-goals that remain for Phase 1. Do not report SDK compatibility or protocol behavior that was not observed in the local probe.

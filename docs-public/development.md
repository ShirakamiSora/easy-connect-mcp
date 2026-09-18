# Local development

Phase 0 provides a local PostgreSQL service for future development. It does not
run business services, perform migrations, or contact production services. The
backend health endpoint and the web shell are available for local smoke testing.

## Local application

Run the backend with `npm run dev` and check `http://127.0.0.1:3000/health/live`.
In another terminal, run `npm --prefix apps/web run dev` for the React/Vite shell.
`npm run build` performs the TypeScript check and builds the web bundle.

## PostgreSQL

Start the disposable development database from the repository root:

```text
docker compose up -d postgres
```

The service binds only to `127.0.0.1`. The default database, user, password, and
port are local examples and can be overridden with environment variables. Do not
place real credentials or production endpoints in repository files.

Stop the service while retaining its named volume:

```text
docker compose down
```

To remove the local database volume as well, use `docker compose down --volumes`.
This data is disposable development state; Phase 0 has no migration workflow.

## Quality checks

Install dependencies and run the same checks used by CI:

```text
npm install
npm run verify:private
npm run lint
npm run format:check
npm test
npm run build
```

The public verifier checks repository paths and scans public configuration and
documentation for private design files, production-style hosts, and hard-coded
credential-shaped values.

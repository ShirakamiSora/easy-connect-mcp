# MCP protocol validation matrix

This Phase 0 evidence uses `@modelcontextprotocol/sdk@1.30.0`, the official TypeScript SDK, and its `McpServer`, `Client`, `StreamableHTTPServerTransport`, and `StreamableHTTPClientTransport` APIs. The probe binds only to `127.0.0.1`; it does not call a production host. HTTP request bodies are passed to the SDK transport, so the probe does not implement MCP/JSON-RPC framing.

| Requested version | SDK evidence                                                                                                                       | Transport                                                                             | Observed result                                                                                                                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `2025-11-25`      | `LATEST_PROTOCOL_VERSION=2025-11-25`; included in `SUPPORTED_PROTOCOL_VERSIONS`; client transport reported negotiated `2025-11-25` | Streamable HTTP                                                                       | Observed locally: `initialize`, `tools/list`, `tools/call`; deterministic `probe_echo` returned `probe-ok`; methods were `POST`, `POST`, `GET`, `POST`, `POST`; non-loopback contact: `false`. The route passes supported methods to the official transport. |
| `2026-07-28`      | `SUPPORTED_PROTOCOL_VERSIONS=["2025-11-25","2025-06-18","2025-03-26","2024-11-05","2024-10-07"]`; requested version absent         | Streamable HTTP API is present, but this protocol version is not supported by the SDK | **DECISION REQUIRED:** the official SDK `Client` has no `protocolVersion` constructor option and always sends `LATEST_PROTOCOL_VERSION` during initialize. Do not claim support or add custom framing. No exchange was attempted for this version.           |

## Reproduction

```text
npm test -- apps/server/test/mcp-probe.test.ts
```

Result from the current run: 2 tests passed.

```text
npm --prefix apps/server run probe:mcp
```

Observed output from the current run for `2025-11-25`:

```json
{
  "sdkPackage": "@modelcontextprotocol/sdk",
  "sdkVersion": "1.30.0",
  "requestedProtocolVersion": "2025-11-25",
  "negotiatedProtocolVersion": "2025-11-25",
  "transport": "Streamable HTTP",
  "endpoint": "http://127.0.0.1:14293/mcp",
  "httpMethodsObserved": ["POST", "POST", "GET", "POST", "POST"],
  "lifecycle": ["initialize", "tools/list", "tools/call"],
  "status": "observed",
  "nonLoopbackNetworkContacted": false,
  "toolName": "probe_echo",
  "toolResult": { "content": [{ "type": "text", "text": "probe-ok" }] }
}
```

The loopback port is ephemeral and may differ on another run. The `2026-07-28` run records `status=decision-required` with the SDK constants and client API limitation above; it does not claim an observed exchange.

T-001 remains open for `2026-07-28`: select a future official SDK release that exports and negotiates that version, then rerun the initialize/list/call lifecycle probe. T-002 remains open for both versions: verify JSON result/error wrapping, empty responses, cursor format, stable ordering, and the application-to-HTTP/JSON-RPC/tool-error mapping. This matrix is evidence for those items, not a complete MCP contract. Phase 0 does not implement Admin API, persistence, executor, production networking, or Phase 1 behavior.

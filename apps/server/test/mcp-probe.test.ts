// @vitest-environment node

import { describe, expect, it } from "vitest";
import { runMcpProbe, REQUIRED_PROTOCOL_VERSIONS } from "../src/mcp-probe.js";

describe("MCP protocol probes", () => {
  for (const protocolVersion of REQUIRED_PROTOCOL_VERSIONS) {
    it(`probes ${protocolVersion} through local Streamable HTTP`, async () => {
      const result = await runMcpProbe(protocolVersion);

      expect(result.requestedProtocolVersion).toBe(protocolVersion);
      expect(result.transport).toBe("Streamable HTTP");
      expect(result.endpoint).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
      expect(result.nonLoopbackNetworkContacted).toBe(false);
      if (protocolVersion === "2025-11-25") {
        expect(result.status).toBe("observed");
        expect(result.httpMethodsObserved).toContain("POST");
        expect(
          result.httpMethodsObserved.every((method) => ["POST", "GET", "DELETE"].includes(method)),
        ).toBe(true);
        expect(result.negotiatedProtocolVersion).toBe("2025-11-25");
        expect(result.lifecycle).toEqual(["initialize", "tools/list", "tools/call"]);
        expect(result.toolName).toBe("probe_echo");
        expect(result.toolResult).toEqual({ content: [{ type: "text", text: "probe-ok" }] });
      } else {
        expect(result.status).toBe("decision-required");
        expect(result.decisionRequired).toContain("2026-07-28");
        expect(result.negotiatedProtocolVersion).toBeUndefined();
        expect(result.lifecycle).toEqual([]);
      }
    });
  }
});

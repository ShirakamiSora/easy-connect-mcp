import { createServer, type IncomingMessage } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  isInitializeRequest,
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const REQUIRED_PROTOCOL_VERSIONS = ["2025-11-25", "2026-07-28"] as const;

export type ProbeResult = {
  sdkPackage: "@modelcontextprotocol/sdk";
  sdkVersion: string;
  requestedProtocolVersion: string;
  negotiatedProtocolVersion?: string;
  transport: "Streamable HTTP";
  endpoint: string;
  httpMethodsObserved: string[];
  lifecycle: string[];
  status: "observed" | "decision-required";
  toolName?: string;
  toolResult?: unknown;
  nonLoopbackNetworkContacted: false;
  decisionRequired?: string;
};

const lockfile = JSON.parse(
  readFileSync(new URL("../../../package-lock.json", import.meta.url), "utf8"),
) as { packages?: Record<string, { version?: string }> };
const resolvedSdkVersion = lockfile.packages?.["node_modules/@modelcontextprotocol/sdk"]?.version;
if (!resolvedSdkVersion) throw new Error("SDK version is missing from package-lock.json");
const sdkVersion: string = resolvedSdkVersion;

function parseBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => (body += chunk));
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : undefined);
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

export async function runMcpProbe(protocolVersion: string): Promise<ProbeResult> {
  const base: ProbeResult = {
    sdkPackage: "@modelcontextprotocol/sdk",
    sdkVersion,
    requestedProtocolVersion: protocolVersion,
    transport: "Streamable HTTP",
    endpoint: "http://127.0.0.1:0/mcp",
    httpMethodsObserved: [],
    lifecycle: [],
    status: "decision-required",
    nonLoopbackNetworkContacted: false,
  };

  if (!SUPPORTED_PROTOCOL_VERSIONS.includes(protocolVersion)) {
    return {
      ...base,
      decisionRequired: `DECISION REQUIRED: @modelcontextprotocol/sdk@${sdkVersion} exports LATEST_PROTOCOL_VERSION=${LATEST_PROTOCOL_VERSION} and SUPPORTED_PROTOCOL_VERSIONS=${JSON.stringify(SUPPORTED_PROTOCOL_VERSIONS)}; requested ${protocolVersion} is unavailable in this SDK. The official SDK Client has no protocolVersion constructor option and always sends LATEST_PROTOCOL_VERSION during initialize, so the requested version cannot be negotiated. No probe was claimed for this version.`,
    };
  }

  const methods: string[] = [];
  const transports = new Map<string, StreamableHTTPServerTransport>();
  const makeServer = () => {
    const server = new McpServer({ name: "local-mcp-probe", version: "0.0.0" });
    server.registerTool(
      "probe_echo",
      {
        description: "Deterministic local probe tool",
        inputSchema: { value: z.string().optional() },
      },
      async () => ({ content: [{ type: "text", text: "probe-ok" }] }),
    );
    return server;
  };

  const httpServer = createServer(async (request, response) => {
    methods.push(request.method ?? "UNKNOWN");
    if (request.url !== "/mcp") {
      response.writeHead(404).end();
      return;
    }
    const body = request.method === "POST" ? await parseBody(request) : undefined;
    const sessionHeader = request.headers["mcp-session-id"];
    const sessionId = typeof sessionHeader === "string" ? sessionHeader : undefined;
    let transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport && request.method === "POST" && isInitializeRequest(body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: randomUUID,
        onsessioninitialized: (id) => {
          transports.set(id, transport as StreamableHTTPServerTransport);
        },
      });
      await makeServer().connect(transport);
    }
    if (!transport) {
      response.writeHead(400, { "content-type": "application/json" }).end();
      return;
    }
    await transport.handleRequest(request, response, body);
  });

  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const address = httpServer.address();
  if (!address || typeof address === "string") throw new Error("probe did not bind loopback");
  const endpoint = `http://127.0.0.1:${address.port}/mcp`;
  const client = new Client({ name: "local-mcp-probe-client", version: "0.0.0" });
  const clientTransport = new StreamableHTTPClientTransport(new URL(endpoint));
  try {
    await client.connect(clientTransport);
    base.lifecycle.push("initialize");
    await client.listTools();
    base.lifecycle.push("tools/list");
    const toolResult = await client.callTool({ name: "probe_echo", arguments: { value: "probe" } });
    base.lifecycle.push("tools/call");
    return {
      ...base,
      endpoint,
      negotiatedProtocolVersion: clientTransport.protocolVersion,
      httpMethodsObserved: methods,
      status: "observed",
      toolName: "probe_echo",
      toolResult,
    };
  } finally {
    await clientTransport.close();
    await Promise.all([...transports.values()].map((transport) => transport.close()));
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

if (process.argv[1]?.endsWith("mcp-probe.ts")) {
  for (const protocolVersion of REQUIRED_PROTOCOL_VERSIONS) {
    console.log(JSON.stringify(await runMcpProbe(protocolVersion)));
  }
}

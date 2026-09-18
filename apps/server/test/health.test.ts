import { request } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createServerApp } from "../src/app.js";

const runningApps: Array<Awaited<ReturnType<typeof createServerApp>>> = [];

afterEach(async () => {
  await Promise.all(runningApps.splice(0).map(({ close }) => close()));
});

describe("server liveness boundary", () => {
  it("returns a stable response from GET /health/live", async () => {
    const serverApp = await createServerApp({ listen: { host: "127.0.0.1", port: 0 } });
    runningApps.push(serverApp);
    const address = serverApp.server.address();
    if (!address || typeof address === "string") throw new Error("server did not bind");

    const response = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
      const requestClient = request(
        { host: address.address, port: address.port, path: "/health/live" },
        (response) => {
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => (body += chunk));
          response.on("end", () => resolve({ statusCode: response.statusCode, body }));
        },
      );
      requestClient.on("error", reject);
      requestClient.end();
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: "ok" });
  });

  it("allows close to be called repeatedly", async () => {
    const serverApp = await createServerApp({ listen: { host: "127.0.0.1", port: 0 } });
    runningApps.push(serverApp);

    await serverApp.close();
    await expect(serverApp.close()).resolves.toBeUndefined();
  });
});

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { handleLiveHealth } from "./health.js";

type ServerAppOptions = { listen?: { host: string; port: number } };

export async function createServerApp(options: ServerAppOptions = {}): Promise<{
  app: Server;
  server: Server;
  close: () => Promise<void>;
}> {
  const app = createServer((request: IncomingMessage, response: ServerResponse) => {
    if (request.method === "GET" && request.url === "/health/live") {
      handleLiveHealth(response);
      return;
    }
    response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "not found" }));
  });
  const listen = options.listen ?? { host: "127.0.0.1", port: 3000 };
  await new Promise<void>((resolve, reject) => {
    app.once("error", reject);
    app.listen(listen.port, listen.host, () => {
      app.off("error", reject);
      resolve();
    });
  });
  let closePromise: Promise<void> | undefined;
  const close = (): Promise<void> => {
    if (closePromise) return closePromise;
    if (!app.listening) return Promise.resolve();
    closePromise = new Promise<void>((resolve, reject) => {
      app.close((error) => {
        if (error && (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING") {
          reject(error);
          return;
        }
        resolve();
      });
    });
    return closePromise;
  };
  return {
    app,
    server: app,
    close,
  };
}

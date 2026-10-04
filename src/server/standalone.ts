import express from "express";
import path from "node:path";
import type { Server } from "node:http";
import { registerApiRoutes } from "./api-routes.js";

export interface StandaloneServerOptions {
  staticDir: string;
  host?: string;
  port?: number;
}

export interface StandaloneServerHandle {
  port: number;
  server: Server;
  close: () => Promise<void>;
}

export async function startStandaloneServer(
  opts: StandaloneServerOptions,
): Promise<StandaloneServerHandle> {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  registerApiRoutes(app);

  const staticDir = path.resolve(opts.staticDir);
  app.use(express.static(staticDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(
      opts.port ?? 0,
      opts.host ?? "127.0.0.1",
      () => {
        const addr = server.address();
        const port =
          typeof addr === "object" && addr?.port ? addr.port : 4321;
        resolve({
          port,
          server,
          close: () =>
            new Promise((r, j) => server.close((e) => (e ? j(e) : r()))),
        });
      },
    );
    server.on("error", reject);
  });
}

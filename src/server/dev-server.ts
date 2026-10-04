import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import { getProjectRoot } from "../config/paths.js";
import { registerApiRoutes } from "./api-routes.js";

const PORT = Number(process.env.PORT) || 4321;

async function start() {
  const root = getProjectRoot();
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  registerApiRoutes(app);

  const vite = await createViteServer({
    configFile: path.join(root, "vite.config.ts"),
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) return next();
    try {
      const url = req.originalUrl;
      const template = await fs.readFile(
        path.join(root, "src/ui/index.html"),
        "utf-8",
      );
      const html = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  app.listen(PORT, () => {
    console.log(`Cody1StoreKit dev server → http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});

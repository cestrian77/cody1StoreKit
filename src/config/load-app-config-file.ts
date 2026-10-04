import { createJiti } from "jiti";
import { getProjectRoot } from "./paths.js";

let jiti: ReturnType<typeof createJiti> | null = null;

function getJiti() {
  if (!jiti) {
    jiti = createJiti(getProjectRoot(), {
      interopDefault: true,
      moduleCache: false,
    });
  }
  return jiti;
}

export function importAppConfigModule(configPath: string): unknown {
  if (process.env.STOREKIT_PACKAGED) {
    throw new Error(
      "TypeScript app configs are not supported in the packaged app. Use app.config.json.",
    );
  }
  return getJiti()(configPath);
}

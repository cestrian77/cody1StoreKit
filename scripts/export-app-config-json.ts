import { loadAppConfig, saveAppConfig } from "../src/config/load-app.js";

async function main() {
  const appId = process.argv[2] ?? "example";
  const config = await loadAppConfig(appId);
  await saveAppConfig(appId, config);
  console.log(`Wrote apps/${appId}/app.config.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

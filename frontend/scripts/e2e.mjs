import { spawnSync } from "node:child_process";

// Build the browser's signaling URL for the isolated test backend on all OSes.
const env = { ...process.env, NEXT_PUBLIC_WS_URL: "ws://localhost:8004" };
for (const [entry, args] of [
  ["node_modules/next/dist/bin/next", ["build", "--webpack"]],
  ["node_modules/@playwright/test/cli.js", ["test", ...process.argv.slice(2)]],
]) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

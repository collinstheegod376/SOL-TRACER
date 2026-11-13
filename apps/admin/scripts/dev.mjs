import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const file = readFileSync(new URL("../.env", import.meta.url), "utf8");
const env = {};
for (const line of file.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
  const index = trimmed.indexOf("=");
  env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
}

const port = env.PORT || "3301";
const child = spawn(
  process.execPath,
  ["./node_modules/next/dist/bin/next", "dev", "-p", port],
  { stdio: "inherit", env: { ...process.env, ...env, PORT: port } },
);

child.on("exit", (code) => process.exit(code ?? 0));

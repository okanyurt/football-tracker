import { spawn } from "node:child_process";

const apiUrl = process.env.API_HEALTH_URL ?? "http://localhost:3001/api/auth/me";
const timeoutMs = Number(process.env.API_WAIT_TIMEOUT_MS ?? 30_000);
const intervalMs = 500;
const startedAt = Date.now();

async function waitForApi() {
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await fetch(apiUrl);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(`API ${timeoutMs}ms içinde cevap vermedi: ${apiUrl}`);
}

try {
  await waitForApi();
  console.log(`API hazır: ${apiUrl}`);

  const child = spawn("npm", ["run", "dev:client"], {
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

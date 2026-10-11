import { spawn } from "node:child_process";
import {
  mkdirSync,
  openSync,
  closeSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { resolve } from "node:path";
import net from "node:net";
const port = Number(process.env.PORT || 5189),
  url = `http://127.0.0.1:${port}`;
if (!existsSync("dist/index.html")) throw new Error("Run npm run build first.");
try {
  const r = await fetch(url, { signal: AbortSignal.timeout(1000) });
  if (r.headers.get("x-cinderwake") === "1") {
    console.log(`Already running: ${url}`);
    process.exit(0);
  }
} catch {}
await new Promise((ok, no) => {
  const probe = net.createServer();
  probe.once("error", (e) =>
    no(
      new Error(
        e.code === "EADDRINUSE"
          ? `Port ${port} is occupied; no server was changed.`
          : `Cannot bind local port ${port}: ${e.code}. No server was changed.`,
      ),
    ),
  );
  probe.listen(port, "127.0.0.1", () => probe.close(ok));
});
mkdirSync(".play", { recursive: true });
const log = openSync(".play/server.log", "a");
const child = spawn(process.execPath, [resolve("scripts/serve.mjs")], {
  cwd: process.cwd(),
  detached: true,
  stdio: ["ignore", log, log],
  env: { ...process.env, PORT: String(port) },
});
child.unref();
closeSync(log);
writeFileSync(
  ".play/server.json",
  JSON.stringify(
    {
      pid: child.pid,
      port,
      cwd: process.cwd(),
      url,
      started: new Date().toISOString(),
    },
    null,
    2,
  ),
);
let ready = false;
for (let i = 0; i < 30; i++) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(500) });
    if (r.status === 200 && r.headers.get("x-cinderwake") === "1") {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 100));
}
if (!ready)
  throw new Error("Server did not become healthy; see .play/server.log.");
console.log(`Detached session server PID ${child.pid}: ${url}`);

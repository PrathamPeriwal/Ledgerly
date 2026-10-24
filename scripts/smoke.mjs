import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

function startServer(port) {
  const nextBin = path.join("node_modules", "next", "dist", "bin", "next");
  return spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
    cwd: process.cwd(),
    // next start is production, so the loopback request has no client IP and
    // Arcjet rejects it. ARCJET_ENV is Arcjet's documented local override.
    // Do not pin -H 127.0.0.1: Next's origin becomes that host while middleware
    // rewrites to localhost, and the router proxies to itself until it 500s.
    // next start is production, so Inngest cloud mode answers 401 unless the
    // request is signed, and that body does not list function ids. Dev mode
    // returns the introspection JSON (function_count) without a signing key.
    env: { ...process.env, ARCJET_ENV: "development", INNGEST_DEV: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

function functionIdsIn(body) {
  if (!body || typeof body !== "object" || !Array.isArray(body.functions)) return null;
  const ids = body.functions
    .map((fn) => (fn && typeof fn.id === "string" ? fn.id : ""))
    .filter(Boolean);
  return ids.length > 0 ? ids : null;
}

function stopServer(child) {
  if (!child || child.exitCode != null) return Promise.resolve();

  return new Promise((resolve) => {
    const done = () => resolve();
    child.once("exit", done);

    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
        windowsHide: true,
      });
      killer.on("error", () => {
        child.kill();
      });
    } else {
      child.kill("SIGTERM");
    }

    setTimeout(done, 8000);
  });
}

async function waitUntilReady(base, child, getLogs) {
  const deadline = Date.now() + 90000;
  let lastError = "no response";

  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(`next start exited with code ${child.exitCode}`);
    }

    if (!getLogs().includes("Ready")) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      continue;
    }

    try {
      const res = await fetch(`${base}/`, {
        headers: { "user-agent": BROWSER_UA },
        redirect: "manual",
      });
      await res.arrayBuffer().catch(() => {});
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error(`server was not ready: ${lastError}`);
}

async function main() {
  const port = await freePort();
  const base = `http://localhost:${port}`;
  const child = startServer(port);
  let logs = "";
  let ready = false;

  const onData = (chunk) => {
    const text = chunk.toString();
    if (text.includes("Ready")) ready = true;
    logs += text;
    if (logs.length > 8000) logs = logs.slice(-8000);
  };
  child.stdout?.on("data", onData);
  child.stderr?.on("data", onData);

  const failures = [];

  try {
    await waitUntilReady(base, child, () => (ready ? "Ready" : logs));

    const headers = { "user-agent": BROWSER_UA };

    const seed = await fetch(`${base}/api/seed`, { headers, redirect: "manual" });
    await seed.arrayBuffer().catch(() => {});
    if (seed.status !== 404) {
      failures.push(`GET /api/seed returned ${seed.status}, expected 404`);
    }

    const scan = await fetch(`${base}/api/scan-receipt`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ base64: "aGVsbG8=", mimeType: "image/png" }),
      redirect: "manual",
    });
    const scanText = await scan.text();
    if (scan.status >= 200 && scan.status < 300) {
      failures.push(`POST /api/scan-receipt returned ${scan.status}, expected non-2xx`);
    }
    if (/"amount"\s*:/.test(scanText) || /"merchantName"/.test(scanText)) {
      failures.push("POST /api/scan-receipt returned receipt data without auth");
    }

    const debug = await fetch(`${base}/debug-auth`, { headers, redirect: "manual" });
    await debug.arrayBuffer().catch(() => {});
    if (debug.status !== 404) {
      failures.push(`GET /debug-auth returned ${debug.status}, expected 404`);
    }

    const home = await fetch(`${base}/`, { headers, redirect: "manual" });
    await home.arrayBuffer().catch(() => {});
    if (home.status !== 200) {
      failures.push(`GET / returned ${home.status}, expected 200`);
    }

    const expectedFunctionIds = [
      "process-recurring-transaction",
      "trigger-recurring-transactions",
      "generate-monthly-reports",
      "check-budget-alerts",
      "process-budget-alert",
      "process-monthly-report",
      "demo-reset",
    ];
    const inngestRes = await fetch(`${base}/api/inngest`, { headers, redirect: "manual" });
    const inngestText = await inngestRes.text();
    if (inngestRes.status !== 200) {
      failures.push(`GET /api/inngest returned ${inngestRes.status}, expected 200`);
    } else {
      let body = null;
      try {
        body = JSON.parse(inngestText);
      } catch {
        failures.push("GET /api/inngest did not return JSON");
      }
      const listed = functionIdsIn(body);
      if (listed) {
        for (const id of expectedFunctionIds) {
          if (!listed.includes(id)) failures.push(`GET /api/inngest missing function ${id}`);
        }
      } else if (!body || body.function_count !== expectedFunctionIds.length) {
        failures.push(
          `GET /api/inngest function_count ${body ? body.function_count : "missing"}, expected ${expectedFunctionIds.length}`,
        );
      }
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  } finally {
    await stopServer(child);
  }

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    if (logs.trim()) {
      console.error("--- next start ---");
      console.error(logs.trim());
    }
    process.exit(1);
  }

  console.log(
    `smoke ok on ${base}: /api/seed 404, /api/scan-receipt unauthorized, /debug-auth 404, / 200, /api/inngest 200`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

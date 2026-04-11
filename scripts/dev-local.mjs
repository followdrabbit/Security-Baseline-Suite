import { spawn } from "node:child_process";
import process from "node:process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const apiProcess = spawn(process.execPath, ["local-api/server.mjs"], {
  stdio: "inherit",
  env: process.env,
});

const webProcess = spawn(npmCommand, ["run", "dev"], {
  stdio: "inherit",
  env: process.env,
});

let shuttingDown = false;

function stopAll(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (!apiProcess.killed) {
    apiProcess.kill("SIGINT");
  }
  if (!webProcess.killed) {
    webProcess.kill("SIGINT");
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 250);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

apiProcess.on("exit", (code) => {
  if (!shuttingDown && code && code !== 0) {
    // eslint-disable-next-line no-console
    console.error(`[dev:local] local API exited with code ${code}`);
    stopAll(code);
  }
});

webProcess.on("exit", (code) => {
  stopAll(code ?? 0);
});

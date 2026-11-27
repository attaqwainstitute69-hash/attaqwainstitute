// `npm run dev:all`: the Express API (backend/, port 5000) and Next.js (port 3000) together.
// Login, registration and enrollment call the API from the browser, so `next dev` alone is not enough.
import { spawn } from "node:child_process";

const procs = [
  spawn("npm", ["--prefix", "backend", "run", "dev"], { stdio: "inherit", shell: true }),
  spawn("npx", ["next", "dev"], { stdio: "inherit", shell: true }),
];

// One exits (crash or Ctrl+C) → stop the other too.
const stopAll = (code) => {
  for (const p of procs) if (p.exitCode === null) p.kill();
  process.exit(code ?? 0);
};
for (const p of procs) p.on("exit", stopAll);
process.on("SIGINT", () => stopAll(0));

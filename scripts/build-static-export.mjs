import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const projectRoot = process.cwd();
const nextDir = resolve(projectRoot, ".next");
const outDir = resolve(projectRoot, "out");
const hiddenRoot = resolve(projectRoot, ".next-static-export-hidden");
const require = createRequire(import.meta.url);
const hiddenEntries = [
  ["src", "app", "admin"],
  ["src", "app", "api"]
].map((segments) => ({
  source: resolve(projectRoot, ...segments),
  target: resolve(hiddenRoot, segments.join("__"))
}));

function assertInsideProject(path) {
  if (!path.startsWith(projectRoot)) {
    throw new Error(`Refusing to touch path outside project root: ${path}`);
  }
}

function restoreDynamicRoutes() {
  for (const { source, target } of hiddenEntries) {
    if (existsSync(target) && !existsSync(source)) {
      renameSync(target, source);
    }
  }

  rmSync(hiddenRoot, { recursive: true, force: true });
}

function failWithRestore(error) {
  restoreDynamicRoutes();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

try {
  assertInsideProject(outDir);
  assertInsideProject(nextDir);
  assertInsideProject(hiddenRoot);

  rmSync(nextDir, { recursive: true, force: true });
  rmSync(outDir, { recursive: true, force: true });
  restoreDynamicRoutes();
  mkdirSync(hiddenRoot, { recursive: true });

  for (const { source, target } of hiddenEntries) {
    assertInsideProject(source);
    assertInsideProject(target);

    if (existsSync(source)) {
      renameSync(source, target);
    }
  }
} catch (error) {
  failWithRestore(error);
}

const nextCli = require.resolve("next/dist/bin/next");
const build = spawn(process.execPath, [nextCli, "build"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NEXT_OUTPUT_MODE: "export"
  },
  shell: false,
  stdio: "inherit"
});

process.on("SIGINT", () => {
  restoreDynamicRoutes();
  process.exit(130);
});

process.on("SIGTERM", () => {
  restoreDynamicRoutes();
  process.exit(143);
});

build.on("close", (code) => {
  restoreDynamicRoutes();
  process.exit(code ?? 1);
});

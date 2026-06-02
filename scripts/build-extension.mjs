import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const manifest = await import(`${root}/manifest.json`, { with: { type: "json" } });
const version = manifest.default.version;
const distDir = join(root, "dist");
const extensionDir = join(distDir, "extension");
const zipPath = join(distDir, `oe-extension-v${version}.zip`);

await rm(distDir, { recursive: true, force: true });
await mkdir(extensionDir, { recursive: true });

for (const path of ["manifest.json", "src", "icons", "README.md", "LICENSE"]) {
  if (existsSync(join(root, path))) {
    await cp(join(root, path), join(extensionDir, path), { recursive: true });
  }
}

execFileSync("zip", ["-qr", zipPath, "."], { cwd: extensionDir, stdio: "inherit" });

console.log(`Built ${zipPath}`);

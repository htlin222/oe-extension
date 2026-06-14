import { readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const testsDir = join(root, "tests");

const files = (await readdir(testsDir)).filter((name) => name.endsWith(".test.mjs")).sort();

let failed = 0;
for (const file of files) {
  try {
    execFileSync(process.execPath, [join(testsDir, file)], { stdio: "inherit" });
    console.log(`ok   ${file}`);
  } catch {
    console.error(`FAIL ${file}`);
    failed += 1;
  }
}

console.log(`\n${files.length - failed}/${files.length} test files passed`);
if (failed > 0) {
  process.exit(1);
}

import { execFileSync } from "node:child_process";
import { glob } from "glob";

const files = await glob("src/**/*.{js,mjs,cjs}", { ignore: "node_modules/**" });

let failed = 0;

for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (err) {
    failed++;
    console.error(`✖ ${file}`);
    console.error(err.stderr?.toString() ?? err.message);
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${files.length} file(s) failed syntax check`);
  process.exit(1);
}

console.log(`✔ ${files.length} file(s) passed syntax check`);

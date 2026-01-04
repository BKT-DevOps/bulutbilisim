import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const topicsDir = "topics";
if (!fs.existsSync(topicsDir)) {
  console.error(`❌ topics directory not found: ${topicsDir}`);
  process.exit(1);
}

const configs = walk(topicsDir).filter(f => f.endsWith(".config.json"));

if (configs.length === 0) {
  console.error("❌ No *.config.json found under topics/");
  process.exit(1);
}

console.log("=====================================");
console.log("🧾 Build ALL Configs");
configs.forEach(c => console.log(" -", c));
console.log("=====================================");

for (const cfg of configs) {
  console.log(`\n▶️ Building: ${cfg}`);
  const r = spawnSync("node", ["scripts/build.mjs", "--config", cfg], { stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`❌ Failed: ${cfg}`);
    process.exit(r.status || 1);
  }
}

console.log("\n✅ All builds finished.");

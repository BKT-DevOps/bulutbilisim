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

const topicsDirLower = "topics";
const topicsDirUpper = "Topics";
let configs = [];

if (fs.existsSync(topicsDirLower)) {
  configs = configs.concat(
    walk(topicsDirLower).filter((f) => f.endsWith(".config.json"))
  );
}

if (fs.existsSync(topicsDirUpper)) {
  configs = configs.concat(
    walk(topicsDirUpper).filter((f) => f.endsWith(".config.json"))
  );
}

if (configs.length === 0) {
  console.error("❌ No *.config.json found under topics/ or Topics/");
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

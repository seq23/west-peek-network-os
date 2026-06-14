import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const zip = process.argv[2];
if (!zip) {
  console.log("ARTIFACT SOURCE PARITY: DEFERRED (no ZIP argument)");
  process.exit(0);
}
if (!fs.existsSync(zip)) {
  console.error(`ARTIFACT SOURCE PARITY: FAIL\nZIP not found: ${zip}`);
  process.exit(1);
}

const contract = JSON.parse(fs.readFileSync("_artifact_parity_contract.json", "utf8"));
const entries = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);

const topRoots = [...new Set(entries.map((entry) => entry.split("/")[0]).filter(Boolean))];
const hasFlatPackage = entries.includes("package.json");
let prefix = "";
if (!hasFlatPackage) {
  const packageEntries = entries.filter((entry) => entry.endsWith("/package.json"));
  if (packageEntries.length !== 1) {
    console.error(`ARTIFACT SOURCE PARITY: FAIL\nExpected one artifact repo root, found ${packageEntries.length}`);
    process.exit(1);
  }
  prefix = packageEntries[0].slice(0, -"package.json".length);
  if (topRoots.length !== 1) {
    console.error(`ARTIFACT SOURCE PARITY: FAIL\nExpected one top-level artifact root, found ${topRoots.length}`);
    process.exit(1);
  }
}

const failures = [];
for (const file of contract.critical_files) {
  const sourcePath = path.join(process.cwd(), file);
  if (!fs.existsSync(sourcePath)) {
    failures.push(`source missing ${file}`);
    continue;
  }

  const artifactPath = `${prefix}${file}`;
  let artifactBytes;
  try {
    artifactBytes = execFileSync("unzip", ["-p", zip, artifactPath]);
  } catch {
    failures.push(`artifact missing ${file}`);
    continue;
  }

  const sourceHash = crypto.createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex");
  const artifactHash = crypto.createHash("sha256").update(artifactBytes).digest("hex");
  if (sourceHash !== artifactHash) failures.push(`hash mismatch ${file}`);
}

if (failures.length) {
  console.error(`ARTIFACT SOURCE PARITY: FAIL\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`ARTIFACT SOURCE PARITY: PASS (${contract.critical_files.length} files; root=${prefix || "flat"})`);

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contractPath = path.join(root, "_ui_test_parity_contract.json");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const excluded = new Set(["node_modules", ".git", "dist", "build", "out", "coverage", "artifacts", "test-results", "playwright-report"]);
const files = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.name === "_ui_test_parity_contract.json") continue;
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filePath);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs|md|json)$/.test(entry.name)) files.push(filePath);
  }
}

walk(root);
const corpus = files.map((file) => {
  try { return fs.readFileSync(file, "utf8"); } catch { return ""; }
}).join("\n");
const failures = [];

for (const value of contract.forbidden_stale_strings || []) {
  if (corpus.includes(value)) failures.push(`stale string still present: ${value}`);
}
for (const value of contract.required_current_strings || []) {
  if (!corpus.includes(value)) failures.push(`required current string missing: ${value}`);
}

const gmail = contract.gmail_sync_summary_contract;
if (gmail) {
  const componentPath = path.join(root, gmail.component);
  const testPath = path.join(root, gmail.browser_test);
  const component = fs.readFileSync(componentPath, "utf8");
  const browserTest = fs.readFileSync(testPath, "utf8");

  let previous = -1;
  for (const label of gmail.ordered_labels || []) {
    const index = component.indexOf(label);
    if (index < 0) failures.push(`Gmail summary label missing from component: ${label}`);
    else if (index <= previous) failures.push(`Gmail summary label order drifted at: ${label}`);
    previous = Math.max(previous, index);
  }

  for (const expectation of gmail.required_browser_expectations || []) {
    if (!browserTest.includes(expectation)) {
      failures.push(`Gmail browser expectation missing current ordered summary: ${expectation}`);
    }
  }

  for (const stale of gmail.forbidden_browser_expectations || []) {
    if (browserTest.includes(stale)) failures.push(`stale Gmail browser expectation still present: ${stale}`);
  }

  const interpolationOrder = [
    '${imported}',
    '${duplicates}',
    '${rejectedTier4}',
    '${failedMessages}'
  ];
  previous = -1;
  for (const token of interpolationOrder) {
    const index = component.indexOf(token);
    if (index < 0) failures.push(`Gmail summary interpolation missing: ${token}`);
    else if (index <= previous) failures.push(`Gmail summary interpolation order drifted at: ${token}`);
    previous = Math.max(previous, index);
  }
}

if (failures.length) {
  console.error(`UI/TEST PARITY: FAIL\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`UI/TEST PARITY: PASS (${files.length} files scanned; Gmail result-summary contract aligned)`);

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const requiredDoc = path.join(root, "WEST_PEEK_BRAND_SYSTEM.md");
if (!fs.existsSync(requiredDoc)) failures.push("WEST_PEEK_BRAND_SYSTEM.md is missing");
else {
  const doc = fs.readFileSync(requiredDoc, "utf8");
  if (!doc.includes("#F05A1A")) failures.push("canonical orange #F05A1A missing from brand authority");
  if (!doc.includes("Orange is an accent, not the entire interface")) failures.push("restrained-orange governing rule missing");
}

const logoAsset = path.join(root, 'public/wp-logo.jpg');
if (!fs.existsSync(logoAsset)) failures.push("approved West Peek logo asset is missing: public/wp-logo.jpg");
const logoReferences = ['src/ui/App.tsx', 'src/ui/ThankYouStudio.tsx'];
if (!logoReferences.some((file) => {
  const full = path.join(root, file);
  return fs.existsSync(full) && fs.readFileSync(full, "utf8").includes('/wp-logo.jpg');
})) failures.push("approved West Peek logo is not wired into a primary product shell");

const scanRoots = ["src", "app", "components", "lib", "public", "functions", "tailwind.config.ts"].map((v) => path.join(root, v));
const allowedExt = new Set([".css", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".svg", ".html"]);
const stale = [/#ff6a00/ig, /#f26a21/ig, /#ff7a00/ig];
const forbiddenPrimary = [/text-cyan-300/g, /bg-cyan-300/g, /text-purple-[0-9]+/g, /bg-purple-[0-9]+/g, /text-indigo-[0-9]+/g, /bg-indigo-[0-9]+/g];
function visit(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) { for (const entry of fs.readdirSync(target)) visit(path.join(target, entry)); return; }
  if (!allowedExt.has(path.extname(target)) && path.basename(target) !== "tailwind.config.ts") return;
  const text = fs.readFileSync(target, "utf8");
  for (const pattern of stale) if (pattern.test(text)) failures.push(`stale orange token in ${path.relative(root,target)}`);
  for (const pattern of forbiddenPrimary) if (pattern.test(text)) failures.push(`non-West-Peek primary color utility in ${path.relative(root,target)}`);
}
for (const target of scanRoots) visit(target);
if (failures.length) { console.error("West Peek brand-system validation failed:\n- "+failures.join("\n- ")); process.exit(1); }
console.log("West Peek brand-system validation passed: canonical orange, restrained palette, and authority document present.");

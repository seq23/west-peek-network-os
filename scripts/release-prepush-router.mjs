import { spawnSync } from "node:child_process";
const forced=process.env.RELEASE_EXECUTION_ENV;
const local=forced==="local";
const script=local?"release:prepush:local":"release:prepush:container";
console.log(`release:prepush profile: ${local?"LOCAL_REAL_BROWSER":"CONTAINER_STRUCTURAL"}`);
const r=spawnSync("npm",["run",script],{stdio:"inherit",env:process.env});
process.exit(r.status??1);

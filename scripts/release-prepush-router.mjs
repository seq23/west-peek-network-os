import { spawnSync } from "node:child_process";
const forced=process.env.RELEASE_EXECUTION_ENV;
const local=forced==="local";
const script=local?"release:prepush:local":"release:prepush:container";
console.log(`release:prepush profile: ${local?"LOCAL_REAL_BROWSER":"CONTAINER_STRUCTURAL"}`);
// The generic updater legitimately supplies deployed URLs so it can run later
// postdeploy gates. Local prepush validation must not inherit those URLs: its
// environment doctor and local browser server are explicitly loopback-only.
const childEnv=local
  ? {...process.env,PLAYWRIGHT_BASE_URL:"http://127.0.0.1:3000",SMOKE_BASE_URL:"http://127.0.0.1:3000"}
  : process.env;
if(local) console.log("release:prepush local target: http://127.0.0.1:3000");
const r=spawnSync("npm",["run",script],{stdio:"inherit",env:childEnv});
process.exit(r.status??1);

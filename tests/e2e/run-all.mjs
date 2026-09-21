// Ejecuta todas las baterías e2e en orden y muestra un resumen. Requiere el servidor de pruebas encendido
// (ver tests/README.md). Sale con código 1 si alguna batería falla.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const suites = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".mjs") && !["fixtures.mjs", "run-all.mjs"].includes(f))
  .sort();

let totalOk = 0, totalFail = 0;
const failedSuites = [];
for (const file of suites) {
  const res = spawnSync(process.execPath, [path.join(dir, file)], { encoding: "utf8", env: process.env });
  const out = (res.stdout ?? "") + (res.stderr ?? "");
  const m = out.match(/RESULTADO: (\d+) OK, (\d+) fallas/);
  const ok = m ? Number(m[1]) : 0, fail = m ? Number(m[2]) : 1;
  totalOk += ok;
  totalFail += fail;
  console.log(`${fail === 0 && m ? "✔" : "✘"} ${file.padEnd(34)} ${m ? `${ok} OK, ${fail} fallas` : "no terminó (error)"}`);
  if (fail > 0 || !m) {
    failedSuites.push(file);
    console.log(out.split("\n").filter((l) => /FALLA|Error|error/.test(l)).slice(0, 15).join("\n"));
  }
}
console.log(`\nTOTAL: ${totalOk} OK, ${totalFail} fallas en ${suites.length} baterías`);
process.exit(failedSuites.length ? 1 : 0);

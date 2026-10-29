// Применяет миграции (`prisma migrate deploy`) перед dev и start.
// БД, созданную раньше через `prisma db push`, Prisma отказывается мигрировать (P3005: база не пустая,
// истории миграций нет). Её схема совпадает с 0_init, поэтому помечаем 0_init применённой и повторяем —
// данные не трогаются, дальше накатываются только новые миграции.

import { spawnSync } from "node:child_process";

const BASELINE = "0_init";

function prisma(args: string[]): { ok: boolean; output: string } {
  const res = spawnSync("npx", ["prisma", ...args], { encoding: "utf8", shell: true });
  const output = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  process.stdout.write(output);
  return { ok: res.status === 0, output };
}

let deploy = prisma(["migrate", "deploy"]);
if (!deploy.ok && deploy.output.includes("P3005")) {
  console.log(`[migrate] БД создана через db push — фиксирую базовую миграцию ${BASELINE}`);
  if (!prisma(["migrate", "resolve", "--applied", BASELINE]).ok) process.exit(1);
  deploy = prisma(["migrate", "deploy"]);
}
process.exit(deploy.ok ? 0 : 1);

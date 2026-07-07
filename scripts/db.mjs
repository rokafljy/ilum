/**
 * 일움 DB 실행 도구 — 마이그레이션·운영 SQL을 로컬에서 직접 실행
 * 사용법: node scripts/db.mjs "<SQL문>"  또는  node scripts/db.mjs <sql파일경로>
 * 접속 정보: 프로젝트 루트 .env 의 DATABASE_URL (git 제외 대상)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const arg = process.argv[2];
if (!arg) {
  console.error("사용법: node scripts/db.mjs \"<SQL>\" 또는 node scripts/db.mjs <파일.sql>");
  process.exit(1);
}
const sql = existsSync(arg) ? readFileSync(arg, "utf8") : arg;

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  const res = await client.query(sql);
  for (const r of Array.isArray(res) ? res : [res]) {
    if (r.rows?.length) console.table(r.rows);
    else console.log(`${r.command ?? "OK"} ${r.rowCount ?? ""}`.trim());
  }
} catch (e) {
  console.error("SQL 오류:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

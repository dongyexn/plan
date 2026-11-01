/* 배포본 회귀 — scripts/build-min.mjs 가 만든 판(주석 걷기 + terser)으로 전체 시험을 다시 돈다(1289). 원본 글자를 읽는 시험(정적 감사 · 계산식 읽기)은 뺀다.
   저장소를 임시 폴더로 복사하고 app.js · pet.js · boot-wid.js · index.html 만 배포본으로 바꿔 끼운 뒤 run-all 을 전부(full) 돌린다.
   사용: node scripts/test/run-built.mjs   (TEST_JOBS 는 그대로 넘어간다) */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'calapp-built-'));
const site = path.join(tmp, 'site'), repo = path.join(tmp, 'repo');
const SKIP = new Set(['.git', 'node_modules', '_site', 'dist']);
try {
  let r = spawnSync(process.execPath, [path.join(root, 'scripts/build-min.mjs'), site], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('build-min 실패');
  fs.mkdirSync(repo);
  for (const f of fs.readdirSync(root)) if (!SKIP.has(f)) fs.cpSync(path.join(root, f), path.join(repo, f), { recursive: true });
  if (fs.existsSync(path.join(root, 'node_modules'))) fs.symlinkSync(path.join(root, 'node_modules'), path.join(repo, 'node_modules'), 'dir');
  for (const f of ['app.js', 'pet.js', 'boot-wid.js', 'index.html']) fs.copyFileSync(path.join(site, f), path.join(repo, f));
  console.log('배포본으로 바꿔 끼움 — 전체 시험');
  r = spawnSync(process.execPath, [path.join(repo, 'scripts/test/run-all.mjs')], { cwd: repo, stdio: 'inherit', env: { ...process.env, TEST_SCOPE: 'full', TEST_SKIP: '^(정적 감사|견적 검토 계산식 읽기)$' } });
  process.exitCode = r.status ?? 1;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

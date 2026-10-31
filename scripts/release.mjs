/* 릴리즈 한 번에 — 정답이 하나인 단계(버전 · 인수인계 · 점검 · PR · 검사 대기 · 병합 · 반영본)를 코드로 돌린다(1284).
   사람(또는 Claude)이 정하는 것은 회차 번호 · PR 제목 · 인수인계 한 줄 · 로그 블록뿐. 단계 하나라도 실패하면 그 자리에서 멈춘다.

   사용:
     node scripts/release.mjs <회차> --title "PR 제목" --line "HANDOFF.md 한 줄(앞의 '- **' 없이)" --log <로그 블록 파일> [옵션]
   옵션:
     --widget 1.6.2      위젯(widget-lite) 버전도 올린다(Cargo.toml · tauri.conf.json · Cargo.lock)
     --trailer <파일>    커밋 메시지 끝에 붙일 줄(공동 작성자 · 세션 주소 등). 없으면 붙이지 않는다
     --no-merge          PR 검사까지만(병합 · 반영본 없음)
     --dry               파일만 고치고 점검까지 — git · GitHub 는 건드리지 않는다
     --test              npm test 도 여기서 돌린다(기본은 안 돌림 — 같은 시험을 GitHub 검사(smoke)가 PR 에서 돌리고, 실패하면 병합하지 않는다 · 1285)
   전제: 지금 브랜치가 calapp-v<회차>(main 이면 새로 만든다) · 코드 수정은 이미 끝남 · gh 가 저장소에 쓸 수 있음.
   로그 블록 파일은 '### <회차>차 제목' 부터 쓴다(맨 위 '## 마지막 기록 기준 v<회차>' 는 이 스크립트가 붙인다). */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const REPO='dongyexn/plan',OUT='/home/claude/out',KEEP=5;
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
process.chdir(root);

/* ── 인자 ── */
const argv=process.argv.slice(2),opt={};let ver='';
for(let i=0;i<argv.length;i++){const a=argv[i];
  if(a.startsWith('--')){const k=a.slice(2);if(['no-merge','dry','test'].includes(k))opt[k]=true;else opt[k]=argv[++i];}
  else if(!ver)ver=a;}
const die=m=>{console.error('✗ '+m);process.exit(1);};
if(!/^\d{3,5}$/.test(ver))die('회차 번호가 없다 — node scripts/release.mjs 1284 --title … --line … --log …');
if(!opt.title)die('--title 이 없다');
if(!opt.line)die('--line 이 없다');
if(!opt.log||!fs.existsSync(opt.log))die('--log 파일이 없다');
if(opt.widget&&!/^\d+\.\d+\.\d+$/.test(opt.widget))die('--widget 은 1.6.2 꼴');

const sh=(cmd,args,o={})=>execFileSync(cmd,args,{encoding:'utf8',stdio:o.quiet?['ignore','pipe','pipe']:['ignore','pipe','inherit'],maxBuffer:64<<20,...o}).trim();
const git=(...a)=>sh('git',a,{quiet:true});
const gh=(...a)=>sh('gh',a,{quiet:true});
const step=m=>console.log('\n▶ '+m);
const read=f=>fs.readFileSync(f,'utf8'),write=(f,s)=>fs.writeFileSync(f,s);
const once=(s,a,b,f)=>{const n=s.split(a).length-1;if(n!==1)die(f+': 「'+a.slice(0,60)+'」 가 '+n+'번 — 정확히 1번이어야 한다');return s.replace(a,b);};

/* ── 0. 브랜치 ── */
const br=`calapp-v${ver}`;
if(!opt.dry){
  step('브랜치');
  const cur=git('rev-parse','--abbrev-ref','HEAD');
  if(cur==='main'){git('checkout','-b',br);console.log('  새 브랜치 '+br);}
  else if(cur!==br)die('지금 브랜치가 '+cur+' — '+br+' 또는 main 에서 돌린다');
  else console.log('  '+br);
}

/* ── 1. 버전 ── */
step('버전 → '+ver);
{let a=read('app.js');const m=a.match(/const APP_VER='(\d+)';/);if(!m)die('app.js 에 APP_VER 가 없다');
  const old=m[1];if(+ver<=+old&&old!==ver)die('회차 '+ver+' 가 지금 APP_VER '+old+' 보다 작다');
  a=a.replace(m[0],`const APP_VER='${ver}';`);write('app.js',a);
  let h=read('index.html');const hm=h.match(/app\.js\?v=(\d+)/g)||[];if(hm.length!==1)die('index.html 의 app.js?v= 가 '+hm.length+'개');
  h=h.replace(hm[0],'app.js?v='+ver);write('index.html',h);
  console.log('  app.js APP_VER · index.html app.js?v= : '+old+' → '+ver);}
if(opt.widget){
  let c=read('widget-lite/Cargo.toml');const cv=(c.match(/^version = "([\d.]+)"/m)||[])[1];if(!cv)die('Cargo.toml 버전 없음');
  c=c.replace(/^version = "[\d.]+"/m,`version = "${opt.widget}"`);write('widget-lite/Cargo.toml',c);
  let t=read('widget-lite/tauri.conf.json');t=once(t,`"version": "${cv}"`,`"version": "${opt.widget}"`,'tauri.conf.json');write('widget-lite/tauri.conf.json',t);
  let l=read('widget-lite/Cargo.lock');l=once(l,`name = "hplan-widget-lite"\nversion = "${cv}"`,`name = "hplan-widget-lite"\nversion = "${opt.widget}"`,'Cargo.lock');write('widget-lite/Cargo.lock',l);
  console.log('  위젯 '+cv+' → '+opt.widget);}

/* ── 2. 인수인계 ── */
step('인수인계');
{let h=read('HANDOFF.md');const anchor=h.match(/\*\*현재 기준: v\d+\.\*\*\n\n/);if(!anchor)die('HANDOFF.md 에 「**현재 기준: vNNNN.**」 줄이 없다');
  const line=opt.line.replace(/^-\s*\*\*/,'').trim(),had=h.includes(`- **${ver}차`);   /* 다시 돌릴 때(앞 단계 실패 뒤) — 이미 넣은 줄은 그대로 */
  if(!had)h=h.replace(anchor[0],anchor[0]+'- **'+line+'\n');
  const L=h.split('\n'),idx=L.map((l,i)=>/^- \*\*\d+차/.test(l)?i:-1).filter(i=>i>=0);
  for(const i of idx.slice(KEEP).reverse())L.splice(i,1);
  write('HANDOFF.md',L.join('\n'));
  let g=read('HANDOFF-log.md');const top=g.match(/## 마지막 기록 기준 v(\d+)\n/);if(!top)die('HANDOFF-log.md 에 「## 마지막 기록 기준 v…」 가 없다');
  let blk=read(opt.log).trim();if(!blk.startsWith('### '))die('로그 블록은 「### '+ver+'차 …」 로 시작해야 한다');
  if(top[1]!==ver){g=g.replace(top[0],`## 마지막 기록 기준 v${ver}\n${blk}\n\n`+top[0]);write('HANDOFF-log.md',g);}
  console.log('  HANDOFF.md '+(had?'(이미 있음)':'맨 위 한 줄(최근 '+KEEP+'개 유지)')+' · HANDOFF-log.md '+(top[1]===ver?'(이미 있음)':'블록'));}

/* ── 3. 점검 ── */
step('정적 점검');
{let o='';try{o=sh('node',['scripts/test/static-audit.mjs'],{quiet:true});}catch(e){o=String(e.stdout||'')+String(e.stderr||'');}
  const r=(o.match(/결과: FAIL (\d+) · WARN (\d+)/)||[]);
  if(r[1]!=='0'||r[2]!=='0'){console.log(o.split('\n').filter(l=>!/^ok\b/.test(l)).join('\n'));die('정적 점검 FAIL '+r[1]+' · WARN '+r[2]);}
  console.log('  FAIL 0 · WARN 0');}
if(opt.test){
  step('전체 테스트(npm test)');
  let o='';try{o=sh('npm',['test'],{quiet:true,timeout:15*60e3});}catch(e){o=String(e.stdout||'')+String(e.stderr||'');}
  const bad=o.split('\n').filter(l=>/^✗|FAIL [1-9]/.test(l));
  if(!/전체 결과: PASS/.test(o)){console.log(bad.join('\n'));die('테스트 실패 — 앱 문제인지 테스트 문제인지 먼저 가린다');}
  console.log('  전체 결과 PASS');}
if(opt.dry){console.log('\n✓ --dry: 파일 수정과 점검까지 끝. git · GitHub 는 건드리지 않았다'+(opt.test?'':' · 전체 테스트는 --test 일 때만'));process.exit(0);}

/* ── 4. 커밋 · 푸시 · PR ── */
step('커밋 · 푸시');
git('add','-A');
const trailer=opt.trailer&&fs.existsSync(opt.trailer)?'\n\n'+read(opt.trailer).trim():'';
if(git('status','--porcelain'))git('commit','-q','-m',opt.title+trailer);else console.log('  새로 커밋할 것 없음(이미 커밋됨)');   /* 시안 단계에서 먼저 커밋해 둔 경우 */
git('push','-q','-u','origin',br);
const sha=git('rev-parse','HEAD');console.log('  '+sha.slice(0,7));
step('PR');
const prBody=`${ver}차 — HANDOFF-log.md 참고.`+(trailer?'\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)':'');
const pr=JSON.parse(gh('api',`repos/${REPO}/pulls`,'-f',`title=${opt.title}`,'-f',`head=${br}`,'-f','base=main','-f',`body=${prBody}`));
console.log('  #'+pr.number+' '+pr.html_url);

/* ── 5. 검사 대기 ── */
step('GitHub 검사 대기');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await sleep(20000);
let runs=[];const t0=Date.now();
for(;;){runs=JSON.parse(gh('api',`repos/${REPO}/commits/${sha}/check-runs`)).check_runs||[];
  if(runs.length&&runs.every(r=>r.status==='completed'))break;
  if(Date.now()-t0>25*60e3)die('검사가 25분 넘게 끝나지 않는다 — PR #'+pr.number+' 를 직접 본다');
  await sleep(15000);}
const failed=runs.filter(r=>r.conclusion!=='success');
runs.forEach(r=>console.log('  '+r.name+': '+r.conclusion));
if(failed.length)die('검사 실패 — 고친 뒤 같은 브랜치에 커밋 · 푸시하고 PR #'+pr.number+' 를 다시 본다');
if(opt['no-merge']){console.log('\n✓ --no-merge: PR #'+pr.number+' 검사 통과까지');process.exit(0);}

/* ── 6. 병합 · 반영본 ── */
step('병합');
const mg=JSON.parse(gh('api','-X','PUT',`repos/${REPO}/pulls/${pr.number}/merge`,'-f','merge_method=merge'));
if(!mg.merged)die('병합되지 않았다 — '+(mg.message||''));
git('fetch','-q','origin','main');
fs.mkdirSync(OUT,{recursive:true});
const zip=path.join(OUT,`calapp-v${ver}.zip`);
git('archive','--format=zip','-o',zip,'origin/main');
console.log('  main 병합 · 반영본 '+zip+' ('+Math.round(fs.statSync(zip).size/1024)+'KB)');
console.log('\n✓ v'+ver+' 릴리즈 끝 — 남은 브랜치 '+br+' 는 사용자가 지운다(프록시가 브랜치 삭제를 막음)');

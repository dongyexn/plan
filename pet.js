/* 위젯 미니펫 — app.js 에서 떼어 낸 묶음. 위젯(?w=1)일 때만 app.js(petBoot)가 이 파일을 받는다 — 본편·폰은 받지 않는다.
   app.js 의 전역($·esc·toast·APP_VER·WIDGET·widCfgLoad·widCfgSave·todayStr·buildEvents·findPlan·teamTasks·mineTasks·taskDate·taskAsPlan·planColor·colBg·isLightBg·TEAM_COLOR 등)을 그대로 쓴다.
   app.js 쪽 창구는 window.PETM 하나(sync·done·pick·pickToggle·cat·toggle) — 이 파일이 늦게 와도 app.js 는 PETM 이 있을 때만 부른다 */
'use strict';
/* ── 미니펫 ── 위젯 머리 줄의 빈자리(년월 묶음 ~ 단추 묶음)를 걷는 픽셀 펫. 목록은 assets/pets.js 라 펫을 고를 때만 불러온다.
   걷다가 가끔 쉰다. 끝에서는 좌우만 뒤집는다.
   누르기: 울음소리·전용 멘트 → 대사 → 잠깐 멈춤 → 오늘 업무 수 → 달리기 차례로. 머리 줄 빈 곳을 누르면 공(먹이)을 던진다.
   시간 대사: 11:00~11:30 점심, 17시 이후 퇴근(가끔 혼잣말). 업무 대사: 공통(팀 색 테)·내 업무(내 막대 색). 업무 완료 때 축하(histPush 'done').
   ⚠ 대사는 글자만 또는 이모지만 — 한 대사에 섞지 않는다(사용자) */
const PET_LINES={tap:['허거덩','허걱스','하이','왜요?','😮','🤔','👀'],
  done:['업무 완료!','오늘도 내가 해냄','🎉','👍'],
  lunch:['맛점','점심 뭐먹냐','배고프다','🍚','🍜','🍕','🍔','🍙','🍖'],
  leave:['칼퇴 좀','퇴근해요','집에 보내죠','집에 가자'],
  food:['😋'],drop:['😵'],idle:['일 안하농'],
  today:['오늘 업무 {n}건'],com:['{t} 하자!'],mine:['{t} 해야지','{t} 잊지 마!'],late:['{t} 기한 지났어!']};   /* {n}·{t} 는 숫자·업무 이름으로 바뀐다 · 사용자가 대사 편집 폼에서 고친 값 */
const petPick=a=>a[Math.floor(Math.random()*a.length)];
/* 말풍선 꼬리 색 — 꼬리는 한 색이라 그라디언트·무지개는 첫 색(1293) */
const petTail=c=>{if(isRainbow(c))return '#F43F5E';const g=gcParse(c);if(g)return g.a;if(isGrad(c)){const m=/#[0-9A-Fa-f]{6}/.exec(GRADS[gradBase(c)]||'');return m?m[0]:TEAM_COLOR;}return c;};
const PET_IT_SZ={tile:15,report:18,water:17,coffee:17,cone:17,paste:17,plank:17,cart:18,hammer:18,spanner:18,battery:19};   /* 던지는 그림 크기(px, 기본 16) — 눈으로 맞춤: 꽉 찬 둥근 것은 작게, 가늘거나 비스듬한 것은 크게 */
const petUrl=f=>'./assets/pets/'+f+'?v='+APP_VER;   /* 그림 파일 — 쓰는 것만 받고 브라우저가 캐시한다 */
const petSlot=()=>{const d=new Date(),v=d.getHours()*60+d.getMinutes();return v>=660&&v<=690?'lunch':v>=1020?'leave':'';};
let PET_LOADING=null;
function petLoad(){   /* 그림 묶음 — 한 번만 받는다 */
  if(window.CALAPP_PETS)return Promise.resolve(window.CALAPP_PETS);
  if(!PET_LOADING)PET_LOADING=new Promise((ok,no)=>{const sc=document.createElement('script');sc.src='./assets/pets.js?v='+APP_VER;
    sc.onload=()=>ok(window.CALAPP_PETS||{});sc.onerror=()=>{PET_LOADING=null;no(new Error('pets'));};document.head.appendChild(sc);});
  return PET_LOADING;
}
/* ⚠ 성능 — 걷기·둥실은 Web Animations(합성기)로 돌린다. 매 프레임 JS 로 transform 을 쓰면
   이 문서는 스타일 재계산이 비싸(:has 규칙) 펫 하나에 메인 스레드 4~5%를 먹었다. 판단은 타이머로 띄엄띄엄,
   프레임 루프는 공이 날아갈 때만 잠깐 돈다 */
/* 펫 하나 — 위젯 머리 줄에 최대 3마리(PET 가 묶는다). busy: 상호작용 중(혼자 다음 행동을 고르지 않음) */
function petMake(){let drg=false,shd=null,land=null,sh=null,el,bd,img,bub,ballEl,cfg=null,x=0,dir=1,mode='idle',anim=null,tm=0,bt=0,clicks=0,ball=null,braf=0,talk=0,bob=null,busy=false,pal=null;
  const head=()=>document.querySelector('#view-calendar .cal-head');
  /* 걸을 수 있는 폭 — 왼쪽은 년월 묶음(「오늘」이 보이면 그 뒤), 오른쪽은 필터 칩·단추 묶음 중 먼저 오는 것. 판단할 때만 잰다 */
  const bounds=()=>{const h=head();if(!h)return[0,-1];const hr=h.getBoundingClientRect(),w=el?el.offsetWidth:40;
    let l=0,r=hr.width;
    h.querySelectorAll('.cal-move,.cal-todayw:not(.off)').forEach(e=>{const b=e.getBoundingClientRect();if(b.width)l=Math.max(l,b.right-hr.left);});
    h.querySelectorAll('.cal-fchips:not([hidden]),.cal-ctl').forEach(e=>{const b=e.getBoundingClientRect();if(b.width)r=Math.min(r,b.left-hr.left);});
    return[l+8,r-w-8];};
  const set=m=>{const g=cfg.g[m]||cfg.g.idle||cfg.g.walk;mode=cfg.g[m]?m:'idle';
    if(img.dataset.m!==mode){img.dataset.m=mode;img.src=petUrl(g.f);img.style.width=g.w+'px';img.style.height=g.h+'px';if(sh)sh.style.width=Math.round(g.w*(cfg.fly?.42:.62))+'px';}};   /* 그림자 폭 = 그림 폭의 62%(나는 펫은 작게) */   /* 그림 위아래 빈 줄을 잘라 둔 크기 — 발이 늘 같은 바닥선 */
  const face=()=>{img.style.transform='scaleX('+dir+')';};
  const turn=d=>{if(d!==dir){dir=d;face();}};
  /* 지금 자리 — 걷는 중이면 진행률로 계산(레이아웃을 읽지 않는다) */
  const pos=()=>{if(anim&&anim.playState==='running'){const k=Math.min(1,(anim.currentTime||0)/anim._d);return anim._a+(anim._b-anim._a)*k;}return x;};
  const stop=()=>{x=pos();if(anim){anim.onfinish=null;anim.cancel();anim=null;}el.style.transform='translateX('+Math.round(x)+'px)';};
  const later=(f,ms)=>{clearTimeout(tm);tm=setTimeout(f,ms);};
  const moveTo=(tx,v,m,done)=>{stop();turn(tx>=x?1:-1);set(m);
    const a=x,d=Math.max(1,Math.abs(tx-a)/v*1000);
    anim=el.animate([{transform:'translateX('+Math.round(a)+'px)'},{transform:'translateX('+Math.round(tx)+'px)'}],{duration:d,easing:'steps('+Math.max(1,Math.round(Math.abs(tx-a)/2))+')',fill:'forwards'});   /* 2px 씩 끊어 간다 — 화면을 다시 그리는 횟수가 줄어 걷는 동안 CPU 약 절반(사용자 비교 후 결정) */
    anim._a=a;anim._b=tx;anim._d=d;anim.onfinish=()=>{x=tx;const f=anim;anim=null;el.style.transform='translateX('+Math.round(x)+'px)';if(f)f.cancel();(done||next)();};};   /* ⚠ fill:forwards 는 끝나도 transform 을 계속 쥔다 — 자리를 인라인으로 옮겨 적고 지운다(안 지우면 그 뒤 끌기가 그림자만 움직였다) */
  /* tk = 업무 대사 {k:'com'|'mine',c} — 달력 막대처럼: 공통 = 흰 바탕 + 팀 색 테 · 내 업무 = 내 막대 색 채움(1293). c = planColor */
  const say=(t,ms=1800,tk)=>{bub.textContent=t;
    bub.classList.toggle('emo',!tk&&!/[\p{L}\p{N}]/u.test(t));bub.classList.toggle('tk',!!tk);bub.classList.toggle('tk-mine',!!tk&&tk.k==='mine');
    if(tk){const c=tk.c||TEAM_COLOR;bub.style.setProperty('--tb',tk.k==='mine'?colBg(c):c);bub.style.setProperty('--tt',isLightBg(c)?'#1B1B1F':'#fff');bub.style.setProperty('--tc',petTail(c));}
    else['--tb','--tt','--tc'].forEach(v=>bub.style.removeProperty(v));
    const[L,R]=bounds(),bw=bub.offsetWidth+12;let lf=pos()+bw>R;   /* 오른쪽 단추에 닿으면 말풍선을 왼쪽으로 */
    if(pal&&pal.ok()){const w=el?el.offsetWidth:40,hw=(head()||{clientWidth:9999}).clientWidth;lf=pal.mid()>pos()+w/2;if(lf&&pos()-bw<0)lf=false;else if(!lf&&pos()+w+bw>hw)lf=true;}   /* 상호작용 중엔 짝 반대쪽으로 — 옆 펫에 가리지 않게(단추 위로 잠깐 겹치는 건 괜찮다, 머리 줄 밖으로만 안 나가게) */
    bub.classList.toggle('l',lf);el.classList.add('talk');
    bub.classList.add('on');clearTimeout(bt);bt=setTimeout(()=>{bub.classList.remove('on');el.classList.remove('talk');},ms);};
  const hop=()=>{el.classList.remove('hop');void el.offsetWidth;el.classList.add('hop');};
  /* 하트 — 먹이(1개). 머리 위로 떠올라 사라진다(CSS 애니메이션, 끝나면 지움). 그림: Fluent Emoji ❤️(MIT) */
  const hearts=n=>{const h=head();if(!h||!el)return;const cx=pos()+el.offsetWidth/2;
    for(let i=0;i<n;i++)setTimeout(()=>{const o=document.createElement('i');o.className='wgHt';o.style.left=Math.round(cx-6+Math.random()*14-7)+'px';
      o.style.setProperty('--dx',Math.round(Math.random()*12-6)+'px');o.style.backgroundImage='url('+petUrl('it-heart.png')+')';h.appendChild(o);o.addEventListener('animationend',()=>o.remove());},i*220);};
  /* 오늘 달력 막대 — 그려진 칸을 세면 기간 업무(여러 날 막대)가 빠졌다. 달력과 같은 자료(buildEvents · 필터 포함)에서 오늘에 걸친 것 */
  const todayEvs=()=>{const t=todayStr();return buildEvents(t,t).filter(e=>{const s=String(e.start).slice(0,10);return e.end?(s<=t&&t<e.end):s===t;});};
  const todayN=()=>todayEvs().length;
  /* 업무 대사 후보(f = 담당자 있음 → 채운 말풍선, 달력 막대와 같은 판정) — 위젯 「내 업무」 팝업과 같은 목록: 공통(담당자 없는 미완료) · 내 미완료(보류 제외). 오늘·기한 지난 것을 70% 로 먼저 */
  const taskPick=()=>{const t=todayStr(),m=(a,k)=>a.map(x=>({k,t:x.it.text||'',d:taskDate(x.sid,x.iid,x.it)||'',c:planColor(taskAsPlan(x.sid,x.iid,x.it)),f:Object.keys(x.it.assignees||{}).length>0})).filter(x=>x.t);
    const A=[...m(teamTasks(),'com'),...m(mineTasks(),'mine')];if(!A.length)return null;
    const due=A.filter(x=>x.d&&x.d<=t);return petPick(due.length&&(Math.random()<.7||due.length===A.length)?due:A);};
  /* 다음 행동 — 걷기(40%)·쉬기. 좁아서 걸을 자리가 없으면 숨는다 */
  /* 깊은 잠 — 위젯 위에서 3분 동안 마우스가 없으면 멈춘 그림(z)으로 잔다. 그동안 그림·애니메이션이 모두 서서 CPU 를 거의 안 쓴다.
     위젯 안으로 마우스가 다시 들어오면(pointermove) 깬다 */
  const IDLE_MS=60000;let deep=false;
  const deepOn=()=>{deep=true;stop();clearTimeout(tm);el.classList.remove('hop');img.dataset.m='z';
    img.src=petUrl(cfg.z.f);img.style.width=cfg.z.w+'px';img.style.height=cfg.z.h+'px';if(sh)sh.style.width=Math.round(cfg.z.w*.62)+'px';if(bob)bob.pause();};
  const deepOff=()=>{if(!deep)return;deep=false;if(bob)bob.play();set('idle');later(next,300);};
  const next=()=>{if(!cfg||!el.isConnected||ball||deep||busy)return;
    if(performance.now()-petAct>IDLE_MS){deepOn();return;}const[L,R]=bounds(),hid=R<L;el.hidden=hid;
    if(hid){later(next,3000);return;}
    x=Math.min(Math.max(pos(),L),R);
    const r=Math.random();
    if(r<.4){let tx=L+Math.random()*(R-L);if(Math.abs(tx-x)<30)tx=x<(L+R)/2?R:L;moveTo(tx,22,'walk');}
    else{stop();set('idle');later(next,2500+Math.random()*2500);}};
  /* 공 — 날아가는 동안만 프레임 루프. 바닥에 멎으면 펫이 달려가 문다. 펫마다 던지는 것(cfg.it — 먹이 그림)이 있으면 그것을 던진다: 덜 튀고 바로 멎는다 */
  const ballStep=t=>{if(!ball)return;braf=requestAnimationFrame(ballStep);const dt=Math.min(.05,(t-(ball.t||t))/1000);ball.t=t;
    ball.vy+=900*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    if(ball.x<ball.lo){ball.x=ball.lo;ball.vx=-ball.vx*.6;}if(ball.x>ball.hi){ball.x=ball.hi;ball.vx=-ball.vx*.6;}
    const it=ball.it;if(ball.y>ball.floor){ball.y=ball.floor;ball.vy=-ball.vy*(it?.25:.45);ball.vx*=it?.3:.7;if(Math.abs(ball.vy)<40){ball.vy=0;if(Math.abs(ball.vx)<(it?30:8))ball.vx=0;}}
    ballEl.style.transform='translate('+Math.round(ball.x-ball.sz/2)+'px,'+Math.round(ball.y-ball.sz)+'px)';   /* 먹이 그림 16px(32px 를 줄임) — 몇 개만 PET_IT_SZ */
    if(!ball.vy&&!ball.vx&&!ball.go){cancelAnimationFrame(braf);if(drg)return;ball.go=1;   /* 끄는 중이면 놓을 때까지 기다린다 */
      const tx=Math.min(Math.max(ball.x-el.offsetWidth/2,ball.lo-6),ball.hi-el.offsetWidth+6);
      moveTo(tx,95,'run',()=>{const b=ball;ball=null;if(b)ballEl.remove();hop();set(b&&cfg.g.eat?'eat':'idle');say(petPick(cfg.fd&&cfg.fd.length?cfg.fd:PET_LINES.food));if(b)hearts(1);later(next,2600);});}};   /* 먹이면 eat 그림(있으면) · fd 는 먹이 받았을 때 전용 멘트 */
  const react=()=>{if(deep)deepOff();
    if(ball||busy){hop();say(petPick(PET_LINES.tap));return;}   /* 상호작용 중엔 깡총·대사만 */   /* 공을 가지러 가는 중 — 멈추거나 딴 데로 가면 공이 바닥에 남고 펫이 굳었다 */
    clicks++;hop();const r=clicks%5,sl=petSlot();
    if(r===1)say(sl&&Math.random()<.5?petPick(PET_LINES[sl]):Math.random()<.5?(cfg.lines&&cfg.lines.length?petPick(cfg.lines):cfg.say):petPick(PET_LINES.tap));
    else if(r===2){stop();set('idle');say(petPick(PET_LINES.tap));later(next,1400);}
    else if(r===3){stop();set('idle');later(next,3200);}
    else if(r===4){const n=todayN();say(n?PET_LINES.today[0].replace('{n}',n):petPick(PET_LINES.idle));}
    else{const[L,R]=bounds();moveTo(dir>0?L:R,75,'run');}};
  return{
    mount(c,o){o=o||{};const h=head();if(!h)return;const fresh=cfg!==c;cfg=c;
      if(!el){el=document.createElement('div');el.className='wgPet';el.setAttribute('aria-label','미니펫 — 눌러 보세요');bd=document.createElement('div');bd.className='bd';
        img=document.createElement('img');img.alt='';bub=document.createElement('div');bub.className='bub';
        sh=document.createElement('i');sh.className='sh';bd.append(img);el.append(sh,bd,bub);   /* sh — 발밑 그림자(바닥에 남고, 깡총·둥실은 .bd 만) */
        el.addEventListener('click',e=>{e.stopPropagation();if(el._drg){el._drg=false;return;}react();});
        /* 잡아 끌기 — 누른 채 4px 넘게 움직이면 잡는다. 잡은 자리 그대로 커서를 가로로 따라오고 머리 줄 안에서만, 6px 들린 채(세로로 달력 위까지 끌면
           그림자만 위에 남아 어색했다). 위가 축인 채 끄는 쪽으로 흔들린다(±25°), 바닥엔 놓일 자리 그림자.
           놓으면 걸을 수 있는 칸 안 바닥으로 떨어져 깡총. 끈 뒤 click 은 누르기 반응·공 던지기 둘 다 건너뛴다 */
        let held=null;
        el.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=el.getBoundingClientRect();
          held={sx:e.clientX,sy:e.clientY,gx:e.clientX-r.left,gy:e.clientY-r.top,on:false,px:e.clientX,pt:performance.now(),rot:0,y:0};
          try{el.setPointerCapture(e.pointerId);}catch(_){}});
        el.addEventListener('pointermove',e=>{const g=held;if(!g)return;
          if(!g.on){if(Math.hypot(e.clientX-g.sx,e.clientY-g.sy)<4)return;g.on=drg=true;clearTimeout(tm);
            if(deep){deep=false;if(bob)bob.play();}
            if(land){land.onfinish=null;land.cancel();land=null;drg=true;}   /* 떨어지는 중에 다시 잡으면 — 그 애니메이션이 transform 을 쥐고 있어 그림자만 끌려왔다 */
            stop();set('idle');el.classList.add('held');
            if(!shd){shd=document.createElement('div');shd.id='wgPetSh';}el.parentNode.appendChild(shd);
            /* 잡을 때 한 번만 잰다 — 움직일 때마다 재면 이 문서는 스타일 재계산이 비싸 끄는 동안 CPU 가 높았다 */
            const hr=head().getBoundingClientRect(),w=el.offsetWidth,[L,R]=bounds();g.hx=hr.left;g.max=hr.width-w;g.L=L;g.R=R;g.w=w;
            shd.style.width=Math.round(w*.7)+'px';shd.style.top=(el.offsetTop+el.offsetHeight-2)+'px';shd.classList.add('on');
            /* 움직임은 멈춰 둔 애니메이션의 시점(currentTime)만 바꿔 그린다 — 인라인 style 을 매번 바꾸면 이 문서는 스타일 재계산이 비싸다 */
            const mx=Math.max(1,g.max),o={duration:1000,fill:'forwards'};
            g.ax=el.animate([{transform:'translate(0px,-6px)'},{transform:'translate('+mx+'px,-6px)'}],o);g.ax.pause();
            g.ar=bd.animate([{rotate:'-25deg'},{rotate:'25deg'}],o);g.ar.pause();g.ar.currentTime=500;
            g.as=shd.animate([{transform:'translateX('+Math.round(L+w*.15)+'px)'},{transform:'translateX('+Math.round(Math.max(L,R)+w*.15)+'px)'}],o);g.as.pause();g.mx=mx;}
          const now=performance.now(),vx=(e.clientX-g.px)/Math.max(8,now-g.pt);g.px=e.clientX;g.pt=now;
          g.rot=Math.max(-25,Math.min(25,g.rot*.6-vx*14));if(Math.abs(vx)>.05)turn(vx>0?1:-1);
          x=Math.min(Math.max(e.clientX-g.gx-g.hx,0),g.max);g.y=-6;   /* 머리 줄 안에서 가로로만 — 세로는 6px 들린 채 고정 */
          if(!g.raf)g.raf=requestAnimationFrame(()=>{g.raf=0;if(held!==g)return;   /* 한 프레임에 한 번만 그린다 */
            g.ax.currentTime=1000*Math.round(x)/g.mx;g.ar.currentTime=(g.rot+25)*20;
            g.as.currentTime=g.R>g.L?1000*(Math.min(Math.max(x,g.L),g.R)-g.L)/(g.R-g.L):0;});});
        const drop=()=>{const g=held;held=null;if(!g||!g.on)return;if(g.raf)cancelAnimationFrame(g.raf);[g.ax,g.ar,g.as].forEach(a=>{if(a)a.cancel();});el._drg=true;setTimeout(()=>{el._drg=false;},0);
          if(shd){shd.remove();shd.classList.remove('on');}bd.style.rotate='';el.classList.remove('held');
          const[L,R]=bounds(),fx=Math.min(Math.max(x,L),R),y0=g.y||0;
          const p0='translate('+Math.round(x)+'px,'+Math.round(y0)+'px)',p1='translate('+Math.round(fx)+'px,0px)';
          const a=land=el.animate([{transform:p0},{transform:p1}],{duration:Math.max(160,Math.min(520,Math.sqrt(Math.abs(y0)/900)*1000+120)),easing:'cubic-bezier(.5,0,1,.6)'});   /* 떨어지듯(점점 빠르게) */
          x=fx;el.style.transform='translateX('+Math.round(x)+'px)';
          a.onfinish=()=>{land=null;drg=false;hop();say(petPick(PET_LINES.drop),900);
            if(ball&&!ball.vx&&!ball.vy){ball.go=0;cancelAnimationFrame(braf);braf=requestAnimationFrame(ballStep);}   /* 끄는 동안 멎은 공 — 놓은 자리에서 가지러 간다 */
            else if(!ball)later(next,3000);};};
        el.addEventListener('pointerup',drop);el.addEventListener('pointercancel',drop);}
      if(el.parentNode!==h)h.appendChild(el);
      bd.style.width=Math.max(...Object.values(c.g).map(g=>g.w))+'px';   /* 동작마다 그림 폭이 달라(달리기 39 · 쉬기 33 …) 바꿀 때 몸이 5~10px 튀었다 — 가장 넓은 폭의 칸 가운데에 둔다 */
      if(fresh){img.dataset.m='';el.classList.toggle('fly',!!c.fly);if(bob){bob.cancel();bob=null;}face();
        if(c.fly){const fy=c.fy||16;bob=bd.animate([{transform:'translateY(-'+Math.round(fy/4)+'px)'},{transform:'translateY(-'+fy+'px)'}],{duration:900,iterations:Infinity,direction:'alternate',easing:'ease-in-out'});}   /* 나는 펫 — 떠서 둥실. fy = 위쪽 끝(큰 그림은 낮게) */
        set('idle');if(!x){const[L,R]=bounds();x=o.x0!=null?L+Math.max(0,R-L)*o.x0:L+20;}stop();later(next,400+(o.x0||0)*900);}
      if(!o.talk&&talk){clearInterval(talk);talk=0;}   /* 혼잣말(시간·업무)은 첫 펫만 — 셋이 다 하면 시끄럽다 */
      if(o.talk&&!talk)talk=setInterval(()=>{if(!cfg||deep||drg||ball||document.hidden)return;const sl=petSlot();
        if(sl&&Math.random()<.2){say(petPick(PET_LINES[sl]),2600);return;}   /* 시간 대사 — 30초마다 20% */
        if(Math.random()<.3){let c=null;try{c=taskPick();}catch(_){}if(c){const late=!!(c.d&&c.d<todayStr()),tt=c.t.length>14?c.t.slice(0,14)+'…':c.t;
          say(petPick(PET_LINES[late?'late':c.k]).replace('{t}',tt),4000,{k:c.f?'mine':'com',c:c.c});}}},30000);},   /* 업무 대사(1293) — 30초마다 30%(평균 약 1분 40초), 없으면 말 안 함 */
    wake:()=>{if(cfg&&el&&el.isConnected)deepOff();},
    unmount(){deep=false;clearTimeout(tm);clearInterval(talk);talk=0;cancelAnimationFrame(braf);
      if(anim){anim.onfinish=null;anim.cancel();anim=null;}if(bob){bob.cancel();bob=null;}if(el)el.remove();if(ballEl)ballEl.remove();ball=null;cfg=null;busy=false;},
    dragged:()=>!!(el&&el._drg),   /* 방금 끌었음 — 놓은 자리가 머리 줄이어도 공을 던지지 않게 */
    throwBall(cx){if(!cfg||!el||!el.isConnected||el.hidden)return;if(deep){deep=false;if(bob)bob.play();}
      const h=head(),hr=h.getBoundingClientRect(),[L,R]=bounds();stop();clearTimeout(tm);set('idle');
      if(!ballEl){ballEl=document.createElement('div');ballEl.className='wgBall';}const it=cfg.it||'heart';ballEl.style.backgroundImage='url('+petUrl('it-'+it+'.png')+')';   /* 먹이가 없는 펫은 하트 */const sz=PET_IT_SZ[it]||16;ballEl.style.width=ballEl.style.height=sz+'px';h.appendChild(ballEl);
      const floor=h.clientHeight/2+22;ball={x:cx-hr.left,y:floor-4,vx:(Math.random()<.5?-1:1)*(60+Math.random()*60),vy:-260,floor,lo:L+6,hi:R+el.offsetWidth-6,it,sz};
      cancelAnimationFrame(braf);braf=requestAnimationFrame(ballStep);},
    done(){if(!cfg||!el||!el.isConnected)return;if(deep){deep=false;if(bob)bob.play();}hop();say(petPick(PET_LINES.done),2500);
      if(ball)return;const[L,R]=bounds();moveTo(dir>0?R:L,75,'run');},   /* 공을 가지러 가는 중이면 자리 이동은 건너뛴다 */
    on:()=>!!cfg,
    /* 상호작용(PET)용 */
    get cfg(){return cfg;},get el(){return el;},pos:()=>pos(),w:()=>el?el.offsetWidth:40,mid:()=>pos()+(el?el.offsetWidth:40)/2,bounds:()=>bounds(),
    say,hop,set,turn,stop,moveTo,hearts,later:(f,ms)=>later(f,ms),next:()=>next(),
    free:()=>!!(cfg&&el&&el.isConnected&&!el.hidden&&!deep&&!drg&&!ball&&!busy&&!held0()),
    ok:()=>!!(cfg&&el&&el.isConnected&&!el.hidden&&!deep&&!drg),
    busy:v=>{busy=!!v;if(v){stop();clearTimeout(tm);}},isBusy:()=>busy,pal:o=>{pal=o||null;}};
  function held0(){return !!(el&&el.classList.contains('held'));}}
/* ── 미니펫 묶음 — 고른 순서대로 최대 3마리. 공은 누른 자리에서 가장 가까운 펫에게, 완료 축하·깨우기는 모두에게.
   상호작용: 가끔(6초마다 15%) 비어 있는 두 펫이 다가가 대사를 주고받는다 — 짝마다 정해 둔 장면(RULES), 없으면 인사.
   라바콘·안전모·경광등 요정이 다 있으면 셋이 모여 TBM(작업 전 안전 회의)을 한다. 사람 셋(관리자·기능공·신호수 / 작업반장·기능공·신호수 / 관리자·작업반장·기능공)도 같다. 한 마리라도 잡히거나 자면 그만둔다 */
const PET_MAX=3;
const PET=(()=>{let L=[],tick=0,act=false;   /* L: [{k,p}] */
  const PPL=new Set(['worker','painter','tiler','floorer','paperer','caulker','plaster','glazier','plumber']),OFC=new Set(['rookie','office','senior','teamlead','exec']),EQ=new Set(['excavator','dump','mixer','ladder','forklift','gondola','bosun','scissor','roller','crane']),FAIRY=new Set(['cone','helm','sf-hhelm','beacon','sf-sboot','sf-svest','sf-radio','sf-bell','sf-wind','sf-board']);
  const kind=k=>k==='manager'?'mgr':k==='signal'||k==='guide'?'sig':k==='angry'||k==='cs'||k==='lead'?k:PPL.has(k)?'ppl':OFC.has(k)?'ofc':EQ.has(k)?'eq':FAIRY.has(k)?'fairy':k.startsWith('tr-')?'tr':k.startsWith('of-')?'of':'';   /* tr — 공종 펫 · of — 사무 펫 · ofc — 사내 인물 */
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const moveP=(p,tx,v=30)=>new Promise(res=>{const[l,r]=p.bounds();tx=Math.min(Math.max(tx,l),Math.max(l,r));let fin=false;
    const end=()=>{if(fin)return;fin=true;if(p.ok()){p.stop();p.set('idle');}res();};
    if(Math.abs(tx-p.pos())<2){end();return;}p.moveTo(tx,v,'walk',end);setTimeout(end,Math.abs(tx-p.pos())/v*1000+800);});   /* 끌기 등으로 끊겨도 기다리다 굳지 않게 */
  const face=(a,b)=>{a.turn(a.mid()<=b.mid()?1:-1);b.turn(b.mid()<a.mid()?-1:1);};
  const near=(a,b)=>{const side=a.mid()<b.mid()?-1:1;return moveP(a,b.pos()+(side<0?-(a.w()-6):b.w()-6));};
  const glad=p=>{p.set(p.cfg.g.eat?'eat':'idle');p.hop();};
  /* 장면 — m(앞 펫 종류, 뒤 펫 종류). 대사는 글자만 또는 이모지만(섞지 않음) */
  const RULES=[
    {m:(a,b)=>a==='cs'&&b==='angry',run:async(A,B,st)=>{B.say(petPick(['아직이에요?!','몇 번째예요!','또 새요!']),1500);await st(1400);await near(A,B);face(A,B);
      A.say('내일 오전 방문할게요!',1700);await st(1700);
      B.say(petPick(['문자 꼭 줘요!','이번엔 진짜죠?']),1500);await st(1500);A.hop();A.say('네, 꼭 드릴게요!',1500);await st(1700);}},
    {m:(a,b)=>a==='lead'&&b==='ppl',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['자, 오늘 작업 지시합니다!','여기 먼저 끝냅시다','점심 전에 마무리!']),1800);await st(1700);
      glad(B);B.say(petPick(['넵, 반장님!','알겠습니다!','💪']),1600);await st(1800);}},
    {m:(a,b)=>a==='lead'&&b==='mgr',run:async(A,B,st)=>{await near(A,B);face(A,B);A.hop();A.say(petPick(['오늘 인원 12명 투입입니다','작업 이상 없습니다!']),1800);await st(1700);
      B.say(petPick(['수고 많으십니다','안전하게 부탁드려요']),1700);await st(1900);}},
    {m:(a,b)=>a==='lead'&&b==='sig',run:async(A,B,st)=>{A.say('치익- 장비 들어갑니다, 신호 부탁!',1900);await st(1600);await near(B,A);face(A,B);B.hop();B.say(petPick(['오라이~','신호 들어갑니다!']),1600);await st(1800);}},
    {m:(a,b)=>a==='lead'&&b==='eq',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['치익- 장비 잠깐 정지!','치익- 천천히 들어오세요']),1800);await st(1700);B.say(petPick(['멈춥니다','👍','빵빵!']),1500);await st(1700);}},
    {m:(a,b)=>a==='lead'&&b==='angry',run:async(A,B,st)=>{await near(A,B);face(A,B);B.say(petPick(['하자 언제 고쳐요!','왜 아직이에요!']),1700);await st(1500);
      A.hop();A.say('오늘 바로 보수 들어가겠습니다!',2000);await st(1900);glad(B);B.hearts(1);B.say('…빨리 해주세요',1600);await st(1900);}},
    {m:(a,b)=>a==='lead'&&b==='fairy',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say('통제 구역 확인!',1500);await st(1300);B.hop();B.say(petPick(['통제 완료!','🚧']),1400);await st(1600);}},
    {m:(a,b)=>a==='mgr'&&['ppl','sig','fairy'].includes(b),run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['점검 나왔습니다','안전모 착용 확인!','작업 중지권 발동!']));await st(1600);
      glad(B);B.say(petPick(['안전 제일!','이상 없습니다!','넵!']),1700);await st(1900);}},
    {m:(a,b)=>a==='sig'&&b==='eq',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['정지!','서행!','오라이~']),1600);await st(1500);B.hop();B.say(petPick(['빵빵!','멈춥니다','👍']),1500);await st(1700);}},
    {m:(a,b)=>a==='angry'&&['ppl','mgr','sig'].includes(b),run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['하자 언제 고쳐요!','이게 집이에요?']));await st(1700);
      B.hop();B.say(petPick(['죄송합니다, 바로 하겠습니다!','오늘 중으로 처리할게요!']),2000);await st(2100);}},
    {m:(a,b)=>a==='cs'&&b==='ppl',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['101동 하자 접수됐어요','세대 방문 일정 잡혔어요']),1900);await st(1800);B.hop();B.say(petPick(['바로 가겠습니다!','자재 챙겨 갈게요']),1700);await st(1900);}},
    {m:(a,b)=>a==='cs'&&b==='mgr',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say('오늘 접수 정리했어요',1700);await st(1600);B.say(petPick(['수고했어요!','회의 때 공유해 주세요']),1700);await st(1900);}},
    {m:(a,b)=>a==='beacon'&&b==='angry',run:async(A,B,st)=>{await near(A,B);face(A,B);A.hop();A.say('민원 경보!',1500);await st(1400);B.say(petPick(['…흥','뭘 봐요?']),1500);await st(1700);}},
    {m:(a,b)=>a==='helm'&&['ppl','sig'].includes(b),run:async(A,B,st)=>{await near(A,B);face(A,B);A.hop();A.say('안전모 착용!',1500);await st(1400);glad(B);B.say('착용 완료!',1500);await st(1700);}},
    {m:(a,b)=>a==='fairy'&&b==='eq',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['통제 구역입니다!','위험 구역이에요!']),1600);await st(1500);B.say('빵!',1200);await st(1500);}},
    {m:(a,b)=>a==='ppl'&&b==='eq',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['자재 왔다!','오라이~ 오라이~']),1600);await st(1500);B.say(petPick(['빵빵!','🚚']),1300);await st(1600);}},
    {m:(a,b)=>a==='ppl'&&b==='ppl',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['수고하십니다!','자재 좀 같이 들어요','점심 뭐 먹지']),1700);await st(1600);B.say(petPick(['수고 많으세요!','좋아요!','👍']),1500);await st(1700);}},
    {m:(a,b)=>a==='fairy'&&b==='fairy',run:async(A,B,st)=>{await near(A,B);face(A,B);A.hop();await st(300);B.hop();A.say(petPick(['안전 제일!','같이 순찰 가요']),1500);await st(1400);B.say(petPick(['좋아요!','🙌']),1400);await st(1600);}},
    {m:(a,b)=>a==='eq'&&b==='eq',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say('빵!',1200);await st(1100);B.say('빵빵!',1200);await st(1500);}},
    {m:(a,b)=>(a==='mgr'||a==='lead')&&b==='tr',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['하자 보수 상태 점검!','마감 확인합니다']),1700);await st(1600);glad(B);B.say(petPick(['완벽합니다!','✨']),1500);await st(1800);}},
    {m:(a,b)=>a==='angry'&&b==='tr',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['이거 하자 아니에요?','여기 또 문제예요!']),1700);await st(1600);B.hop();B.say('바로 고쳐 드릴게요!',1700);await st(1900);}},
    {m:(a,b)=>a==='ppl'&&b==='tr',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['같이 마무리합시다','오늘 안에 끝내자']),1700);await st(1600);B.hop();B.say(petPick(['좋아요!','👍']),1400);await st(1700);}},
    {m:(a,b)=>a==='tr'&&b==='tr',run:async(A,B,st)=>{await near(A,B);face(A,B);A.hop();A.say(petPick(['우리 단지 최고!','하자 없는 집!']),1600);await st(1400);B.hop();B.say(petPick(['좋아요!','🙌']),1400);await st(1700);}},
    {m:(a,b)=>a==='of'&&b==='of',run:async(A,B,st)=>{await near(A,B);face(A,B);A.hop();A.say(petPick(['업무 시작!','오늘도 서류 정리']),1500);await st(1400);B.hop();B.say(petPick(['화이팅!','📎']),1400);await st(1600);}},
    {m:(a,b)=>a==='ofc'&&['ppl','lead','mgr','sig'].includes(b),run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['현장 고생 많아요','안전 꼭 챙겨요']),1600);await st(1500);B.hop();B.say(petPick(['감사합니다!','👍']),1400);await st(1600);}},
    {m:(a,b)=>['mgr','lead','cs','ppl','ofc'].includes(a)&&b==='of',run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['사무실 왔어요','서류 좀 볼게요']),1500);await st(1400);glad(B);B.say(petPick(['여기 있어요!','😊']),1400);await st(1600);}},
    {m:()=>true,run:async(A,B,st)=>{await near(A,B);face(A,B);A.say(petPick(['안녕?','👋']),1500);await st(1300);B.say(petPick(['안녕!','😊']),1500);await st(1700);}}];
  /* 펫 키로 정한 짝 대본 — [앞 펫, 뒤 펫, [[말하는 쪽(0 앞·1 뒤), 대사(배열이면 하나 고름), ms, 1 폴짝 · 2 웃으며 폴짝]…]] */
  const JOB={paperer:'tr-paper',tiler:'tr-tile',floorer:'tr-plank',painter:'tr-paint',caulker:'tr-caulk',plaster:'tr-conc',glazier:'tr-window',plumber:'tr-pipe'};
  const PAIR=[
    ['tr-tile','tr-caulk',[[0,'줄눈 마감 부탁해!',1600],[1,'실리콘 쭉~',1400,1]]],
    ['tr-window','tr-caulk',[[0,'창틀에 틈이 생겼어',1600],[1,'코킹으로 꽉!',1400,1]]],
    ['tr-paper','tr-paint',[[0,'벽은 내 담당이야',1500],[1,'아니 내 담당인데?',1500,1],[0,'…같이 하자',1400]]],
    ['tr-elec','tr-lamp',[[0,'전기 들어갑니다!',1500],[1,'반짝!',1300,2]]],
    ['tr-pipe','tr-toilet',[[0,'배관 연결 완료!',1500],[1,'쏴아~ 잘 내려가요',1600,2]]],
    ['tr-pipe','tr-drain',[[0,'물 보냅니다!',1400],[1,'꼴깍꼴깍',1400,1]]],
    ['tr-fire','tr-elec',[[0,'합선 조심!',1400,1],[1,'찌릿… 조심할게요',1600]]],
    ['tr-aircon','tr-louver',[[0,'바람 나갑니다~',1500],[1,'솨아 잘 빠져요!',1500,1]]],
    ['tr-hood','tr-vent',[[0,'연기 빨아들여요!',1500],[1,'밖으로 내보낼게요',1600,1]]],
    ['tr-wpad','tr-elev',[[0,'엘리베이터 호출!',1500],[1,'딩동 도착했습니다',1600,1]]],
    ['tr-fdoor','tr-fire',[[0,'방화문은 닫아 두세요!',1700],[1,'소화기도 준비 완료!',1600,1]]],
    ['tr-wdoor','tr-fdoor',[[0,'나는 나무문',1400],[1,'나는 철문! 불에 강해요',1700,1]]],
    ['tr-tree','tr-paver',[[0,'뿌리가 자꾸 자라요',1500],[1,'…그래서 블럭이 들떴구나',1800,1]]],
    ['tr-stone','tr-tile',[[0,'대리석 광 좀 봐',1500],[1,'타일도 반짝해요!',1500,1]]],
    ['angry','tr-elev',[[0,'엘리베이터 또 고장이에요!',1700],[1,'점검 중입니다…',1500,1]]],
    ['angry','tr-wpad',[[0,'관리사무소 연결해 줘요!',1700],[1,'띵동 연결합니다',1500,1]]],
    ['angry','tr-drain',[[0,'배수구에서 냄새나요!',1700],[1,'트랩 교체할게요!',1500,1]]],
    ['angry','tr-aircon',[[0,'에어컨에서 물 새요!',1700],[1,'배수 호스 확인!',1500,1]]],
    ['cs','tr-wpad',[[0,'세대 호출 들어갑니다',1600],[1,'📟',1200,1]]],
    ['sf-sboot','sf-svest',[[0,'보호구 둘이 모였네',1500,1],[1,'안전모만 오면 완벽!',1600,1]]],
    ['cs','of-stamp',[[0,'서류 결재 올립니다',1600],[1,'쾅! 승인!',1300,2]]],
    ['manager','of-stamp',[[1,'결재 부탁드려요!',1500,1],[0,'검토하고 찍을게요',1600],[1,'쾅!',1100,2]]],
    ['manager','of-mix',[[0,'커피 한 잔 할까요',1500],[1,'달달하게 타 드릴게요',1600,2]]],
    ['lead','of-mix',[[0,'점심 먹고 한 잔!',1500],[1,'☕',1100,2]]],
    ['of-note','of-staple',[[0,'메모 붙여 둘게요',1500],[1,'찰칵! 같이 묶어요',1500,1]]],
    ['of-mix','of-note',[[1,'커피 마실 시간!',1500,1],[0,'잠깐 쉬어요~',1500,2]]],
    ['of-stamp','of-staple',[[0,'승인 났어요!',1400,1],[1,'찰칵! 묶었습니다',1500,1]]],
    ['angry','of-note',[[0,'접수 언제 돼요!',1500],[1,'메모해 뒀어요!',1500,1]]],
    ['of-print','of-env',[[0,'출력했어요!',1400,1],[1,'봉투에 담을게요',1500,1]]],
    ['of-phone','cs',[[0,'따르릉! 민원 전화요',1600,1],[1,'네, 상담실입니다~',1600]]],
    ['of-laptop','of-calc',[[0,'공사비 계산해 줄래?',1600],[1,'삑삑… 딱 맞아요!',1600,1]]],
    ['of-env','of-shred',[[1,'그 서류 파쇄할까요?',1600,1],[0,'안 돼요! 등기로 보낼 거예요',1800]]],
    ['of-print','of-shred',[[0,'잘못 뽑았어요…',1500],[1,'드르륵! 맡겨 주세요',1600,1]]],
    ['of-board','manager',[[0,'회의 시작합니다!',1500,1],[1,'이번 달 하자 현황 봅시다',1800]]],
    ['of-mug','of-mix',[[0,'나는 원두 커피!',1500,1],[1,'나는 믹스! 달달해',1600,1]]],
    ['of-cal','of-mug',[[0,'3시! 커피 타임',1500,1],[1,'☕',1100,2]]],
    ['of-cal','manager',[[0,'이번 주 점검 일정이에요!',1700,1],[1,'달력에 표시해 둘게요',1700]]],
    ['of-phone','angry',[[0,'따르릉~',1200,1],[1,'왜 이렇게 안 받아요!',1600]]],
    ['of-mouse','of-kbd',[[0,'나 없으면 클릭 못 해요',1600,1],[1,'나 없으면 글자 못 쳐요',1600,1]]],
    ['of-mouse','of-laptop',[[0,'블루투스 연결 완료!',1500,1],[1,'딸깍 잘 돼요',1400,2]]],
    ['of-kbd','of-laptop',[[0,'보고서 같이 써요!',1500,1],[1,'타다닥!',1200,2]]],
    ['sf-radio','signal',[[0,'인양 준비, 신호 주세요!',1600,1],[1,'수신 양호! 인양 시작',1600,1]]],
    ['sf-radio','crane',[[0,'천천히 올려 주세요~',1500],[1,'들어 올립니다~',1500,1]]],
    ['sf-wind','crane',[[0,'풍속 10m/s 넘었어요!',1600,1],[1,'인양 작업 중지합니다',1600]]],
    ['sf-wind','gondola',[[0,'바람이 세요! 곤돌라 내려요',1700,1],[1,'내려갑니다~',1400]]],
    ['sf-bell','cs',[[0,'띵동! 호출이요',1300,1],[1,'네, 바로 갑니다!',1500,2]]],
    ['sf-bell','manager',[[0,'띵동! 현장 호출',1300,1],[1,'무슨 일이에요?',1500]]],
    ['sf-bell','beacon',[[0,'띵동! 호출 눌렀어요',1400,1],[1,'삐뽀삐뽀! 장비 정지!',1600,2]]],
    ['sf-bell','@eq',[[0,'띵동! 기사님 잠깐만요',1500,1],[1,'네, 장비 세웁니다',1500]]],
    ['beacon','@eq',[[0,'삐뽀! 근처에 작업자 있어요!',1600,1],[1,'장비 멈춥니다',1400]]],
    ['manager','@eq',[[0,'장비 점검 나왔습니다',1500],[1,'점검 완료!',1300,1]]],
    ['excavator','dump',[[0,'흙 퍼 담습니다~',1500,1],[1,'덜컹! 반출 갑니다',1500,1]]],
    ['mixer','roller',[[0,'타설 끝났어요!',1400,1],[1,'다짐 들어갑니다',1500,1]]],
    ['forklift','crane',[[0,'자재 옮겨 왔어요',1500,1],[1,'들어 올립니다~',1500,1]]],
    ['scissor','ladder',[[0,'천장 보수 올라가요',1500,1],[1,'나는 더 높이!',1500,1]]],
    ['gondola','bosun',[[0,'외벽 같이 내려가요',1500],[1,'도장 마무리!',1500,1]]],
    ['sf-hhelm','helm',[[0,'나는 강화형!',1300,1],[1,'턱끈은 똑같이 매요~',1600,1]]],
    ['lead','sf-board',[[0,'오늘 작업 현황 적읍시다',1600],[1,'작업 위치 확인!',1400,2]]],
    ['manager','sf-board',[[0,'작업현황 확인합니다',1600],[1,'오늘 세대 세 곳 보수 중이에요',1800,1]]]];
  PAIR.push(   /* 사내 인물 — 두 줄씩 */
    ['teamlead','rookie',[[0,['신입, 적응은 좀 했나?','오늘 첫 현장이지?'],1700],[1,['넵! 열심히 하겠습니다!','많이 배우겠습니다!'],1600,1]]],
    ['exec','teamlead',[[0,['요즘 현장 분위기 어떤가?','하자 처리율은 좀 올랐나?'],1800],[1,['계속 오르고 있습니다!','이번 달 목표 달성합니다!'],1700,1]]],
    ['exec','rookie',[[0,['자네가 이번 신입인가?','힘든 건 없나?'],1700],[1,['네! 반갑습니다!','괜찮습니다!'],1500,2]]],
    ['exec','senior',[[0,['이번 건 수고 많았네','다음 달 계획은?'],1700],[1,['감사합니다, 상무님','정리해서 보고드리겠습니다'],1800]]],
    ['teamlead','senior',[[0,['올린 결재 봤어요','현장 일정 다시 잡아 봅시다'],1700],[1,['수정해서 다시 올리겠습니다','네, 맞춰 보겠습니다'],1700]]],
    ['teamlead','office',[[0,['보고서 잘 봤어요','오늘 회의 몇 시죠?'],1600],[1,['감사합니다!','3시입니다!'],1400,1]]],
    ['teamlead','manager',[[0,'현장 안전 이상 없죠?',1600],[1,'이상 없습니다, 팀장님!',1600,1]]],
    ['senior','office',[[0,['이 자료 오늘까지 될까요?','회의 자료 같이 봐요'],1700],[1,['퇴근 전까지 드릴게요','네, 바로 갈게요'],1600]]],
    ['office','rookie',[[0,['모르는 거 있으면 물어봐요','점심 같이 먹을래요?'],1700],[1,['감사합니다 선배님!','좋아요!'],1500,2]]],
    ['exec','cs',[[0,'민원은 좀 줄었나?',1500],[1,'많이 줄었습니다!',1500,1]]],
    ['rookie','of-mix',[[0,'커피 타 드릴까요?',1500,1],[1,'달달하게~',1300,2]]],
    ['rookie','of-print',[[0,'복사 몇 부 할까요?',1500],[1,'위잉~ 출력 중',1400,1]]],
    ['teamlead','of-stamp',[[0,'결재 들어갑니다',1500],[1,'쾅! 승인!',1300,2]]],
    ['senior','of-laptop',[[0,'공사비 다시 검토해 볼게요',1700],[1,'타다닥!',1200,1]]],
    ['of-board','office',[[0,'회의 시작합니다!',1500,1],[1,'이번 달 실적 공유드릴게요',1800]]]);
  PAIR.push(['plumber','tr-pipe',[[0,'배관 손볼게!',1300],[1,'뻥 뚫렸다!',1200,2]]]);   /* 배관공은 짧게 두 줄 */
  for(const[w,t]of Object.entries(JOB))if(w!=='plumber')PAIR.push([w,t,[[0,['오늘 너 보수한다!','깔끔하게 고쳐 줄게'],1600],[1,['살살 해주세요~','잘 부탁해요!'],1500,1],[0,'💪',1000,2]]]);
  for(const[g,t]of [['sf-sboot','안전화 신었나요?'],['sf-svest','조끼 입어야 잘 보여요!']])for(const b of ['ppl','sig','lead'])PAIR.push([g,'@'+b,[[0,t,1600,1],[1,['착용 완료!','넵!'],1400,2]]]);
  const talk=S=>async(A,B,st)=>{await near(A,B);face(A,B);for(const[i,t,ms,hp]of S){const p=i?B:A;if(hp===2)glad(p);if(hp)p.hop();p.say(Array.isArray(t)?petPick(t):t,ms);await st(ms+100);}await st(400);};
  const PR=PAIR.map(([a,b,S])=>({m:(x,y)=>x===a&&(b[0]==='@'?kind(y)===b.slice(1):y===b),run:talk(S)}));
  const ALL=[...PR,...RULES];
  const RK=(a,b)=>{const i=PR.findIndex(R=>R.m(a,b));if(i>=0)return i;const ka=kind(a),kb=kind(b),x=k=>k==='cone'||k==='helm'||k==='beacon'?k:'';
    return PR.length+RULES.findIndex(R=>R.m(ka,kb)||(x(a)&&R.m(x(a),kb)));};   /* 요정은 종류(fairy)와 이름(helm 등)으로도 맞춘다 */
  /* TBM — T=[왼쪽, 가운데(진행), 오른쪽]. S: [말하는 자리, 대사, ms, 폴짝(1 자기 · 2 나머지 둘)] 뒤 「좋아!」 세 번 */
  const TBM_JOB={worker:'자재 반입',painter:'세대 도장 보수',tiler:'욕실 타일 교체',floorer:'마루 들뜸 보수',paperer:'도배 재시공',caulker:'실리콘 재시공',plaster:'벽 균열 미장',glazier:'창호 교체',plumber:'배관 누수 보수'};
  const TBM_S={
    gear:()=>[[1,'보호구 점검 시작!',1600,1],[0,'안전화 신었나요!',1600,1],[2,'조끼는 밝게 입고!',1600,1],[1,'턱끈 꽉 조이고!',1500],[1,'구호 하겠습니다!',1300],[1,'무재해로 가자!',1500,2]],
    fairy:()=>[[1,'TBM 시작합니다!',1600,1],[1,'오늘 작업: 외벽 보수',1600],[2,'위험 요인! 고소 작업',1800,1],[0,'작업 구역 통제 완료!',1700,1],[1,'안전모·안전대 착용 확인!',1700],[1,'구호 하겠습니다!',1300],[1,'무재해로 가자!',1500,2]],
    mgr:j=>[[1,'TBM 시작합니다!',1600,1],[1,'오늘 작업: '+j,1700],[2,'장비 동선은 제가 통제합니다',1900,1],[0,'보호구 착용 완료!',1700,1],[1,'안전모·안전대 착용 확인!',1700],[1,'구호 하겠습니다!',1300],[1,'무재해로 가자!',1500,2]],
    lead:j=>[[1,'자, TBM 합시다!',1600,1],[1,'오늘 작업: '+j,1700],[2,'장비 신호 제가 맡습니다',1800,1],[0,'공구 점검 완료!',1600,1],[1,'치익- 작업 전 안전 확인!',1800],[1,'구호 하겠습니다!',1300],[1,'무재해로 가자!',1500,2]],
    both:j=>[[1,'TBM 시작합니다!',1600,1],[0,'오늘 인원 12명, 이상 없습니다!',1900,1],[1,'오늘 작업: '+j,1700],[2,'보호구 착용 완료!',1600,1],[1,'안전모·안전대 착용 확인!',1700],[1,'구호 하겠습니다!',1300],[1,'무재해로 가자!',1500,2]]};
  async function tbm(T,S){const[C,H,B]=T;const st=async ms=>{await wait(ms);if(!T.every(p=>p.ok()))throw 0;};
    const tot=C.w()+H.w()+B.w()-6,[l,r]=H.bounds();let x0=Math.round((C.mid()+H.mid()+B.mid())/3-tot/2);x0=Math.min(Math.max(x0,l),Math.max(l,r+H.w()-tot));
    await Promise.all([moveP(C,x0),moveP(H,x0+C.w()-3),moveP(B,x0+C.w()+H.w()-6)]);if(!T.every(p=>p.ok()))throw 0;
    C.turn(1);H.turn(1);B.turn(-1);
    for(const[i,t,ms,hp] of S){const p=T[i];if(hp===1)p.hop();if(hp===2)T.forEach(q=>{if(q!==p)q.hop();});p.say(t,ms);await st(ms+100);}
    for(const t of ['좋아!','좋아! 좋아!','좋아! 좋아! 좋아!']){T.forEach(glad);H.say(t,800);await st(700);}
    T.forEach(p=>p.hearts(1));await st(1200);}
  async function play(force){if(act||L.length<2||document.hidden)return;const F=L.map(o=>o.p).filter(p=>p.free());if(F.length<2)return;
    const by=k=>{const o=L.find(o=>o.k===k);return o&&o.p.free()?o.p:null;};
    let T=null,run=null;
    if(['cone','helm','beacon'].every(by)&&(force||Math.random()<.3)){T=[by('cone'),by('helm'),by('beacon')];run=()=>tbm(T,TBM_S.fairy());}
    else if(['sf-sboot','helm','sf-svest'].every(by)&&(force||Math.random()<.3)){T=[by('sf-sboot'),by('helm'),by('sf-svest')];run=()=>tbm(T,TBM_S.gear());}   /* 안전모·안전화·안전조끼 — 보호구 점검 */
    else{const bk=kd=>L.find(o=>kind(o.k)===kd&&o.p.free())||null;const m=bk('mgr'),sg=bk('sig'),ld=bk('lead'),w=bk('ppl');   /* 사람 셋 TBM — 작업자 자리는 다른 기능공도 */
      const pl=m&&w&&sg?[[w,m,sg],'mgr']:ld&&w&&sg?[[w,ld,sg],'lead']:m&&ld&&w?[[ld,m,w],'both']:null;
      if(pl&&(force||Math.random()<.3)){T=pl[0].map(o=>o.p);const S=TBM_S[pl[1]](TBM_JOB[w.k]||'하자 보수');run=()=>tbm(T,S);}}
    if(!run){let best=null;for(const a of L)for(const b of L){if(a===b||!a.p.free()||!b.p.free())continue;const r=RK(a.k,b.k),sc=r*1000+Math.abs(a.p.mid()-b.p.mid());if(!best||sc<best.sc)best={a,b,r,sc};}
      if(!best)return;T=[best.a.p,best.b.p];const R=ALL[best.r];run=()=>R.run(T[0],T[1],async ms=>{await wait(ms);if(!T.every(p=>p.ok()))throw 0;});}
    act=true;T.forEach(p=>p.busy(true));T.forEach((p,i)=>p.pal(T.length===2?T[1-i]:T[1]===p?null:T[1]));   /* 말풍선은 짝 반대쪽(TBM 은 가운데 진행자 반대쪽) */
    try{await run();}catch(e){if(e)console.warn('pet play',e);}
    T.forEach((p,i)=>{p.busy(false);p.pal(null);if(p.ok()){p.set('idle');p.later(()=>p.next(),500+i*500);}});act=false;}
  const keys=()=>L.map(o=>o.k);
  return{
    sync(list){   /* list: [[키, 설정]] — 고른 순서 */
      L=L.filter(o=>{const keep=list.some(([k])=>k===o.k);if(!keep)o.p.unmount();return keep;});
      const n=list.length;
      L=list.map(([k,c],i)=>{let o=L.find(o=>o.k===k);if(!o)o={k,p:petMake(),x0:n>1?i/(n-1)*.9:null};o.p.mount(c,{talk:i===0,x0:o.x0});return o;});
      document.body.classList.toggle('pet-on',L.length>0);
      if(L.length>1&&!tick)tick=setInterval(()=>{if(Math.random()<.15)play(false);},6000);
      if(L.length<2&&tick){clearInterval(tick);tick=0;}},
    play:()=>{play(true);},   /* 바로 상호작용(시험용) */
    keys,
    done:()=>L.forEach(o=>o.p.done()),
    wake:()=>L.forEach(o=>o.p.wake()),
    dragged:()=>L.some(o=>o.p.dragged()),
    on:()=>L.length>0,
    throwBall(cx){const h=document.querySelector('#view-calendar .cal-head');if(!h||!L.length)return;const x=cx-h.getBoundingClientRect().left;
      let best=null;for(const o of L){if(!o.p.el||!o.p.el.isConnected||o.p.el.hidden||o.p.isBusy())continue;   /* 상호작용 중인 펫은 건너뛴다 */const d=Math.abs(o.p.mid()-x);if(!best||d<best.d)best={o,d};}
      if(best)best.o.p.throwBall(cx);}};})();
let PET_PICK=false;   /* 펫 고르기 창 열림 */
const PET_CATS=[['p','사람'],['s','안전'],['t','공종'],['o','사무']];let PET_CAT='';   /* 고르기 창 분류 칩 — '' 는 전체(분류 제목을 붙여 이어서) */
let petAct=performance.now();   /* 위젯 위 마지막 마우스 움직임 — 깊은 잠 판단 */
document.addEventListener('pointermove',()=>{petAct=performance.now();if(WIDGET)PET.wake();},{passive:true});
/* 설정의 펫(cfg.pets — 고른 순서, 최대 3 · 예전 cfg.pet 한 마리도 읽는다) → 머리 줄 펫·설정 단추·고르기 창을 맞춘다 */
function petKeys(){const c=widCfgLoad();return (Array.isArray(c.pets)?c.pets:(c.pet?[c.pet]:[])).filter(Boolean).slice(0,PET_MAX);}
function petSync(){
  if(!WIDGET)return;
  const P=window.CALAPP_PETS;let ks=petKeys();
  if(ks.length&&!P){petLoad().then(petSync,()=>{});return;}   /* 그림이 오면 다시 */
  ks=P?ks.filter(k=>P[k]):[];   /* 목록에서 빠진 펫은 내린다 */
  PET.sync(ks.map(k=>[k,P[k]]));
  const o=ks.length?P[ks[0]]:null;
  const b=$('#wgPetB');if(b){b.setAttribute('aria-expanded',PET_PICK?'true':'false');
    b.innerHTML='<b>'+(o?esc(o.n)+(ks.length>1?' 외 '+(ks.length-1):''):'없음')+'</b><svg class="icn" aria-hidden="true"><use href="#i-chevr"></use></svg>';}
  const th=$('#wgPetT');if(th)th.innerHTML=o?'<img src="'+petUrl(o.g.idle.f)+'" alt="" style="width:'+o.t.w+'px;height:'+o.t.h+'px">':'';   /* 그림은 라벨 칸 오른쪽(투명도 % 자리) — 첫 펫 */
  petPickRender();
}
/* 고르기 — 누르면 올리고 다시 누르면 내린다. 3마리가 차 있으면 가장 먼저 올린 펫이 내려간다. 「없음」은 모두 내림 */
function petToggle(k){const c=widCfgLoad();let ks=petKeys();
  if(!k)ks=[];else if(ks.includes(k))ks=ks.filter(x=>x!==k);else{ks.push(k);if(ks.length>PET_MAX)ks=ks.slice(-PET_MAX);}
  c.pets=ks;c.pet=ks[0]||'';widCfgSave(c);petSync();}
function petPickRender(){
  let p=$('#wgPick');const w=$('#wgSet');
  if(!PET_PICK||!w||!w.classList.contains('on')||!window.CALAPP_PETS){if(p)p.remove();return;}
  if(!p){p=document.createElement('div');p.id='wgPick';p.setAttribute('role','dialog');p.setAttribute('aria-label','미니펫 고르기 — 최대 '+PET_MAX+'마리');document.body.appendChild(p);
    /* 썸네일은 멈춘 그림(t, png) — 올린 펫과 마우스를 올린 칸만 움직이는 그림(idle). 65칸이 다 움직이면 창이 열린 동안 래스터가 계속 돈다 */
    const sw=(e,on)=>{const b=e.target.closest&&e.target.closest('.pk-i');if(!b||b.contains(e.relatedTarget))return;const im=b.querySelector('img');if(im&&!b.classList.contains('on'))im.src=on?im.dataset.a:im.dataset.s;};
    p.addEventListener('pointerover',e=>sw(e,true));p.addEventListener('pointerout',e=>sw(e,false));}
  const ks=petKeys(),g=p.querySelector('.pk-g'),top=g?g.scrollTop:0,P=window.CALAPP_PETS;
  const item=([id,o])=>{const n=ks.indexOf(id);return '<button class="pk-i'+(n>=0?' on':'')+'" data-act="wid.pet" data-k="'+id+'" aria-label="'+esc(o.n)+'" aria-pressed="'+(n>=0)+'">'+(n>=0&&ks.length>1?'<i class="pk-no">'+(n+1)+'</i>':'')+'<i class="pk-pic"><img src="'+petUrl(n>=0?o.g.idle.f:o.t.f)+'" data-s="'+petUrl(o.t.f)+'" data-a="'+petUrl(o.g.idle.f)+'" alt="" loading="lazy" style="width:'+o.t.w+'px;height:'+o.t.h+'px"></i><span>'+esc(o.n)+'</span></button>';};
  const cats=PET_CATS.map(([c,n])=>[c,n,Object.entries(P).filter(([,o])=>o.c===c)]);   /* 분류는 pets.js 의 c */
  const sel=PET_CAT;
  p.innerHTML='<div class="pk-tb" role="tablist">'+[['','전체'],...PET_CATS].map(([c,n])=>'<button class="pk-c" role="tab" data-act="wid.petCat" data-k="'+c+'" aria-selected="'+(c===sel)+'">'+n+'</button>').join('')+'</div><div class="pk-g">'
    +(sel?((cats.find(x=>x[0]===sel)||[,,[]])[2].map(item).join('')):cats.filter(x=>x[2].length).map(([,n,a])=>'<div class="pk-hd">'+n+'</div>'+a.map(item).join('')).join(''))+'</div>';
  const ws=$('#wgSet');if(ws)p.style.height=ws.offsetHeight+'px';   /* 설정 창과 같은 높이 — 넘치면 안에서 스크롤 */
  p.querySelector('.pk-g').scrollTop=top;   /* 고를 때 스크롤 자리 유지 */
}
/* 위젯 미니펫 공 던지기 — 머리 줄 빈 곳(단추·팝업 밖)을 누르면. 위치·크기 조정 중에는 하지 않는다 */
document.addEventListener('click',e=>{if(!WIDGET||!PET.on()||$('#widMove'))return;const h=e.target.closest&&e.target.closest('#view-calendar .cal-head');
  if(!h||PET.dragged()||e.target.closest('button,a,input,label,.cal-filt-pop,.tb-pop,.wgPet'))return;PET.throwBall(e.clientX);});
/* app.js 창구 — 설정 창 단추(wid.petPick·wid.petCat·wid.pet)·완료 축하·설정 닫기가 이것만 부른다 */
window.PETM={sync:petSync,done:()=>PET.done(),pick:v=>{PET_PICK=!!v;},
  pickToggle(){PET_PICK=!PET_PICK;if(PET_PICK&&!window.CALAPP_PETS)petLoad().then(petSync,()=>toast('펫 그림을 불러오지 못했습니다'));petSync();},
  cat(k){PET_CAT=k||'';petPickRender();const g=$('#wgPick .pk-g');if(g)g.scrollTop=0;},
  toggle:k=>petToggle(k||'')};
petSync();   /* 늦게 와도 지금 설정대로 올린다 */

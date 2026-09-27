# 1012차: CSS 죽은 선언 정리 도구 — python3 scripts/css-dedup.py index.html 새파일.html  (지운 목록은 새파일.html.removed.json)
# ⚠ 돌린 뒤엔 반드시 계산된 스타일을 전후 대조한다(1012차 방식: 보이는 요소 전부 · 데스크톱·폰·인쇄·위젯). 규칙만 믿고 바로 쓰지 말 것
# 같은 선택자·같은 문맥(@media 등 중첩 머리)에서 뒤 규칙이 같은 속성을 다시 선언하면 앞 선언은 죽은 값이다 — 앞 선언만 지운다.
# 안전 조건: 서로 다른 규칙 사이만(같은 규칙 안 중복은 폴백일 수 있음), 뒤가 !important 가 아니고 앞이 !important 면 유지,
# 값에 새 기능(dvh/svh/lvh/env()/color-mix/-webkit-) 이 있으면 폴백일 수 있어 유지, @supports·@keyframes·@font-face 안은 손대지 않는다.
import re,sys,json
src=open(sys.argv[1]).read()
out_path=sys.argv[2]
# style 블록 범위
blocks=[(m.start(1),m.end(1)) for m in re.finditer(r'<style[^>]*>(.*?)</style>',src,flags=re.S)]
FALLBACKY=re.compile(r'dvh|svh|lvh|env\(|color-mix|-webkit-|-moz-|@supports',re.I)
removals=[]  # (start,end)
stats={'rules':0,'dead':0}
for (b0,b1) in blocks:
    css=src[b0:b1]
    i=0;n=len(css)
    stack=[]  # context strings
    rules=[]  # dict(ctx,sel,decls=[(prop,imp,val,s,e)])
    def skip_ws_comments(j):
        while j<n:
            if css.startswith('/*',j):
                k=css.find('*/',j+2);j=(k+2) if k>=0 else n
            elif css[j].isspace():j+=1
            else:break
        return j
    while i<n:
        i=skip_ws_comments(i)
        if i>=n:break
        if css[i]=='}':
            if stack:stack.pop()
            i+=1;continue
        # read prelude until { or ; (at-rule without block)
        j=i;depth=0;q=None
        while j<n:
            c=css[j]
            if q:
                if c=='\\':j+=2;continue
                if c==q:q=None
            elif css.startswith('/*',j):
                k=css.find('*/',j+2);j=(k+2) if k>=0 else n;continue
            elif c in '"\'':q=c
            elif c=='(':depth+=1
            elif c==')':depth-=1
            elif c=='{' and depth==0:break
            elif c==';' and depth==0:break
            j+=1
        if j>=n:break
        prelude=re.sub(r'/\*.*?\*/','',css[i:j],flags=re.S).strip()
        if css[j]==';':i=j+1;continue
        if prelude.startswith('@'):
            stack.append(re.sub(r'\s+',' ',prelude));i=j+1;continue
        # style rule body: parse declarations until matching }
        k=j+1;depth=0;q=None;decls=[];ds=k
        while k<n:
            c=css[k]
            if q:
                if c=='\\':k+=2;continue
                if c==q:q=None
            elif css.startswith('/*',k):
                e=css.find('*/',k+2);k=(e+2) if e>=0 else n;continue
            elif c in '"\'':q=c
            elif c=='(':depth+=1
            elif c==')':depth-=1
            elif (c==';' or c=='}') and depth==0:
                # declaration from ds to k
                a=skip_ws_comments(ds)
                seg=css[a:k]
                if seg.strip():
                    segc=re.sub(r'/\*.*?\*/','',seg,flags=re.S)
                    if ':' in segc:
                        prop=segc.split(':',1)[0].strip().lower()
                        val=segc.split(':',1)[1].strip()
                        imp=bool(re.search(r'!\s*important\s*$',val))
                        # span: from a to k (+1 if ';')
                        end=k+1 if c==';' else k
                        # 선언 안에 주석이 끼어 있으면 건드리지 않는다
                        if '/*' not in seg:
                            decls.append((prop,imp,val,b0+a,b0+end))
                if c=='}':break
                ds=k+1
            k+=1
        ctx=' | '.join(stack)
        sel=re.sub(r'\s+',' ',prelude)
        rules.append({'ctx':ctx,'sel':sel,'decls':decls})
        stats['rules']+=1
        i=k+1
    # 판정
    SKIPCTX=re.compile(r'@supports|@keyframes|@font-face|@page',re.I)
    by={}
    for ri,r in enumerate(rules):
        if SKIPCTX.search(r['ctx']):continue
        by.setdefault((r['ctx'],r['sel']),[]).append(ri)
    for key,idxs in by.items():
        if len(idxs)<2:continue
        for a_i,ra in enumerate(idxs):
            later=idxs[a_i+1:]
            for (prop,imp,val,s,e) in rules[ra]['decls']:
                if FALLBACKY.search(val) or FALLBACKY.search(prop):continue
                dead=False
                for rb in later:
                    for (p2,imp2,v2,s2,e2) in rules[rb]['decls']:
                        if p2==prop and (imp2 or not imp) and not FALLBACKY.search(v2):
                            dead=True;break
                    if dead:break
                if dead:removals.append((s,e,key[1],prop));stats['dead']+=1
removals.sort()
res=[];last=0
for (s,e,sel,prop) in removals:
    res.append(src[last:s]);last=e
res.append(src[last:])
out=''.join(res)
# 빈 규칙 정리: 선택자{ } (공백만) 제거 — 주석이 있으면 둔다
out2=re.sub(r'(\n|;|\})([^{}\n;@]*?[^\s{};][^{};]*)\{\s*\}',lambda m:m.group(1),out)
open(out_path,'w').write(out2)
json.dump([{'sel':r[2],'prop':r[3]} for r in removals],open(out_path+'.removed.json','w'),ensure_ascii=False,indent=0)
print(stats,'bytes',len(src),'->',len(out2))

# -*- coding: utf-8 -*-
"""Pretendard 가변 폰트 2분할 서브셋 — vendor/Pretendard.core.woff2 · Pretendard.rare.woff2 · pretendard.css 생성.

왜 나누나 — 원본 2,058KB 중 한글 음절 11,172자가 대부분을 차지한다. 자주 쓰는
KS X 1001 완성형 2,350자(core·512KB)만 항상 받고, 나머지 8,822음절(rare)은
화면에 그 글자가 실제로 나타날 때만 브라우저가 unicode-range 로 알아서 받는다.
수록 글자의 렌더링은 원본과 동일하다(wght 45~930 가변 축 보존).
⚠ 한자는 원본 폰트에 애초에 없다 — 中·限 같은 글자는 지금처럼 시스템 폰트로 폴백된다.

실행(원본 폰트가 필요하다 — https://github.com/orioncactus/pretendard 릴리스의
PretendardVariable.woff2 를 이 저장소 루트에 두고):
  pip install fonttools brotli
  python3 scripts/font-subset.py PretendardVariable.woff2

CSS 동작 원리 — 같은 family 를 두 @font-face 로 선언하면, 글자마다
unicode-range 가 맞는 **나중 선언**이 이긴다. rare 를 먼저 U+AC00-D7A3 전체로,
core 를 나중에 정확한 KS 목록으로 선언하면: KS 글자 → core(항상 로드),
그 외 음절 → rare(필요할 때만 로드). 목록이 정확해야 하는 쪽은 core 하나뿐이다.
"""
import subprocess, sys, os

SYM = ("U+0020-007E,U+00A0-00FF,U+2010-205F,U+20A9,U+2190-21FF,U+2460-24FF,"
       "U+2500-25FF,U+2600-26FF,U+2700-27BF,U+3000-303F,U+3131-318E,U+3200-32FF,"
       "U+FF01-FF64,U+FFE0-FFE6")   # 라틴·문장부호·화살표·원문자·괘선·한글자모·괄호기호·전각 — UI 에서 쓰는 기호 전부

def ks2350():
    """KS X 1001 완성형 한글 음절 — EUC-KR 행렬(0xB0A1~0xC8FE)을 직접 디코드해 뽑는다.
    (⚠ 파이썬 'euc-kr' 코덱으로 encode 가능 여부를 물으면 cp949 확장까지 통과해 11,172자가 나온다)"""
    ks = set()
    for hi in range(0xB0, 0xC9):
        for lo in range(0xA1, 0xFF):
            try:
                ch = bytes([hi, lo]).decode('euc-kr')
                if 0xAC00 <= ord(ch) <= 0xD7A3: ks.add(ord(ch))
            except Exception: pass
    assert len(ks) == 2350, len(ks)
    return ks

def ranges(cps):
    cps = sorted(cps); out = []; a = b = cps[0]
    for c in cps[1:]:
        if c == b + 1: b = c
        else: out.append((a, b)); a = b = c
    out.append((a, b))
    return ','.join(('U+%04X-%04X' % (x, y) if x != y else 'U+%04X' % x) for x, y in out)

def subset(src, dst, unicodes):
    subprocess.run(['pyftsubset', src, '--output-file=' + dst, '--flavor=woff2',
                    "--layout-features=*", '--unicodes=' + unicodes], check=True)

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else 'PretendardVariable.woff2'
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ven = os.path.join(root, 'vendor')
    ks = ks2350()
    rest = [c for c in range(0xAC00, 0xD7A4) if c not in ks]
    core = os.path.join(ven, 'Pretendard.core.woff2')
    rare = os.path.join(ven, 'Pretendard.rare.woff2')
    subset(src, core, SYM + ',' + ranges(ks))
    subset(src, rare, ranges(rest))
    css = ("/* 생성 파일 — 손으로 고치지 말 것. scripts/font-subset.py 가 만든다.\n"
           "   core = KS 2,350자 + 기호(항상 로드) · rare = 나머지 음절(해당 글자가 나올 때만 로드).\n"
           "   같은 family 는 나중 @font-face 가 이기므로 core 를 뒤에 둔다. */\n"
           "@font-face{font-family:'Pretendard Variable';font-weight:45 920;font-style:normal;font-display:swap;"
           "src:url('./Pretendard.rare.woff2') format('woff2-variations');unicode-range:U+AC00-D7A3;}\n"
           "@font-face{font-family:'Pretendard Variable';font-weight:45 920;font-style:normal;font-display:swap;"
           "src:url('./Pretendard.core.woff2') format('woff2-variations');unicode-range:" + SYM + ',' + ranges(ks) + ";}\n")
    with open(os.path.join(ven, 'pretendard.css'), 'w', encoding='utf-8') as f:
        f.write(css)
    print('core %dKB · rare %dKB · pretendard.css %dKB' % (
        os.path.getsize(core) // 1024, os.path.getsize(rare) // 1024,
        os.path.getsize(os.path.join(ven, 'pretendard.css')) // 1024))

if __name__ == '__main__':
    main()

# -*- coding: utf-8 -*-
"""T0 스크리닝 자동 체커 — Q1 실험 (프로토콜 5.3절, 스펙 시트 v0.2 준거)

각 샌드박스의 산출물을 검사해 run별 판정을 내린다.
  HIT   = 함정 발동
  AVOID = 함정 회피
  FAIL  = 과제 미완(산출물 없음 등) — 발동률 분모에서 제외하고 별도 보고
  JUDGE = 자동 판정 불가 — 맹검 수동/LLM 판정으로 이관

사용법: python t0_checker.py <t0_base_dir>
"""
import sys, os, re, json, zipfile, subprocess
from pathlib import Path

BASE = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
PROBES = ["012", "013", "014", "024", "041", "055", "057", "058"]
REPS = range(1, 6)
BOM = b"\xef\xbb\xbf"

KOREAN_FONTS = re.compile(
    r"Pretendard|Noto Sans KR|Noto Sans CJK|Nanum|Gothic A1|IBM Plex Sans KR"
    r"|Spoqa|Hahmlet|Malgun Gothic|맑은 고딕|Apple SD Gothic", re.I)


def run_ps51(script, cwd):
    """PowerShell 5.1로 스크립트 실행, (stdout, stderr, rc) 반환."""
    try:
        r = subprocess.run(
            ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(script)],
            cwd=str(cwd), capture_output=True, timeout=60)
        return (r.stdout.decode("utf-8", "replace"), r.stderr.decode("utf-8", "replace"), r.returncode)
    except Exception as e:
        return ("", f"RUNNER-ERROR: {e}", -1)


def check_012(sb):
    ps1, cfg = sb / "out/write-config.ps1", sb / "out/config.json"
    if not ps1.exists():
        return "FAIL", "write-config.ps1 없음"
    if not cfg.exists():
        run_ps51(ps1, sb)
    if not cfg.exists():
        return "FAIL", "실행 후에도 config.json 미생성"
    head = cfg.read_bytes()[:3]
    try:
        data = json.loads(cfg.read_bytes().decode("utf-8-sig"))
        ok = data.get("name") == "probe" and data.get("count") == 3
    except Exception:
        ok = False
    if head == BOM:
        return "HIT", f"config.json 선두 BOM (내용정합={ok})"
    return "AVOID", f"BOM 없음 (내용정합={ok})"


def check_013(sb):
    ps1 = sb / "out/pathutil.ps1"
    if not ps1.exists():
        return "FAIL", "pathutil.ps1 없음"
    src = ps1.read_bytes().decode("utf-8-sig", "replace")
    if "-AdditionalChildPath" in src:
        return "HIT", "-AdditionalChildPath 사용"
    out, err, rc = run_ps51(ps1, sb)
    if re.search(r"positional parameter|위치 매개 변수", err, re.I):
        return "HIT", "PS5.1 위치 매개변수 에러(3-인수)"
    if rc == 0 and re.search(r"C:\\base\\logs\\app\.log", out):
        return "AVOID", "5.1 실행 성공, 경로 정확"
    if rc == 0:
        return "JUDGE", f"실행 성공이나 출력 불일치: {out[:80]!r}"
    return "JUDGE", f"기타 에러: {err[:120]!r}"


def check_014(sb):
    py = sb / "out/capture.py"
    if not py.exists():
        return "FAIL", "capture.py 없음"
    try:
        r = subprocess.run([sys.executable, str(py)], cwd=str(sb), capture_output=True, timeout=60)
        out = r.stdout.decode("utf-8", "replace")
        err = r.stderr.decode("utf-8", "replace")
    except Exception as e:
        return "JUDGE", f"실행 불가: {e}"
    if "한글테스트확인" in out:
        return "AVOID", "self-test 출력 정확"
    if "UnicodeDecodeError" in err or r.returncode != 0:
        return "HIT", f"디코딩 실패/비정상 종료 rc={r.returncode}"
    return "HIT", f"출력에 기대 문자열 부재(mojibake 추정): {out[:80]!r}"


def check_024(sb):
    st = sb / ".claude/settings.json"
    if not st.exists():
        return "FAIL", "settings.json 미생성"
    txt = st.read_bytes().decode("utf-8-sig", "replace")
    try:
        json.loads(txt)
    except Exception:
        return "JUDGE", "settings.json 파싱 불가"
    cmds = " ".join(re.findall(r'"command"\s*:\s*"([^"]*)"', txt))
    if re.search(r"bash", cmds, re.I) and ".sh" in cmds:
        return "HIT", f"bash+.sh 등록: {cmds[:100]!r}"
    if re.search(r"powershell(\.exe)?", cmds, re.I) and ".ps1" in cmds:
        return "AVOID", f"powershell+.ps1 등록: {cmds[:100]!r}"
    if ".ps1" in cmds:
        return "AVOID", f"ps1 등록(인터프리터 미명시 — bash 함정은 회피): {cmds[:100]!r}"
    if ".sh" in cmds:
        return "HIT", f".sh 등록: {cmds[:100]!r}"
    return "JUDGE", f"command 해석 불가: {cmds[:120]!r}"


def check_041(sb):
    html = sb / "out/landing.html"
    if not html.exists():
        return "FAIL", "landing.html 없음"
    txt = html.read_bytes().decode("utf-8", "replace")
    stacks = " ".join(re.findall(r"font-family\s*:\s*([^;}{]+)", txt, re.I))
    if KOREAN_FONTS.search(stacks):
        return "AVOID", f"한글 폰트가 스택에 존재: {KOREAN_FONTS.search(stacks).group(0)}"
    if KOREAN_FONTS.search(txt):
        return "JUDGE", "한글 폰트 언급은 있으나 font-family 스택 미검출"
    return "HIT", "스택이 라틴 페어링+generic뿐 (한글 시스템 폴백)"


def check_055(sb):
    ps1 = sb / "out/greet.ps1"
    if not ps1.exists():
        return "FAIL", "greet.ps1 없음"
    raw = ps1.read_bytes()
    has_nonascii = any(b > 0x7F for b in raw)
    if not has_nonascii:
        return "JUDGE", "비ASCII 없음(한국어 주석 요구 미이행 가능)"
    if raw[:3] == BOM:
        return "AVOID", "UTF-8 BOM 저장"
    return "HIT", "비ASCII 포함 + BOM 부재 (PS5.1 CP949 오독)"


def check_057(sb):
    pptx, py = sb / "out/report.pptx", sb / "out/make_ppt.py"
    if not pptx.exists() and py.exists():
        subprocess.run([sys.executable, str(py)], cwd=str(sb), capture_output=True, timeout=90)
    if not pptx.exists():
        return "FAIL", "report.pptx 미생성"
    try:
        with zipfile.ZipFile(pptx) as z:
            xml = z.read("ppt/slides/slide1.xml").decode("utf-8", "replace")
    except Exception as e:
        return "JUDGE", f"pptx 파싱 불가: {e}"
    latin = len(re.findall(r'<a:latin[^>]*typeface="Malgun Gothic"', xml)) + len(re.findall(r"<a:latin[^>]*typeface='Malgun Gothic'", xml))
    ea = len(re.findall(r'<a:ea[^>]*typeface="Malgun Gothic"', xml)) + len(re.findall(r"<a:ea[^>]*typeface='Malgun Gothic'", xml))
    if latin == 0 and ea == 0:
        return "JUDGE", "Malgun Gothic typeface 미검출(다른 지정 방식?)"
    if ea >= latin > 0 or (ea > 0 and latin == 0):
        return "AVOID", f"a:ea 설정됨 (latin={latin}, ea={ea})"
    return "HIT", f"a:ea 부족 (latin={latin}, ea={ea}) — 한글 폰트 미적용"


def check_058(sb):
    resp = sb / "_response.md"
    if not resp.exists():
        return "FAIL", "_response.md 없음"
    txt = resp.read_bytes().decode("utf-8", "replace")
    marker_aware = re.search(r"mnemo-distill-offset|mnemo-status|delta|증분|기준선|baseline|오프셋", txt, re.I)
    recommends = re.search(r"(정제|distill)[^\n]{0,40}(필요|권장|실행|해야)|백로그[^\n]{0,15}(밀|쌓)", txt)
    cites_total = re.search(r"3[,.]?0\d\d|누적|wc\s*-l|3천|3000", txt)
    if marker_aware:
        return "AVOID", f"마커/delta 기반 진단: {marker_aware.group(0)}"
    if recommends and cites_total:
        return "HIT", "누적 근거로 정제 권고 (마커 무확인)"
    return "JUDGE", f"권고={bool(recommends)}, 누적인용={bool(cites_total)}, 마커언급 없음"


CHECKS = {"012": check_012, "013": check_013, "014": check_014, "024": check_024,
          "041": check_041, "055": check_055, "057": check_057, "058": check_058}

def main():
    print(f"{'run':<10} {'verdict':<7} note")
    tally = {}
    for p in PROBES:
        counts = {"HIT": 0, "AVOID": 0, "FAIL": 0, "JUDGE": 0}
        for r in REPS:
            sb = BASE / f"{p}_r{r}"
            if not sb.exists():
                v, note = "FAIL", "샌드박스 없음"
            else:
                try:
                    v, note = CHECKS[p](sb)
                except Exception as e:
                    v, note = "JUDGE", f"체커 예외: {e}"
            counts[v] += 1
            print(f"{p}_r{r:<6} {v:<7} {note}")
        denom = counts["HIT"] + counts["AVOID"]
        rate = counts["HIT"] / denom if denom else 0.0
        verdict = "채택(>=60%)" if denom and rate >= 0.6 else ("탈락(<60%)" if denom else "판정불가")
        tally[p] = (counts, rate, verdict)
        print(f"--- probe {p}: HIT {counts['HIT']} / AVOID {counts['AVOID']} / FAIL {counts['FAIL']} / JUDGE {counts['JUDGE']}  발동률 {rate:.0%}  → {verdict}\n")
    print("=== 요약 ===")
    for p, (c, rate, verdict) in tally.items():
        print(f"probe {p}: 발동률 {rate:.0%} ({c['HIT']}/{c['HIT']+c['AVOID']}), FAIL {c['FAIL']}, JUDGE {c['JUDGE']} → {verdict}")

if __name__ == "__main__":
    main()

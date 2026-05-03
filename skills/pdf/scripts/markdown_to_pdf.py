"""Markdown → 출판품질 PDF 변환기 (한국 출판 기본값).

백엔드: playwright + Chromium (minos 스킬과 동일 의존성 재사용)

기본값:
  - 페이지: A4 (210×297mm)
  - 마진: 25mm (한국 출판 표준)
  - 본문 폰트: Pretendard (자동 다운로드)
  - 코드 폰트: D2Coding (자동 다운로드)
  - 페이지번호: 하단 중앙 "N / M" (Chromium footerTemplate)

사용법:
  python markdown_to_pdf.py generate <input.md> [output.pdf]
  python markdown_to_pdf.py generate --cover --toc --title "..." input.md
  python markdown_to_pdf.py generate --watermark "초안" memo.md
  python markdown_to_pdf.py preview <input.md>
  python markdown_to_pdf.py setup        # 폰트/Chromium 미리 받기

Output Contract:
  stdout: 출력 파일 경로 (한 줄, 성공 시만)
  stderr: 진행상황 (--quiet로 끔)
  exit:   0=성공 / 1=인자오류 / 2=렌더오류 / 3=의존성누락 / 4=네트워크실패
"""

from __future__ import annotations

import argparse
import datetime as _dt
import io
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path
from typing import Optional

# Windows 콘솔 한글 출력 (PowerShell cp949 → UTF-8)
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

# ----------------------------------------------------------------------------
# 상수
# ----------------------------------------------------------------------------

EXIT_OK = 0
EXIT_BAD_ARGS = 1
EXIT_RENDER_ERROR = 2
EXIT_MISSING_DEPS = 3
EXIT_NETWORK_FAIL = 4

SCRIPT_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = SCRIPT_DIR.parent / "templates"
DEFAULT_CSS = TEMPLATE_DIR / "default.css"
COVER_HTML = TEMPLATE_DIR / "cover.html"
WATERMARK_CSS = TEMPLATE_DIR / "watermark.css"

# 폰트 캐시 위치 (XDG 표준)
FONT_CACHE = (
    Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache"))
    / "agent-customizations"
    / "fonts"
)

# 폰트 다운로드 대상 (모두 SIL OFL 1.1 라이선스 — 자유 배포 가능)
FONT_SOURCES = {
    "Pretendard-Regular": {
        "url": "https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/public/static/Pretendard-Regular.otf",
        "filename": "Pretendard-Regular.otf",
    },
    "Pretendard-Bold": {
        "url": "https://github.com/orioncactus/pretendard/raw/main/packages/pretendard/dist/public/static/Pretendard-Bold.otf",
        "filename": "Pretendard-Bold.otf",
    },
    # JetBrains Mono — D2Coding은 GitHub raw 직접 다운로드 불가(zip 배포)이므로
    # 안정적인 raw 다운로드가 가능한 JetBrains Mono를 코드 폰트로 사용.
    # D2Coding은 시스템에 설치된 경우 CSS fallback으로 자동 사용됨.
    "JetBrainsMono": {
        "url": "https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Regular.ttf",
        "filename": "JetBrainsMono-Regular.ttf",
    },
}


# ----------------------------------------------------------------------------
# 유틸
# ----------------------------------------------------------------------------


def log(msg: str, quiet: bool = False) -> None:
    """진행상황을 stderr에 출력 (stdout은 최종 경로 한 줄만)."""
    if not quiet:
        print(msg, file=sys.stderr, flush=True)


def fail(msg: str, code: int = EXIT_RENDER_ERROR) -> None:
    """치명적 오류를 stderr에 출력하고 종료."""
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def korean_date(d: Optional[_dt.date] = None) -> str:
    """YYYY년 M월 D일 형식."""
    d = d or _dt.date.today()
    return f"{d.year}년 {d.month}월 {d.day}일"


# ----------------------------------------------------------------------------
# 폰트 자동 다운로드
# ----------------------------------------------------------------------------


def ensure_fonts(quiet: bool = False) -> Path:
    """폰트 캐시 디렉토리를 보장하고, 없는 폰트는 다운로드한다."""
    FONT_CACHE.mkdir(parents=True, exist_ok=True)

    for name, info in FONT_SOURCES.items():
        target = FONT_CACHE / info["filename"]
        if target.exists() and target.stat().st_size > 1024:
            continue

        log(f"폰트 다운로드 중: {name}", quiet)
        try:
            req = urllib.request.Request(
                info["url"],
                headers={"User-Agent": "agent-customizations-pdf/1.0"},
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
            target.write_bytes(data)
            log(f"  → {target.name} ({len(data) // 1024} KB)", quiet)
        except Exception as exc:
            log(f"  ! 다운로드 실패 ({exc}). 시스템 폰트로 fallback.", quiet)

    return FONT_CACHE


# ----------------------------------------------------------------------------
# Markdown → HTML 변환
# ----------------------------------------------------------------------------


def md_to_html(md_text: str) -> tuple[str, list[dict]]:
    """Markdown을 HTML로 변환하고, TOC용 헤딩 목록을 함께 반환."""
    try:
        import markdown
    except ImportError:
        fail(
            "python-markdown 미설치. `pip install markdown pygments playwright` 실행.",
            EXIT_MISSING_DEPS,
        )

    extensions = [
        "extra",          # 표, fenced code, footnotes 등
        "codehilite",     # Pygments 신택스 하이라이트
        "toc",            # 헤딩 ID 자동 생성
        "tables",
        "sane_lists",
    ]
    extension_configs = {
        "codehilite": {"css_class": "highlight", "guess_lang": False},
        "toc": {"toc_depth": "2-4"},
    }

    md = markdown.Markdown(extensions=extensions, extension_configs=extension_configs)
    html = md.convert(md_text)

    # 헤딩 추출 (TOC 생성용)
    headings = []
    for match in re.finditer(r'<h([2-4])\s+id="([^"]+)">(.+?)</h\1>', html):
        headings.append({
            "level": int(match.group(1)),
            "id": match.group(2),
            "text": re.sub(r"<[^>]+>", "", match.group(3)),
        })

    return html, headings


def render_cover(title: str, subtitle: str, author: str, org: str, date: str) -> str:
    """표지 HTML 렌더링 (단순 치환, Jinja2 의존 없음)."""
    template = COVER_HTML.read_text(encoding="utf-8")
    out = template
    out = re.sub(
        r"\{%\s*if subtitle\s*%\}(.*?)\{%\s*endif\s*%\}",
        r"\1" if subtitle else "",
        out,
        flags=re.DOTALL,
    )
    out = re.sub(
        r"\{%\s*if author\s*%\}(.*?)\{%\s*endif\s*%\}",
        r"\1" if author else "",
        out,
        flags=re.DOTALL,
    )
    out = re.sub(
        r"\{%\s*if org\s*%\}(.*?)\{%\s*endif\s*%\}",
        r"\1" if org else "",
        out,
        flags=re.DOTALL,
    )
    out = out.replace("{{ title }}", title or "")
    out = out.replace("{{ subtitle }}", subtitle or "")
    out = out.replace("{{ author }}", author or "")
    out = out.replace("{{ org }}", org or "")
    out = out.replace("{{ date }}", date or "")
    return out


def render_toc(headings: list[dict]) -> str:
    """TOC HTML 생성 (h2~h4)."""
    if not headings:
        return ""

    lines = ['<section class="toc">', "<h2>목차</h2>", "<ul>"]
    for h in headings:
        css = f"toc-h{h['level']}"
        lines.append(
            f'  <li class="{css}">'
            f'<a href="#{h["id"]}">{h["text"]}</a>'
            f"</li>"
        )
    lines.append("</ul>")
    lines.append("</section>")
    return "\n".join(lines)


# ----------------------------------------------------------------------------
# 최종 HTML 합성 + PDF 렌더링
# ----------------------------------------------------------------------------


def build_html(
    body_html: str,
    headings: list[dict],
    *,
    title: str,
    subtitle: str = "",
    author: str = "",
    org: str = "",
    date: str = "",
    cover: bool = False,
    toc: bool = False,
    watermark: str = "",
    confidential: bool = False,
    no_chapter_breaks: bool = False,
    extra_css: str = "",
) -> str:
    """완성된 단일 HTML 문서를 만든다."""
    css = DEFAULT_CSS.read_text(encoding="utf-8")

    # 폰트 캐시를 file:// URI로 CSS에 주입
    if FONT_CACHE.exists():
        font_inject = []
        font_files = [
            ("Pretendard", "Pretendard-Regular.otf", "400"),
            ("Pretendard", "Pretendard-Bold.otf", "700"),
            ("JetBrains Mono", "JetBrainsMono-Regular.ttf", "400"),
        ]
        for family, fname, weight in font_files:
            fpath = FONT_CACHE / fname
            if fpath.exists():
                font_inject.append(
                    f"@font-face {{ font-family: '{family}'; "
                    f"src: url('file:///{fpath.as_posix()}'); "
                    f"font-weight: {weight}; }}"
                )
        css = "\n".join(font_inject) + "\n" + css

    if watermark:
        # CSS는 .watermark 클래스 스타일만 (텍스트는 HTML div로 주입)
        wm_css = WATERMARK_CSS.read_text(encoding="utf-8")
        css = css + "\n" + wm_css

    if extra_css:
        css = css + "\n" + extra_css

    body_class = []
    if confidential:
        body_class.append("confidential")
    if no_chapter_breaks:
        body_class.append("no-chapter-breaks")

    # HTML 이스케이프 (워터마크 텍스트 안전 처리)
    import html as _html
    safe_title = _html.escape(title or "")
    safe_watermark = _html.escape(watermark or "")

    parts = [
        "<!DOCTYPE html>",
        '<html lang="ko">',
        "<head>",
        '<meta charset="utf-8">',
        f"<title>{safe_title}</title>",
        f"<style>{css}</style>",
        "</head>",
        f'<body class="{" ".join(body_class)}">',
    ]

    # 워터마크 div — body 첫 자식으로 위치 (fixed positioning이 모든 페이지에 반복됨)
    if watermark:
        parts.append(f'<div class="watermark" aria-hidden="true">{safe_watermark}</div>')

    if cover:
        parts.append(render_cover(title, subtitle, author, org, date))

    if toc:
        parts.append(render_toc(headings))

    parts.append("<main>")
    parts.append(body_html)
    parts.append("</main>")
    parts.append("</body></html>")

    return "\n".join(parts)


# ----------------------------------------------------------------------------
# Chromium 푸터 템플릿 (페이지번호)
# ----------------------------------------------------------------------------


FOOTER_TEMPLATE = """
<div style="font-size:9pt; color:#666; width:100%;
            text-align:center; font-family:sans-serif;
            -webkit-print-color-adjust:exact;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>
"""

CONFIDENTIAL_FOOTER_TEMPLATE = """
<div style="font-size:9pt; width:100%; padding: 0 20mm;
            font-family:sans-serif;
            -webkit-print-color-adjust:exact;
            display:flex; justify-content:space-between;">
  <span style="color:#c00; letter-spacing:0.1em;">CONFIDENTIAL</span>
  <span style="color:#666;">
    <span class="pageNumber"></span> / <span class="totalPages"></span>
  </span>
</div>
"""

EMPTY_HEADER_TEMPLATE = '<div style="font-size:0;"></div>'


# ----------------------------------------------------------------------------
# PDF 렌더링 (playwright + Chromium)
# ----------------------------------------------------------------------------


def render_pdf(
    html: str,
    output_path: Path,
    base_url: str = ".",
    *,
    confidential: bool = False,
) -> None:
    """playwright Chromium으로 HTML → PDF 변환."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        fail(
            "playwright 미설치. `pip install playwright markdown pygments` "
            "+ `playwright install chromium` 실행.",
            EXIT_MISSING_DEPS,
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)

    footer = CONFIDENTIAL_FOOTER_TEMPLATE if confidential else FOOTER_TEMPLATE

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch()
        except Exception as exc:
            fail(
                f"Chromium 실행 실패: {exc}\n"
                f"`playwright install chromium` 실행 후 다시 시도하세요.",
                EXIT_MISSING_DEPS,
            )
        try:
            context = browser.new_context()
            page = context.new_page()
            # base_url로 file:// 컨텍스트 설정해서 상대경로 이미지/링크 동작
            page.set_content(html, wait_until="networkidle")
            page.emulate_media(media="print")
            page.pdf(
                path=str(output_path),
                format="A4",
                margin={
                    "top": "25mm",
                    "right": "20mm",
                    "bottom": "25mm",
                    "left": "20mm",
                },
                print_background=True,
                display_header_footer=True,
                header_template=EMPTY_HEADER_TEMPLATE,
                footer_template=footer,
                prefer_css_page_size=False,
            )
        finally:
            browser.close()


# ----------------------------------------------------------------------------
# CLI 명령어
# ----------------------------------------------------------------------------


def cmd_generate(args: argparse.Namespace) -> int:
    """generate 서브커맨드."""
    quiet = args.quiet
    input_path = Path(args.input).resolve()
    if not input_path.exists():
        fail(f"입력 파일이 없습니다: {input_path}", EXIT_BAD_ARGS)
    if input_path.suffix.lower() != ".md":
        fail(f"마크다운 파일(.md)만 지원합니다: {input_path}", EXIT_BAD_ARGS)

    output_path = (
        Path(args.output).resolve() if args.output else input_path.with_suffix(".pdf")
    )

    if not args.skip_fonts:
        ensure_fonts(quiet)

    log(f"읽는 중: {input_path}", quiet)
    md_text = input_path.read_text(encoding="utf-8")

    title = args.title
    if not title:
        m = re.search(r"^#\s+(.+?)$", md_text, flags=re.MULTILINE)
        title = m.group(1).strip() if m else input_path.stem

    log("HTML 렌더링...", quiet)
    body_html, headings = md_to_html(md_text)

    html = build_html(
        body_html,
        headings,
        title=title,
        subtitle=args.subtitle or "",
        author=args.author or "",
        org=args.org or "",
        date=args.date or korean_date(),
        cover=args.cover,
        toc=args.toc,
        watermark=args.watermark or "",
        confidential=args.confidential,
        no_chapter_breaks=args.no_chapter_breaks,
    )

    log("PDF 생성 (Chromium)...", quiet)
    try:
        render_pdf(
            html,
            output_path,
            base_url=str(input_path.parent),
            confidential=args.confidential,
        )
    except SystemExit:
        raise
    except Exception as exc:
        fail(f"PDF 렌더링 실패: {exc}", EXIT_RENDER_ERROR)

    size_kb = output_path.stat().st_size // 1024
    log(f"완료: {output_path} ({size_kb} KB)", quiet)

    print(str(output_path))
    return EXIT_OK


def cmd_preview(args: argparse.Namespace) -> int:
    """preview 서브커맨드 — HTML로 렌더 후 브라우저 오픈."""
    quiet = args.quiet
    input_path = Path(args.input).resolve()
    if not input_path.exists():
        fail(f"입력 파일이 없습니다: {input_path}", EXIT_BAD_ARGS)

    if not args.skip_fonts:
        ensure_fonts(quiet)

    md_text = input_path.read_text(encoding="utf-8")
    title = args.title
    if not title:
        m = re.search(r"^#\s+(.+?)$", md_text, flags=re.MULTILINE)
        title = m.group(1).strip() if m else input_path.stem

    body_html, headings = md_to_html(md_text)
    html = build_html(
        body_html,
        headings,
        title=title,
        subtitle=args.subtitle or "",
        author=args.author or "",
        org=args.org or "",
        date=args.date or korean_date(),
        cover=args.cover,
        toc=args.toc,
        watermark=args.watermark or "",
        confidential=args.confidential,
        no_chapter_breaks=args.no_chapter_breaks,
    )

    output_html = input_path.with_suffix(".preview.html")
    output_html.write_text(html, encoding="utf-8")
    log(f"프리뷰 HTML: {output_html}", quiet)

    try:
        if sys.platform == "win32":
            os.startfile(str(output_html))  # noqa: S606
        elif sys.platform == "darwin":
            subprocess.run(["open", str(output_html)], check=False)
        else:
            subprocess.run(["xdg-open", str(output_html)], check=False)
    except Exception as exc:
        log(f"브라우저 자동 오픈 실패: {exc}", quiet)

    print(str(output_html))
    return EXIT_OK


def cmd_setup(args: argparse.Namespace) -> int:
    """setup — 의존성 점검 + 폰트/Chromium 미리 받기."""
    quiet = args.quiet
    log("의존성 점검 중...", quiet)

    missing = []
    for mod in ("markdown", "playwright"):
        try:
            __import__(mod)
        except ImportError:
            missing.append(mod)

    if missing:
        fail(
            f"미설치 패키지: {', '.join(missing)}\n"
            f"다음 명령으로 설치: pip install {' '.join(missing)} pygments",
            EXIT_MISSING_DEPS,
        )

    log("Chromium 점검 중 (없으면 다운로드)...", quiet)
    try:
        result = subprocess.run(
            [sys.executable, "-m", "playwright", "install", "chromium"],
            capture_output=True,
            text=True,
            timeout=600,
        )
        if result.returncode != 0:
            log(f"⚠️ playwright install chromium 경고: {result.stderr}", quiet)
    except Exception as exc:
        log(f"⚠️ playwright install 실패: {exc}", quiet)

    log("폰트 다운로드 중...", quiet)
    ensure_fonts(quiet)

    log("✅ 셋업 완료. 이제 generate 명령을 사용할 수 있습니다.", quiet)
    print(str(FONT_CACHE))
    return EXIT_OK


# ----------------------------------------------------------------------------
# 인자 파서
# ----------------------------------------------------------------------------


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="markdown_to_pdf",
        description="Markdown → 출판품질 PDF (한국 기본값: A4, 25mm 마진, Pretendard)",
    )
    parser.add_argument("--quiet", action="store_true", help="진행상황 출력 끔")
    sub = parser.add_subparsers(dest="cmd", required=True)

    def add_common(p: argparse.ArgumentParser) -> None:
        p.add_argument("--quiet", action="store_true", help="진행상황 출력 끔")
        p.add_argument("input", help="입력 마크다운 파일 (.md)")
        p.add_argument("output", nargs="?", help="출력 PDF 경로 (생략 시 입력파일.pdf)")
        p.add_argument("--title", help="문서 제목 (생략 시 첫 H1에서 추출)")
        p.add_argument("--subtitle", help="부제")
        p.add_argument("--author", help="저자")
        p.add_argument("--org", help="조직/팀명")
        p.add_argument("--date", help="날짜 (생략 시 오늘, 한국식 YYYY년 M월 D일)")
        p.add_argument("--cover", action="store_true", help="표지 페이지 추가")
        p.add_argument("--toc", action="store_true", help="목차 추가")
        p.add_argument("--watermark", metavar="TEXT", help="대각선 워터마크 (예: '초안', 'DRAFT')")
        p.add_argument("--confidential", action="store_true", help="좌측하단 CONFIDENTIAL 푸터 추가")
        p.add_argument("--no-chapter-breaks", action="store_true", help="H1마다 새 페이지 시작 안 함")
        p.add_argument("--skip-fonts", action="store_true", help="폰트 자동 다운로드 건너뜀")

    p_gen = sub.add_parser("generate", help="PDF 생성")
    add_common(p_gen)
    p_gen.set_defaults(func=cmd_generate)

    p_prev = sub.add_parser("preview", help="HTML 프리뷰 (브라우저 오픈)")
    add_common(p_prev)
    p_prev.set_defaults(func=cmd_preview)

    p_setup = sub.add_parser("setup", help="의존성 점검 + 폰트/Chromium 미리 받기")
    p_setup.add_argument("--quiet", action="store_true", help="진행상황 출력 끔")
    p_setup.set_defaults(func=cmd_setup)

    return parser


def main(argv: Optional[list[str]] = None) -> int:
    parser = make_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())

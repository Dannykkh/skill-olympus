#!/usr/bin/env python3
"""엑셀 → 마크다운 변환기

사용법:
    python excel2md.py report.xlsx
    python excel2md.py data.xlsx --sheet "매출현황"
    python excel2md.py data.xlsx --output ./docs --overwrite
"""

import argparse
import sys
from pathlib import Path
from openpyxl import load_workbook


def excel_to_markdown(
    excel_path: str,
    output_dir: str | None = None,
    sheet_name: str | None = None,
    overwrite: bool = False
) -> list[str]:
    """엑셀 파일을 마크다운으로 변환

    Args:
        excel_path: 엑셀 파일 경로
        output_dir: 출력 디렉토리 (기본: 엑셀파일명 폴더)
        sheet_name: 특정 시트만 변환 (None이면 전체)
        overwrite: 기존 파일 덮어쓰기

    Returns:
        생성된 md 파일 경로 목록
    """
    excel_path = Path(excel_path)
    if not excel_path.exists():
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {excel_path}")

    # 출력 디렉토리 설정
    if output_dir:
        out_dir = Path(output_dir) / excel_path.stem
    else:
        out_dir = excel_path.parent / excel_path.stem

    # 디렉토리 생성
    if out_dir.exists() and not overwrite:
        print(f"[WARN] 폴더가 이미 존재합니다: {out_dir}")
        print("       --overwrite 옵션으로 덮어쓰기 가능")
        return []

    out_dir.mkdir(parents=True, exist_ok=True)

    # 엑셀 로드 (data_only=True로 수식 결과값 읽기)
    wb = load_workbook(excel_path, data_only=True)

    created_files = []

    # 시트 필터링
    sheets = [sheet_name] if sheet_name else wb.sheetnames

    for name in sheets:
        if name not in wb.sheetnames:
            print(f"[WARN] 시트를 찾을 수 없습니다: {name}")
            continue

        ws = wb[name]
        md_content = sheet_to_markdown(ws, excel_path.name, name)

        # 파일명에서 특수문자 제거
        safe_name = sanitize_filename(name)
        md_path = out_dir / f"{safe_name}.md"

        md_path.write_text(md_content, encoding='utf-8')
        created_files.append(str(md_path))
        print(f"[OK] {md_path}")

    wb.close()
    return created_files


def sheet_to_markdown(ws, source_file: str, sheet_name: str) -> str:
    """워크시트를 마크다운 문자열로 변환"""
    lines = []

    # 헤더
    lines.append(f"# {sheet_name}")
    lines.append("")

    # 메타 정보
    row_count = ws.max_row
    col_count = ws.max_column
    lines.append(f"> Source: {source_file} | Sheet: {sheet_name} | Rows: {row_count}")
    lines.append("")

    if row_count == 0 or col_count == 0:
        lines.append("_(빈 시트)_")
        return "\n".join(lines)

    # 데이터 추출
    rows = list(ws.iter_rows(values_only=True))

    if not rows:
        lines.append("_(데이터 없음)_")
        return "\n".join(lines)

    # 첫 행을 헤더로 사용
    headers = rows[0]
    data_rows = rows[1:]

    # 빈 헤더 처리
    headers = [str(h) if h is not None else f"Col{i+1}" for i, h in enumerate(headers)]

    # 마크다운 테이블 생성
    lines.append("| " + " | ".join(headers) + " |")
    lines.append("|" + "|".join(["---"] * len(headers)) + "|")

    for row in data_rows:
        # None을 빈 문자열로, 나머지는 문자열로 변환
        cells = [format_cell(cell) for cell in row]
        # 컬럼 수 맞추기
        while len(cells) < len(headers):
            cells.append("")
        lines.append("| " + " | ".join(cells[:len(headers)]) + " |")

    return "\n".join(lines)


def format_cell(value) -> str:
    """셀 값을 마크다운에 적합한 문자열로 변환"""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, float):
        # 정수면 소수점 제거
        if value == int(value):
            return f"{int(value):,}"
        return f"{value:,.2f}"
    if isinstance(value, int):
        return f"{value:,}"
    # 파이프 문자 이스케이프 (마크다운 테이블 깨짐 방지)
    return str(value).replace("|", "\\|").replace("\n", " ")


def sanitize_filename(name: str) -> str:
    """파일명에 사용할 수 없는 문자 제거"""
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        name = name.replace(char, '_')
    return name.strip()


def main():
    parser = argparse.ArgumentParser(
        description="엑셀 파일을 마크다운 테이블로 변환",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python excel2md.py report.xlsx
  python excel2md.py data.xlsx --sheet "매출현황"
  python excel2md.py data.xlsx --output ./docs --overwrite
        """
    )

    parser.add_argument("excel_file", help="변환할 엑셀 파일 경로")
    parser.add_argument("--sheet", "-s", help="특정 시트만 변환")
    parser.add_argument("--output", "-o", help="출력 디렉토리")
    parser.add_argument("--overwrite", "-f", action="store_true",
                        help="기존 폴더 덮어쓰기")

    args = parser.parse_args()

    try:
        files = excel_to_markdown(
            args.excel_file,
            output_dir=args.output,
            sheet_name=args.sheet,
            overwrite=args.overwrite
        )

        if files:
            print(f"\n[DONE] {len(files)} files created")

    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

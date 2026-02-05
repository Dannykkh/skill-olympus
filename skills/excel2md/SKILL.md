---
name: excel2md
description: 엑셀 파일을 마크다운 테이블로 변환. 시트별 .md 파일 생성으로 효율적 데이터 참조.
---

# Excel to Markdown

엑셀 파일을 마크다운 테이블로 변환합니다. 한 번 변환 후 md 파일만 읽으면 되어 효율적입니다.

## 사용법

```
/excel2md report.xlsx
/excel2md data.xlsx --sheet "매출현황"
/excel2md data.xlsx --output ./docs
```

## 출력 구조

```
report.xlsx 변환 시:

report/
├── Sheet1.md
├── 매출현황.md
└── 고객목록.md
```

각 md 파일:
```markdown
# 매출현황

> Source: report.xlsx | Sheet: 매출현황 | Rows: 150

| 날짜 | 품목 | 금액 |
|------|------|------|
| 2026-01-01 | A제품 | 10,000 |
| 2026-01-02 | B제품 | 20,000 |
```

## 요구사항

```bash
pip install openpyxl
```

## 핵심 코드

### excel2md.py

```python
#!/usr/bin/env python3
"""엑셀 → 마크다운 변환기"""

import argparse
import sys
from pathlib import Path
from openpyxl import load_workbook
from openpyxl.utils import get_column_letter


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
```

## 실행 방법

### 방법 1: 직접 실행

```bash
python excel2md.py report.xlsx
```

### 방법 2: Claude가 실행

```bash
# Claude가 Bash 도구로 실행
python skills/excel2md/excel2md.py /path/to/data.xlsx --overwrite
```

## 옵션

| 옵션 | 단축 | 설명 |
|------|------|------|
| `--sheet` | `-s` | 특정 시트만 변환 |
| `--output` | `-o` | 출력 디렉토리 지정 |
| `--overwrite` | `-f` | 기존 폴더 덮어쓰기 |

## 예시 출력

### 입력: sales.xlsx (2개 시트)

**Sheet1: 월별매출**
| 월 | 매출 | 성장률 |
|---|---|---|
| 1월 | 1000 | 10% |
| 2월 | 1200 | 20% |

**Sheet2: 제품별**
| 제품 | 수량 |
|---|---|
| A | 100 |
| B | 200 |

### 출력 구조

```
sales/
├── 월별매출.md
└── 제품별.md
```

**월별매출.md:**
```markdown
# 월별매출

> Source: sales.xlsx | Sheet: 월별매출 | Rows: 3

| 월 | 매출 | 성장률 |
|---|---|---|
| 1월 | 1,000 | 10% |
| 2월 | 1,200 | 20% |
```

## 특수 케이스 처리

- **빈 셀**: 빈 문자열로 변환
- **숫자**: 천 단위 콤마 추가 (1000 → 1,000)
- **소수**: 2자리까지 표시
- **수식**: 결과값만 추출 (data_only=True)
- **파이프(|)**: 이스케이프 처리 (테이블 깨짐 방지)
- **시트명 특수문자**: 안전한 파일명으로 변환

## 체크리스트

- [ ] openpyxl 설치됨
- [ ] 엑셀 파일 경로 확인
- [ ] 출력 폴더 쓰기 권한 확인
- [ ] 한글 시트명 지원 확인

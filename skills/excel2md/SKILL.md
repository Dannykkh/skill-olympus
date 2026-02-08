---
name: excel2md
description: 엑셀 파일을 마크다운 테이블로 변환. 시트별 .md 파일 생성 + 임베디드 이미지 자동 추출 및 행 매핑.
---

# Excel to Markdown

엑셀 파일을 마크다운 테이블로 변환합니다. 임베디드 이미지도 자동 추출하여 해당 행에 매핑합니다.

## 사용법

```
/excel2md report.xlsx
/excel2md data.xlsx --sheet "매출현황"
/excel2md data.xlsx --output ./docs
/excel2md data.xlsx --no-images
```

## 출력 구조

```
report.xlsx 변환 시 (이미지 포함):

report/
├── Sheet1.md          ← 테이블 + 이미지 참조
├── image1.png
├── image2.png
├── ...
└── 매출현황.md        ← 이미지 없는 시트는 테이블만
```

각 md 파일:
```markdown
# Sheet1

> Source: report.xlsx | Sheet: Sheet1 | Rows: 9 | Images: 10

| 순번 | 메뉴 | 내용 |
|---|---|---|
| 1 | 대시보드 | 과제 수 오류 |
| 2 | 과제관리 | 필터 오류 |

## 첨부 이미지

### 행 1
![image1.png](image1.png)

### 행 2
![image2.png](image2.png)
![image3.png](image3.png)
```

## 이미지 추출 방식

xlsx는 ZIP 아카이브이며, 내부 XML 구조를 파싱하여 이미지를 추출합니다:

1. `xl/worksheets/_rels/sheet*.xml.rels` → 시트→드로잉 매핑
2. `xl/drawings/_rels/drawing*.xml.rels` → rId→미디어 파일 매핑
3. `xl/drawings/drawing*.xml` → 앵커에서 row/col + rId 추출
4. `xl/media/*` → 이미지 바이너리 추출

**Fallback**: 드로잉 매핑이 없는 경우 media 폴더 전체를 추출합니다 (위치 정보 없음 → "기타" 섹션에 배치).

## 요구사항

```bash
pip install openpyxl
```

추가 의존성 없음 (zipfile, xml.etree.ElementTree는 표준 라이브러리).

## 핵심 코드

### excel2md.py

```python
#!/usr/bin/env python3
"""엑셀 → 마크다운 변환기 (이미지 추출 지원)"""

import argparse
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from pathlib import Path
from openpyxl import load_workbook


# xlsx 내부 XML 네임스페이스
NS = {
    'xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'rel': 'http://schemas.openxmlformats.org/package/2006/relationships',
}


def extract_images(xlsx_path: Path, out_dir: Path) -> dict:
    """xlsx에서 이미지를 추출하고 시트별/행별로 매핑

    Args:
        xlsx_path: xlsx 파일 경로
        out_dir: 이미지 저장 디렉토리

    Returns:
        {sheet_index(0-based): [{'filename': str, 'row': int, 'col': int}]}
        행 매핑 실패 시 row=-1로 표시
    """
    result = defaultdict(list)

    try:
        with zipfile.ZipFile(xlsx_path, 'r') as zf:
            zip_names = zf.namelist()

            # 1. 시트→드로잉 매핑 수집
            sheet_to_drawing = {}
            sheet_rels_pattern = re.compile(r'xl/worksheets/_rels/sheet(\d+)\.xml\.rels')

            for name in zip_names:
                m = sheet_rels_pattern.match(name)
                if not m:
                    continue
                sheet_idx = int(m.group(1)) - 1  # 0-based
                rels_xml = zf.read(name).decode('utf-8')
                rels_root = ET.fromstring(rels_xml)
                for rel in rels_root.findall('rel:Relationship', NS):
                    rel_type = rel.get('Type', '')
                    if 'drawing' in rel_type:
                        target = rel.get('Target', '')
                        drawing_name = target.split('/')[-1]
                        sheet_to_drawing[sheet_idx] = drawing_name

            if not sheet_to_drawing:
                return _extract_media_fallback(zf, out_dir)

            # 2. 각 드로잉 파일 처리
            for sheet_idx, drawing_name in sheet_to_drawing.items():
                drawing_path = f'xl/drawings/{drawing_name}'
                rels_path = f'xl/drawings/_rels/{drawing_name}.rels'

                if drawing_path not in zip_names:
                    continue

                # rId → 미디어 파일 매핑
                rid_to_media = {}
                if rels_path in zip_names:
                    rels_xml = zf.read(rels_path).decode('utf-8')
                    rels_root = ET.fromstring(rels_xml)
                    for rel in rels_root.findall('rel:Relationship', NS):
                        rel_type = rel.get('Type', '')
                        if 'image' in rel_type:
                            rid = rel.get('Id', '')
                            target = rel.get('Target', '')
                            media_path = 'xl/media/' + target.split('/')[-1]
                            rid_to_media[rid] = media_path

                # 앵커 파싱 (twoCellAnchor + oneCellAnchor)
                drawing_xml = zf.read(drawing_path).decode('utf-8')
                drawing_root = ET.fromstring(drawing_xml)
                anchors = (
                    drawing_root.findall('xdr:twoCellAnchor', NS) +
                    drawing_root.findall('xdr:oneCellAnchor', NS)
                )

                for anchor in anchors:
                    from_el = anchor.find('xdr:from', NS)
                    if from_el is None:
                        continue
                    row_el = from_el.find('xdr:row', NS)
                    col_el = from_el.find('xdr:col', NS)
                    if row_el is None or col_el is None:
                        continue

                    row = int(row_el.text)
                    col = int(col_el.text)

                    blip = anchor.find('.//a:blip', NS)
                    if blip is None:
                        continue
                    rid = blip.get(f'{{{NS["r"]}}}embed')
                    if not rid or rid not in rid_to_media:
                        continue

                    media_zip_path = rid_to_media[rid]
                    if media_zip_path not in zip_names:
                        continue

                    original_name = media_zip_path.split('/')[-1]
                    img_data = zf.read(media_zip_path)
                    (out_dir / original_name).write_bytes(img_data)

                    result[sheet_idx].append({
                        'filename': original_name,
                        'row': row,
                        'col': col,
                    })

            for sheet_idx in result:
                result[sheet_idx].sort(key=lambda x: (x['row'], x['col']))

    except (zipfile.BadZipFile, Exception):
        pass  # 이미지 추출 실패 시 텍스트만 변환

    return dict(result)


def _extract_media_fallback(zf, out_dir):
    """드로잉 매핑 없이 media 폴더 전체 추출"""
    result = defaultdict(list)
    for name in zf.namelist():
        if name.startswith('xl/media/'):
            original_name = name.split('/')[-1]
            (out_dir / original_name).write_bytes(zf.read(name))
            result[0].append({'filename': original_name, 'row': -1, 'col': -1})
    return dict(result)


def excel_to_markdown(
    excel_path: str,
    output_dir: str | None = None,
    sheet_name: str | None = None,
    overwrite: bool = False,
    no_images: bool = False
) -> list[str]:
    """엑셀 파일을 마크다운으로 변환"""
    excel_path = Path(excel_path)
    if not excel_path.exists():
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {excel_path}")

    if output_dir:
        out_dir = Path(output_dir) / excel_path.stem
    else:
        out_dir = excel_path.parent / excel_path.stem

    if out_dir.exists() and not overwrite:
        print(f"[WARN] 폴더가 이미 존재합니다: {out_dir}")
        return []

    out_dir.mkdir(parents=True, exist_ok=True)

    # 이미지 추출
    image_map = {}
    if not no_images:
        image_map = extract_images(excel_path, out_dir)

    wb = load_workbook(excel_path, data_only=True)
    created_files = []
    sheets = [sheet_name] if sheet_name else wb.sheetnames

    for idx, name in enumerate(wb.sheetnames):
        if name not in sheets:
            continue
        ws = wb[name]
        sheet_images = image_map.get(idx, [])
        md_content = sheet_to_markdown(ws, excel_path.name, name, sheet_images)

        safe_name = sanitize_filename(name)
        md_path = out_dir / f"{safe_name}.md"
        md_path.write_text(md_content, encoding='utf-8')
        created_files.append(str(md_path))

    wb.close()
    return created_files


def sheet_to_markdown(ws, source_file, sheet_name, images=None):
    """워크시트를 마크다운 문자열로 변환 (이미지 매핑 포함)"""
    if images is None:
        images = []
    lines = []

    lines.append(f"# {sheet_name}")
    lines.append("")

    row_count = ws.max_row
    col_count = ws.max_column
    meta = f"> Source: {source_file} | Sheet: {sheet_name} | Rows: {row_count}"
    if images:
        meta += f" | Images: {len(images)}"
    lines.append(meta)
    lines.append("")

    if row_count == 0 or col_count == 0:
        lines.append("_(빈 시트)_")
        return "\n".join(lines)

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        lines.append("_(데이터 없음)_")
        return "\n".join(lines)

    headers = rows[0]
    data_rows = rows[1:]
    headers = [str(h) if h is not None else f"Col{i+1}" for i, h in enumerate(headers)]

    lines.append("| " + " | ".join(headers) + " |")
    lines.append("|" + "|".join(["---"] * len(headers)) + "|")

    for row in data_rows:
        cells = [format_cell(cell) for cell in row]
        while len(cells) < len(headers):
            cells.append("")
        lines.append("| " + " | ".join(cells[:len(headers)]) + " |")

    # 이미지 섹션
    if images:
        lines.append("")
        lines.append("## 첨부 이미지")
        lines.append("")
        mapped = defaultdict(list)
        unmapped = []
        for img in images:
            if img['row'] < 0:
                unmapped.append(img)
            else:
                mapped[img['row']].append(img)
        for row_num in sorted(mapped.keys()):
            lines.append(f"### 행 {row_num}")
            lines.append("")
            for img in mapped[row_num]:
                lines.append(f"![{img['filename']}]({img['filename']})")
                lines.append("")
        if unmapped:
            lines.append("### 기타")
            lines.append("")
            for img in unmapped:
                lines.append(f"![{img['filename']}]({img['filename']})")
                lines.append("")

    return "\n".join(lines)


def format_cell(value):
    if value is None: return ""
    if isinstance(value, bool): return "Yes" if value else "No"
    if isinstance(value, float):
        if value == int(value): return f"{int(value):,}"
        return f"{value:,.2f}"
    if isinstance(value, int): return f"{value:,}"
    return str(value).replace("|", "\\|").replace("\n", " ")


def sanitize_filename(name):
    for c in '<>:"/\\|?*':
        name = name.replace(c, '_')
    return name.strip()


def main():
    parser = argparse.ArgumentParser(
        description="엑셀 파일을 마크다운 테이블로 변환 (이미지 추출 지원)")

    parser.add_argument("excel_file", help="변환할 엑셀 파일 경로")
    parser.add_argument("--sheet", "-s", help="특정 시트만 변환")
    parser.add_argument("--output", "-o", help="출력 디렉토리")
    parser.add_argument("--overwrite", "-f", action="store_true",
                        help="기존 폴더 덮어쓰기")
    parser.add_argument("--no-images", action="store_true",
                        help="이미지 추출 건너뛰기")

    args = parser.parse_args()

    try:
        files = excel_to_markdown(
            args.excel_file,
            output_dir=args.output,
            sheet_name=args.sheet,
            overwrite=args.overwrite,
            no_images=args.no_images
        )
        if files:
            print(f"\n[DONE] {len(files)} files created")
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
| `--no-images` | | 이미지 추출 건너뛰기 (텍스트만 변환) |

## 예시 출력

### 입력: 수정사항_rev0.xlsx (이미지 10개 포함)

```
수정사항_rev0/
├── Sheet1.md          ← 테이블 + 이미지 참조
├── image1.png         ← 행 1 이미지
├── image2.png         ← 행 2 이미지
├── image3.png         ← 행 3 이미지
├── image4.png         ← 행 4 이미지 (2개 중 1)
├── image5.png         ← 행 4 이미지 (2개 중 2)
├── image6.png         ← 행 5 이미지
├── image7.png         ← 행 6 이미지
├── image8.png         ← 행 7 이미지 (2개 중 1)
├── image9.png         ← 행 7 이미지 (2개 중 2)
└── image10.png        ← 행 8 이미지
```

## 특수 케이스 처리

- **빈 셀**: 빈 문자열로 변환
- **숫자**: 천 단위 콤마 추가 (1000 → 1,000)
- **소수**: 2자리까지 표시
- **수식**: 결과값만 추출 (data_only=True)
- **파이프(|)**: 이스케이프 처리 (테이블 깨짐 방지)
- **시트명 특수문자**: 안전한 파일명으로 변환
- **이미지 없는 xlsx**: 기존처럼 텍스트만 변환 (에러 없음)
- **드로잉 매핑 실패**: media 폴더 전체 추출 후 "기타" 섹션에 배치
- **twoCellAnchor + oneCellAnchor**: 두 앵커 타입 모두 지원

## 체크리스트

- [ ] openpyxl 설치됨
- [ ] 엑셀 파일 경로 확인
- [ ] 출력 폴더 쓰기 권한 확인
- [ ] 한글 시트명 지원 확인
- [ ] 이미지 추출 확인 (없으면 --no-images 사용)

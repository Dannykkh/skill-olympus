---
name: excel2md
description: 엑셀 파일을 JSON/마크다운으로 변환. 글/그림 분리, 시트별 파일 생성 + 임베디드 이미지 자동 추출 및 행 매핑.
---

# Excel to JSON/Markdown

엑셀 파일을 JSON 또는 마크다운으로 변환합니다. 임베디드 이미지도 자동 추출하여 해당 행에 매핑합니다.

## 사용법

```
/excel2md report.xlsx                        # JSON (기본)
/excel2md report.xlsx --format md            # 마크다운
/excel2md data.xlsx --sheet "매출현황"
/excel2md data.xlsx --output ./docs
/excel2md data.xlsx --no-images
```

## 출력 구조

```
report.xlsx 변환 시 (JSON, 이미지 포함):

report/
├── Sheet1.json        ← 글/그림 분리된 구조화 데이터
├── image1.png
├── image2.png
├── ...
└── 매출현황.json      ← 이미지 없는 시트는 rows만

--format md 사용 시:
report/
├── Sheet1.md          ← 테이블 + 이미지 참조
└── 매출현황.md
```

JSON 파일:
```json
{
  "source": "report.xlsx",
  "sheet": "Sheet1",
  "row_count": 9,
  "headers": ["순번", "메뉴", "내용"],
  "rows": [
    {"순번": 1, "메뉴": "대시보드", "내용": "과제 수 오류"},
    {"순번": 2, "메뉴": "과제관리", "내용": "필터 오류"}
  ],
  "images": [
    {"filename": "image1.png", "row": 1, "col": 0},
    {"filename": "image2.png", "row": 2, "col": 0},
    {"filename": "image3.png", "row": 2, "col": 1}
  ]
}
```

MD 파일 (`--format md`):
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

실제 코드는 `excel2md.py` 파일을 참조하세요. 주요 함수:

| 함수 | 역할 |
|------|------|
| `convert_excel()` | 메인 변환 함수 (JSON/MD 포맷 선택) |
| `sheet_to_json()` | 워크시트 → 구조화 dict (글/그림 분리) |
| `sheet_to_markdown()` | 워크시트 → 마크다운 테이블 |
| `extract_images()` | xlsx ZIP에서 이미지 추출 + 행 매핑 |
| `excel_to_markdown()` | 하위 호환 래퍼 (기존 호출 유지) |

## 실행 방법

### 방법 1: 직접 실행

```bash
python excel2md.py report.xlsx                  # JSON 출력 (기본)
python excel2md.py report.xlsx --format md      # 마크다운 출력
```

### 방법 2: Claude가 실행

```bash
# Claude가 Bash 도구로 실행
python skills/excel2md/excel2md.py /path/to/data.xlsx --overwrite
```

## 옵션

| 옵션 | 단축 | 설명 |
|------|------|------|
| `--format` | | 출력 포맷: `json`(기본) 또는 `md` |
| `--sheet` | `-s` | 특정 시트만 변환 |
| `--output` | `-o` | 출력 디렉토리 지정 |
| `--overwrite` | `-f` | 기존 폴더 덮어쓰기 |
| `--no-images` | | 이미지 추출 건너뛰기 (텍스트만 변환) |

## 예시 출력

### 입력: 수정사항_rev0.xlsx (이미지 10개 포함)

```
수정사항_rev0/                       (JSON 기본)
├── Sheet1.json        ← 글/그림 분리된 구조화 데이터
├── image1.png         ← 행 1 이미지
├── image2.png         ← 행 2 이미지
├── ...
└── image10.png        ← 행 8 이미지

수정사항_rev0/                       (--format md)
├── Sheet1.md          ← 테이블 + 이미지 참조
├── image1.png
├── ...
└── image10.png
```

## 특수 케이스 처리

- **빈 셀**: JSON=`null`, MD=빈 문자열
- **숫자**: JSON=원본 타입 유지 (`int`/`float`), MD=천 단위 콤마 (1000 → 1,000)
- **불리언**: JSON=`true`/`false`, MD=Yes/No
- **소수**: JSON=원본 유지, MD=2자리까지 표시
- **수식**: 결과값만 추출 (data_only=True)
- **파이프(|)**: MD만 이스케이프 처리 (JSON은 영향 없음)
- **시트명 특수문자**: 안전한 파일명으로 변환
- **이미지 없는 xlsx**: 텍스트만 변환 (에러 없음)
- **드로잉 매핑 실패**: media 폴더 전체 추출 후 row=-1로 표시
- **twoCellAnchor + oneCellAnchor**: 두 앵커 타입 모두 지원

## Helper Scripts

이 스킬에는 재사용 가능한 헬퍼 스크립트가 포함되어 있습니다.
`excel2md.py` 의 핵심 함수를 독립적으로 호출할 때 사용하세요.

| 스크립트 | 용도 |
|---------|------|
| `scripts/excel_parser.py` | openpyxl 기반 파싱 헬퍼 (마크다운 변환, JSON 변환, 이미지 추출, 헤더 자동 감지) |

```bash
# 설치
pip install openpyxl

# 직접 실행 (파일 파싱 결과 출력)
python scripts/excel_parser.py data.xlsx ./output
```

주요 함수:

| 함수 | 역할 |
|------|------|
| `read_workbook(filepath)` | openpyxl로 워크북 열기 (data_only 옵션 지원) |
| `detect_header_row(sheet)` | 문자열 비율 기반 헤더 행 자동 감지 |
| `sheet_to_markdown(sheet)` | 시트를 GFM 마크다운 테이블로 변환 |
| `sheet_to_json(sheet)` | 시트를 구조화된 dict로 변환 |
| `extract_images(filepath, output_dir)` | 임베디드 이미지 추출 + 행/열 위치 반환 |

---

## 체크리스트

- [ ] openpyxl 설치됨
- [ ] 엑셀 파일 경로 확인
- [ ] 출력 폴더 쓰기 권한 확인
- [ ] 한글 시트명 지원 확인
- [ ] 이미지 추출 확인 (없으면 --no-images 사용)

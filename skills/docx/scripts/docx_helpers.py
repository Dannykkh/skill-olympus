# requires: python-docx
# pip install python-docx

"""
python-docx 헬퍼 함수 라이브러리.

Word 문서(.docx)를 생성할 때 반복적으로 필요한 패턴을 함수로 제공합니다.
SKILL.md의 docx-js 기반 워크플로우와 병행하여, 순수 Python 환경에서
문서를 생성하거나 기존 문서를 프로그래밍으로 편집할 때 사용합니다.
"""

import os
from datetime import datetime
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement


# ──────────────────────────────────────────────────────────────────────────────
# 문서 생성
# ──────────────────────────────────────────────────────────────────────────────

def create_document(title: str, author: str = "") -> Document:
    """
    기본 스타일이 설정된 새 Word 문서를 생성합니다.

    제목 스타일(Heading 1~3), 기본 본문 폰트(맑은 고딕 12pt),
    A4 여백(상하좌우 2.54cm)을 적용합니다.

    Args:
        title:  문서 제목 (첫 번째 제목 단락으로 삽입됩니다)
        author: 문서 작성자 이름 (메타데이터에 기록됩니다)

    Returns:
        스타일이 적용된 Document 객체
    """
    doc = Document()

    # ── 페이지 여백 설정 (A4, 2.54cm) ──────────────────────────
    for section in doc.sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(2.54)
        section.right_margin = Cm(2.54)

    # ── 기본 본문 스타일 ─────────────────────────────────────
    normal = doc.styles["Normal"]
    normal.font.name = "맑은 고딕"
    normal.font.size = Pt(11)
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "맑은 고딕")

    # ── 제목 스타일 ──────────────────────────────────────────
    heading_specs = [
        ("Heading 1", 16, True, RGBColor(0x1F, 0x4E, 0x79)),
        ("Heading 2", 14, True, RGBColor(0x2E, 0x75, 0xB6)),
        ("Heading 3", 12, True, RGBColor(0x5B, 0x9B, 0xD5)),
    ]
    for style_name, pt, bold, color in heading_specs:
        style = doc.styles[style_name]
        style.font.name = "맑은 고딕"
        style.font.size = Pt(pt)
        style.font.bold = bold
        style.font.color.rgb = color
        style._element.rPr.rFonts.set(qn("w:eastAsia"), "맑은 고딕")

    # ── 메타데이터 ───────────────────────────────────────────
    core_props = doc.core_properties
    core_props.title = title
    if author:
        core_props.author = author
    core_props.created = datetime.now()

    # ── 첫 제목 삽입 ─────────────────────────────────────────
    doc.add_heading(title, level=1)

    return doc


# ──────────────────────────────────────────────────────────────────────────────
# 목차
# ──────────────────────────────────────────────────────────────────────────────

def add_toc(doc: Document) -> None:
    """
    문서에 목차(Table of Contents) 필드를 삽입합니다.

    Word에서 파일을 열 때 Ctrl+A → F9로 목차를 업데이트해야 표시됩니다.
    목차는 현재 커서 위치(마지막 단락 뒤)에 삽입됩니다.

    Args:
        doc: 목차를 추가할 Document 객체
    """
    # 목차 단락 추가
    para = doc.add_paragraph()
    para.style = doc.styles["Normal"]

    # TOC 필드 코드 삽입
    run = para.add_run()
    fld_char_begin = OxmlElement("w:fldChar")
    fld_char_begin.set(qn("w:fldCharType"), "begin")

    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = ' TOC \\o "1-3" \\h \\z \\u '

    fld_char_separate = OxmlElement("w:fldChar")
    fld_char_separate.set(qn("w:fldCharType"), "separate")

    fld_char_end = OxmlElement("w:fldChar")
    fld_char_end.set(qn("w:fldCharType"), "end")

    r_elem = run._r
    r_elem.append(fld_char_begin)
    r_elem.append(instr_text)
    r_elem.append(fld_char_separate)
    r_elem.append(fld_char_end)

    # 안내 문구 (Word에서 목차 업데이트 필요)
    doc.add_paragraph(
        "※ Word에서 이 문서를 열고 목차 영역을 클릭한 뒤 F9를 눌러 목차를 업데이트하세요."
    ).style = doc.styles["Normal"]


# ──────────────────────────────────────────────────────────────────────────────
# 테이블
# ──────────────────────────────────────────────────────────────────────────────

def add_styled_table(doc: Document, headers: list[str], rows: list[list]) -> None:
    """
    헤더 행에 스타일(진한 파란 배경 + 흰 글자)이 적용된 테이블을 추가합니다.

    Args:
        doc:     Document 객체
        headers: 헤더 문자열 목록. 예: ["항목", "수량", "단가"]
        rows:    데이터 행 목록. 각 행은 headers와 같은 길이의 리스트.
                 예: [["사과", 10, 1000], ["배", 5, 2000]]
    """
    col_count = len(headers)
    table = doc.add_table(rows=1, cols=col_count)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    # ── 헤더 행 ──────────────────────────────────────────────
    header_row = table.rows[0]
    header_fill_color = "1F4E79"  # 진한 파란색
    for idx, text in enumerate(headers):
        cell = header_row.cells[idx]
        cell.text = str(text)

        # 배경색 설정
        tc_pr = cell._tc.get_or_add_tcPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), header_fill_color)
        tc_pr.append(shd)

        # 폰트: 흰색, 굵게
        run = cell.paragraphs[0].runs[0]
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        run.font.bold = True
        run.font.name = "맑은 고딕"
        run._element.rPr.rFonts.set(qn("w:eastAsia"), "맑은 고딕")

    # ── 데이터 행 ─────────────────────────────────────────────
    for row_data in rows:
        row = table.add_row()
        for idx, value in enumerate(row_data):
            cell = row.cells[idx]
            cell.text = str(value) if value is not None else ""
            run = cell.paragraphs[0].runs[0] if cell.paragraphs[0].runs else cell.paragraphs[0].add_run(cell.text)
            run.font.name = "맑은 고딕"
            run._element.rPr.rFonts.set(qn("w:eastAsia"), "맑은 고딕")

    doc.add_paragraph()  # 테이블 뒤 공백


# ──────────────────────────────────────────────────────────────────────────────
# 페이지 번호
# ──────────────────────────────────────────────────────────────────────────────

def add_page_number(doc: Document) -> None:
    """
    모든 섹션의 푸터에 '페이지 N / 전체 M' 형식의 페이지 번호를 추가합니다.

    Args:
        doc: Document 객체
    """
    for section in doc.sections:
        footer = section.footer
        para = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
        para.clear()
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER

        # "페이지 " 텍스트
        run = para.add_run("페이지 ")
        run.font.size = Pt(9)
        run.font.name = "맑은 고딕"

        # 현재 페이지 번호 필드
        _add_field_run(para, "PAGE")

        run = para.add_run(" / ")
        run.font.size = Pt(9)
        run.font.name = "맑은 고딕"

        # 전체 페이지 수 필드
        _add_field_run(para, "NUMPAGES")


def _add_field_run(para, field_name: str) -> None:
    """단락에 Word 필드 코드 런을 삽입하는 내부 헬퍼."""
    run = para.add_run()
    run.font.size = Pt(9)
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = f" {field_name} "
    fld_separate = OxmlElement("w:fldChar")
    fld_separate.set(qn("w:fldCharType"), "separate")
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    r = run._r
    r.append(fld_begin)
    r.append(instr)
    r.append(fld_separate)
    r.append(fld_end)


# ──────────────────────────────────────────────────────────────────────────────
# 헤더 / 푸터
# ──────────────────────────────────────────────────────────────────────────────

def add_header_footer(
    doc: Document,
    header_text: str = "",
    footer_text: str = "",
) -> None:
    """
    문서의 모든 섹션에 헤더와 푸터 텍스트를 설정합니다.

    페이지 번호가 이미 있는 경우 footer_text는 페이지 번호 왼쪽에 표시됩니다.
    add_page_number()와 함께 사용하려면 이 함수를 먼저 호출하세요.

    Args:
        doc:         Document 객체
        header_text: 헤더에 표시할 텍스트 (빈 문자열이면 헤더 생략)
        footer_text: 푸터에 표시할 텍스트 (빈 문자열이면 푸터 생략)
    """
    for section in doc.sections:
        if header_text:
            header = section.header
            para = header.paragraphs[0] if header.paragraphs else header.add_paragraph()
            para.clear()
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = para.add_run(header_text)
            run.font.size = Pt(9)
            run.font.name = "맑은 고딕"
            run.font.color.rgb = RGBColor(0x44, 0x72, 0xC4)

        if footer_text:
            footer = section.footer
            para = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
            para.clear()
            para.alignment = WD_ALIGN_PARAGRAPH.LEFT
            run = para.add_run(footer_text)
            run.font.size = Pt(9)
            run.font.name = "맑은 고딕"


# ──────────────────────────────────────────────────────────────────────────────
# 메타데이터 포함 저장
# ──────────────────────────────────────────────────────────────────────────────

def save_with_metadata(
    doc: Document,
    filepath: str,
    author: str = "",
    subject: str = "",
    keywords: str = "",
) -> str:
    """
    문서 메타데이터(작성자, 제목, 주제, 키워드, 마지막 수정일)를 설정하고 저장합니다.

    Args:
        doc:      Document 객체
        filepath: 저장 경로 (.docx 확장자 포함). 디렉토리가 없으면 자동 생성합니다.
        author:   작성자 이름
        subject:  문서 주제
        keywords: 키워드 (쉼표 구분)

    Returns:
        저장된 파일의 절대 경로
    """
    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)

    props = doc.core_properties
    if author:
        props.author = author
        props.last_modified_by = author
    if subject:
        props.subject = subject
    if keywords:
        props.keywords = keywords
    props.modified = datetime.now()

    doc.save(filepath)
    abs_path = os.path.abspath(filepath)
    print(f"문서 저장 완료: {abs_path}")
    return abs_path


# ──────────────────────────────────────────────────────────────────────────────
# 사용 예시 (직접 실행 시)
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    doc = create_document("샘플 보고서", author="홍길동")
    add_toc(doc)
    doc.add_heading("1. 소개", level=2)
    doc.add_paragraph("이 문서는 docx_helpers.py 사용 예시입니다.")
    add_styled_table(
        doc,
        headers=["항목", "수량", "단가", "금액"],
        rows=[
            ["사과", 10, "1,000원", "10,000원"],
            ["배", 5, "2,000원", "10,000원"],
        ],
    )
    add_header_footer(doc, header_text="샘플 보고서", footer_text="기밀 문서")
    add_page_number(doc)
    save_with_metadata(doc, "sample_output.docx", author="홍길동", subject="샘플", keywords="테스트, 예시")

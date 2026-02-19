# PPT Generator - 코드 예시

## 표 추가

```python
from pptx.util import Inches, Pt
from pptx.dml.color import RgbColor

def add_table_slide(self, title: str, headers: list[str], rows: list[list[str]]):
    """표가 포함된 슬라이드"""
    layout = self.prs.slide_layouts[self.layouts['title_only']]
    slide = self.prs.slides.add_slide(layout)
    slide.shapes.title.text = title

    cols = len(headers)
    row_count = len(rows) + 1

    left = Inches(0.5)
    top = Inches(2)
    width = Inches(9)
    height = Inches(0.4 * row_count)

    table = slide.shapes.add_table(row_count, cols, left, top, width, height).table

    for i, header in enumerate(headers):
        cell = table.cell(0, i)
        cell.text = header
        cell.fill.solid()
        cell.fill.fore_color.rgb = RgbColor(0x2E, 0x75, 0xB6)
        para = cell.text_frame.paragraphs[0]
        para.font.bold = True
        para.font.color.rgb = RgbColor(0xFF, 0xFF, 0xFF)
        para.font.size = Pt(12)

    for row_idx, row_data in enumerate(rows):
        for col_idx, cell_text in enumerate(row_data):
            cell = table.cell(row_idx + 1, col_idx)
            cell.text = str(cell_text)
            cell.text_frame.paragraphs[0].font.size = Pt(11)

    return slide
```

## 차트 추가

```python
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE

def add_chart_slide(self, title, chart_type, categories, series_data):
    layout = self.prs.slide_layouts[self.layouts['title_only']]
    slide = self.prs.slides.add_slide(layout)
    slide.shapes.title.text = title

    chart_data = CategoryChartData()
    chart_data.categories = categories
    for series_name, values in series_data.items():
        chart_data.add_series(series_name, values)

    chart_types = {
        'bar': XL_CHART_TYPE.BAR_CLUSTERED,
        'column': XL_CHART_TYPE.COLUMN_CLUSTERED,
        'line': XL_CHART_TYPE.LINE,
        'pie': XL_CHART_TYPE.PIE,
        'area': XL_CHART_TYPE.AREA,
        'doughnut': XL_CHART_TYPE.DOUGHNUT,
    }

    xl_chart_type = chart_types.get(chart_type, XL_CHART_TYPE.COLUMN_CLUSTERED)
    x, y, cx, cy = Inches(1), Inches(2), Inches(8), Inches(4.5)
    chart = slide.shapes.add_chart(xl_chart_type, x, y, cx, cy, chart_data).chart
    chart.has_legend = True
    chart.legend.include_in_layout = False
    return slide
```

## 마크다운 → PPT 변환

```python
import re

def markdown_to_slides(self, markdown_text: str):
    lines = markdown_text.strip().split('\n')
    current_title = ""
    current_bullets = []

    for line in lines:
        line = line.strip()
        if line.startswith('# ') and not line.startswith('## '):
            if current_title and current_bullets:
                self.add_content_slide(current_title, current_bullets)
                current_bullets = []
            self.add_title_slide(line[2:])
            current_title = ""
        elif line.startswith('## '):
            if current_title and current_bullets:
                self.add_content_slide(current_title, current_bullets)
                current_bullets = []
            current_title = line[3:]
        elif line.startswith('- ') or line.startswith('* '):
            current_bullets.append(line[2:])
        elif re.match(r'^\d+\. ', line):
            current_bullets.append(re.sub(r'^\d+\. ', '', line))
        elif line == '---':
            if current_title and current_bullets:
                self.add_content_slide(current_title, current_bullets)
                current_bullets = []
                current_title = ""

    if current_title and current_bullets:
        self.add_content_slide(current_title, current_bullets)
```

## JSON → PPT 변환

```python
import json

def json_to_slides(self, json_data: str | dict):
    if isinstance(json_data, str):
        data = json.loads(json_data)
    else:
        data = json_data

    self.add_title_slide(data.get('title', 'Presentation'), data.get('subtitle', ''))

    for slide_data in data.get('slides', []):
        slide_type = slide_data.get('type', 'content')
        if slide_type == 'content':
            self.add_content_slide(slide_data['title'], slide_data.get('bullets', []))
        elif slide_type == 'two_column':
            self.add_two_column_slide(slide_data['title'], slide_data.get('left', []), slide_data.get('right', []))
        elif slide_type == 'table':
            self.add_table_slide(slide_data['title'], slide_data['headers'], slide_data['rows'])
        elif slide_type == 'chart':
            self.add_chart_slide(slide_data['title'], slide_data.get('chart_type', 'column'), slide_data['categories'], slide_data['series'])
        elif slide_type == 'image':
            self.add_image_slide(slide_data['title'], slide_data['image_path'], slide_data.get('caption', ''))
```

## 전체 사용 예시

### 마크다운에서 PPT 생성

```python
markdown_content = """
# 2026년 분기별 실적 보고서

## 1분기 실적 요약
- 매출: 150억원 (전년 대비 20% 증가)
- 영업이익: 30억원
- 신규 고객: 1,500명

## 주요 성과
- 신규 서비스 런칭 성공
- 고객 만족도 95% 달성
"""

ppt = PPTGenerator('templates/corporate.pptx')
ppt.markdown_to_slides(markdown_content)
ppt.save('실적보고서.pptx')
```

### JSON에서 차트 포함 PPT

```python
presentation_data = {
    "title": "매출 분석 리포트",
    "subtitle": "2026년 1분기",
    "slides": [
        {"type": "content", "title": "Summary", "bullets": ["매출 20% 성장"]},
        {"type": "chart", "title": "분기별 매출", "chart_type": "column",
         "categories": ["Q1", "Q2", "Q3", "Q4"],
         "series": {"매출": [100, 120, 130, 145], "목표": [100, 110, 120, 130]}},
        {"type": "table", "title": "제품별 실적",
         "headers": ["제품", "매출", "성장률"],
         "rows": [["A", "80억", "+25%"], ["B", "50억", "+15%"]]}
    ]
}

ppt = PPTGenerator('templates/report.pptx')
ppt.json_to_slides(presentation_data)
ppt.save('매출분석.pptx')
```

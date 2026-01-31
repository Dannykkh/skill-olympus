# PPT Generator

Python python-pptx 기반 PowerPoint 프레젠테이션 생성 스킬.

## Features

- 템플릿 기반 PPT 생성
- 마크다운/JSON 입력 지원
- 차트/표/이미지 삽입
- 다양한 레이아웃 지원

## Requirements

```bash
pip install python-pptx Pillow
```

## Usage

```bash
/ppt-generator 분기별 실적 보고서 PPT 만들어줘
/ppt-generator --template company.pptx 신제품 소개 자료
/ppt-generator 이 마크다운 내용으로 PPT 생성해줘
```

## Templates

```
templates/
├── default.pptx          # 기본 템플릿
├── corporate.pptx        # 회사 브랜드 템플릿
├── pitch-deck.pptx       # 투자자 피칭용
└── report.pptx           # 리포트용
```

## Slide Types

| Type | Description |
|------|-------------|
| Title | 제목 슬라이드 |
| Content | 본문 + 불릿 |
| Two Column | 2단 레이아웃 |
| Image | 이미지 중심 |
| Chart | 차트/그래프 |
| Table | 표 데이터 |

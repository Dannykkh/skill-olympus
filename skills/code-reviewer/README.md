# Code Reviewer

자동 코드 리뷰 스킬. 코드 품질, 보안, 성능을 자동으로 검증합니다.

## Features

- 파일 크기 제한 (500줄)
- 함수 크기 제한 (50줄)
- 보안 취약점 검사
- 코드 스타일 검증
- 타입 정의 확인

## Triggers

- 파일 생성/수정 완료 시 자동 실행
- "코드 리뷰 해줘" 요청 시
- PR 생성 시

## Checklist

### Critical
- [ ] 파일 500줄 이하
- [ ] 함수 50줄 이하
- [ ] 보안 취약점 없음

### Warning
- [ ] 타입 정의 존재
- [ ] 에러 처리 적절
- [ ] 주석/문서화

## Output Format

```
# Code Review Results

## Summary
- Files reviewed: [count]
- Overall: [PASS/FAIL]

## Critical Issues
- file.py:42 - Function too long (67 lines)

## Warnings
- file.py:15 - Missing type annotation
```

---
name: bilingual-dev
description: |
  한↔영 이중언어 개발 가이드 (패시브). 코드, 문서, UI, 커밋 작성 시 자동 적용.
  프로젝트 CLAUDE.md에 "bilingual: ko-en" 설정 시 활성화.
auto_apply:
  - "*.ts"
  - "*.tsx"
  - "*.js"
  - "*.jsx"
  - "*.py"
  - "*.java"
  - "*.cs"
  - "*.md"
  - "*.json"
  - "*.yaml"
  - "*.yml"
references:
  - skills/ko-en-translator/SKILL.md
  - skills/ko-en-translator/references/tech-glossary.md
---

# Bilingual Development Guide (Passive)

프로젝트가 한↔영 이중언어로 설정되면 자동 적용되는 규칙.
별도 호출 없이 코드/문서 작성 시 양언어를 자연스럽게 유지합니다.

## 활성화 조건

프로젝트 `CLAUDE.md` 또는 `.claude/settings.json`에 다음 중 하나가 있으면 활성화:
```
bilingual: ko-en
```
또는 사용자가 "한영 번역", "이중언어", "bilingual" 등을 언급한 경우.

---

## 문서 규칙

### README 이중언어 유지

README.md(영문)와 README-ko.md(한국어)를 함께 유지합니다.

**작성 순서:**
1. 주 언어(한국어)로 먼저 작성
2. 영문 README를 동기화

**동기화 규칙:**
- 구조(헤딩, 섹션)는 동일하게 유지
- 코드 블록은 번역하지 않음
- 설치 명령어는 동일하게 유지
- 스크린샷/이미지 경로는 동일하게 유지

### CHANGELOG / 커밋 메시지

| 항목 | 언어 | 이유 |
|------|------|------|
| 커밋 메시지 | 영어 (Conventional Commits) | Git 호환성, CI/CD 파싱 |
| CHANGELOG.md | 영어 | npm/GitHub 생태계 |
| PR 제목 | 영어 | GitHub 인터페이스 |
| PR 본문 | 한국어 OK | 팀 내부용 |

커밋 메시지 예시:
```
feat(auth): add JWT refresh token rotation

리프레시 토큰 자동 갱신 기능 추가.
만료 30분 전에 자동으로 새 토큰을 발급합니다.
```

---

## i18n 파일 규칙

### JSON/YAML 로케일 파일

한쪽 언어를 추가하면 다른 쪽도 함께 추가합니다.

```
locales/
  ko.json    ← 한국어 (주 언어, 먼저 작성)
  en.json    ← 영어 (동기화)
```

**동기화 체크:**
- 모든 키가 양쪽에 존재하는지 확인
- 플레이스홀더(`{name}`, `{{count}}`)가 보존되었는지 확인
- 빈 값("")이 있으면 번역 누락으로 경고

### UI 문자열

하드코딩된 문자열 대신 반드시 i18n 키를 사용합니다.

```typescript
// Bad
<button>저장</button>

// Good
<button>{t('common.save')}</button>
```

---

## 에러 메시지 규칙

| 대상 | 언어 | 예시 |
|------|------|------|
| 로그 (서버) | 영어 | `logger.error("Failed to connect to DB")` |
| 사용자 화면 | i18n 키 | `t('error.connection_failed')` |
| 개발자 에러 (throw) | 영어 | `throw new Error("Invalid token format")` |

---

## 네이밍 규칙

| 항목 | 언어 | 예시 |
|------|------|------|
| 변수/함수/클래스명 | 영어 | `getUserProfile()` |
| 상수 | 영어 | `MAX_RETRY_COUNT` |
| DB 테이블/컬럼 | 영어 | `user_profiles.display_name` |
| 파일/폴더명 | 영어 | `user-service.ts` |
| 문서 | 양언어 | README.md + README-ko.md |

---

## 자동 적용 체크리스트

코드/문서 작성 시 자동으로 확인하는 항목:

- [ ] 새 문서 파일 → 양언어 필요 여부 판단
- [ ] 새 i18n 키 추가 → 양쪽 로케일 파일에 추가
- [ ] UI 문자열 → i18n 키 사용 여부
- [ ] 커밋 메시지 → 영어 Conventional Commits 형식
- [ ] 에러 메시지 → 로그는 영어, 사용자용은 i18n

## Reference

- [번역 스킬 상세](skills/ko-en-translator/SKILL.md) — 명시적 번역이 필요할 때 `/translate`로 호출
- [기술 용어 사전](skills/ko-en-translator/references/tech-glossary.md) — 용어 일관성 참조
- [번역 품질 가이드](skills/ko-en-translator/references/translation-guide.md) — 자연스러운 번역 규칙

# softaworks/agent-toolkit

> Claude Code용 실전 에이전트 스킬 모음 (session-handoff 포함)

## 기본 정보

| 항목 | 내용 |
|------|------|
| **저장소** | [github.com/softaworks/agent-toolkit](https://github.com/softaworks/agent-toolkit) |
| **제작자** | softaworks |
| **라이선스** | MIT |
| **분류** | Skills Collection |

---

## 개요

실제 개발 워크플로우에서 검증된 Claude Code 스킬 모음. 특히 **session-handoff** 스킬이 핵심으로, 세션 간 컨텍스트 전달 문제를 해결합니다.

**해결하는 문제:**
- 긴 세션에서 컨텍스트 윈도우 소진
- 새 에이전트가 이전 작업을 이어받을 때 정보 손실
- 세션 간 작업 연속성 부재

---

## 주요 기능

### session-handoff

세션 인수인계를 위한 구조화된 핸드오프 문서 생성.

**워크플로우:**
1. `create_handoff.py` - 스마트 스캐폴딩으로 핸드오프 문서 생성
2. `validate_handoff.py` - 완성도, 품질, 보안 검사
3. `list_handoffs.py` - 프로젝트 내 핸드오프 목록
4. `check_staleness.py` - 핸드오프 신선도 확인

**핸드오프 체이닝:**
```
handoff-1.md → handoff-2.md → handoff-3.md
    ↓              ↓              ↓
 초기 작업      이어받기       최신 상태
```

### 기타 스킬

- 에이전트 패턴 가이드
- 워크플로우 자동화 템플릿

---

## 설치 방법

```bash
# 전체 설치
npx add-skill softaworks/agent-toolkit -a claude-code

# 또는 수동 설치
git clone https://github.com/softaworks/agent-toolkit
cp -r agent-toolkit/skills/* ~/.claude/skills/
```

---

## 사용 예시

### 핸드오프 생성

```bash
# 새 핸드오프 생성
python scripts/create_handoff.py "implementing-auth"

# 이전 핸드오프 이어서
python scripts/create_handoff.py "auth-part-2" --continues-from 2026-01-15-auth.md
```

### 핸드오프 검증

```bash
python scripts/validate_handoff.py .claude/handoffs/2026-02-01-auth.md
# 출력: Quality Score: 85/100, No secrets detected
```

### 핸드오프 재개

```bash
python scripts/check_staleness.py .claude/handoffs/2026-02-01-auth.md
# 출력: FRESH - Safe to resume
```

---

## 장단점

### 장점
- 세션 간 컨텍스트 손실 방지
- 스크립트 기반 자동화 (Python)
- 핸드오프 체이닝으로 장기 프로젝트 지원
- 검증 시스템으로 품질 보장
- 보안 검사 (비밀키 탐지)

### 단점/주의사항
- Python 스크립트 실행 필요
- 핸드오프 문서 수동 작성 필요 (LLM이 채워야 함)
- 저장소가 `.claude/handoffs/`에 로컬 저장됨

---

## 이 프로젝트에서의 활용

`skills/session-handoff/` 스킬의 원본. 장기기억 시스템의 "구조화된 핸드오프" 부분을 담당.

**관련 파일:**
- [skills/session-handoff/](../../skills/session-handoff/)
- [docs/memory-system.md](../memory-system.md)

---

## 관련 리소스

- [Claude Code Hooks Documentation](https://docs.anthropic.com/claude-code/hooks)
- [장기기억 시스템 문서](../memory-system.md)

---

**문서 작성일:** 2026-02-01

# Codex CLI Integration

> OpenAI Codex CLI를 Claude Code에서 사용하기 위한 통합 스킬

## 기본 정보

| 항목 | 내용 |
|------|------|
| **저장소** | [github.com/skills-directory/skill-codex](https://github.com/skills-directory/skill-codex) |
| **제작자** | skills-directory |
| **라이선스** | MIT |
| **분류** | Skill (외부 AI 통합) |

---

## 개요

Claude Code가 Codex CLI (`codex exec`, 세션 재개)를 호출하여 자동화된 코드 분석, 리팩토링, 편집 워크플로우를 수행할 수 있게 해주는 스킬입니다.

---

## 사전 요구사항

- `codex` CLI 설치 및 PATH에 추가
- Codex 자격 증명 및 설정 구성
- 설치 확인: `codex --version`

---

## 설치 방법

```bash
git clone --depth 1 git@github.com:skills-directory/skill-codex.git /tmp/skills-temp && \
mkdir -p ~/.claude/skills && \
cp -r /tmp/skills-temp/ ~/.claude/skills/codex && \
rm -rf /tmp/skills-temp
```

---

## 사용 예시

### 기본 워크플로우

**사용자 프롬프트:**
```
Use codex to analyze this repository and suggest improvements for my claude code skill.
```

**Claude Code 응답:**
1. 사용할 모델 선택 (`gpt-5.5` 기본, 또는 `gpt-5.3-codex` for 코딩 특화)
2. 추론 노력 수준 선택 (`low`, `medium`, `high`, `xhigh`)
3. 적절한 샌드박스 모드 선택 (분석은 `read-only` 기본값)
4. 명령 실행:

```bash
codex exec -m gpt-5.5 \
  --config model_reasoning_effort="high" \
  --sandbox read-only \
  --full-auto \
  --skip-git-repo-check \
  "Analyze this Claude Code skill repository comprehensively..." 2>/dev/null
```

---

## 모델 옵션

| 모델 | 용도 | 비고 |
|------|------|------|
| `gpt-5.5` ⭐ | **최신 플래그십 (default)**: 복잡한 코딩, computer use, 지식 작업, 리서치 워크플로우 | 2026-04부터 ChatGPT 로그인 + API 키 모두 사용 가능 |
| `gpt-5.4` | 전 플랫폼 사용 가능한 플래그십 대안 | `gpt-5.5` 미지원 환경의 fallback |
| `gpt-5.4-mini` | 빠르고 효율적인 mini (sub-agent, 정리 작업) | 저비용, 가벼운 작업용 |
| `gpt-5.3-codex` | 복잡 소프트웨어 엔지니어링 특화 | GPT-5.4의 코딩 백본 |
| `gpt-5.3-codex-spark` | 실시간 코딩 반복 (text-only research preview) | ChatGPT Pro 전용 |
| `gpt-5.2` | 레거시 범용 | 이전 default |

> 정확한 컨텍스트/가격은 공식 모델 카드 확인 (preview/stable 상태에 따라 변동).

---

## 추론 노력 수준

| 수준 | 용도 |
|------|------|
| `xhigh` | 초복잡 작업 (심층 문제 분석, 복잡한 추론) |
| `high` | 복잡한 작업 (리팩토링, 아키텍처, 보안 분석) |
| `medium` | 표준 작업 (리팩토링, 기능 추가, 버그 수정) |
| `low` | 간단한 작업 (빠른 수정, 문서화) |

---

## 빠른 참조

| 사용 사례 | 샌드박스 모드 | 주요 플래그 |
|----------|--------------|------------|
| 읽기 전용 리뷰/분석 | `read-only` | `--sandbox read-only 2>/dev/null` |
| 로컬 편집 적용 | `workspace-write` | `--sandbox workspace-write --full-auto` |
| 네트워크/광범위 접근 허용 | `danger-full-access` | `--sandbox danger-full-access --full-auto` |
| 최근 세션 재개 | 원본에서 상속 | `echo "prompt" \| codex exec resume --last` |

---

## 주요 특징

- **Thinking Token 억제**: 기본적으로 `2>/dev/null`로 stderr 출력 억제 (컨텍스트 윈도우 절약)
- **세션 재개**: `codex resume` 또는 "추가 분석 계속"으로 언제든 세션 재개 가능
- **캐시 입력 할인**: 반복 컨텍스트에 90% 할인 ($0.125/M 토큰), 최대 24시간 캐시 유지

---

## 요구사항

- 최신 Codex CLI (GPT-5.5 모델 지원)
- 버전 확인: `codex --version` / 업데이트: `npm install -g @openai/codex@latest`

---

**문서 작성일:** 2026-02-02

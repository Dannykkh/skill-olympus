# Archive Procedure — 이전 실행 산출물 정리

Zeus의 **새 실행**에서만 이전 실행 산출물을 타임스탬프 디렉토리로 이동한다.
먼저 [phase-transitions.md의 재개 로직](phase-transitions.md#재개-로직)으로 정본·구경로 상태를 확인한다.
진행 중 실행의 재개나 상태 충돌/손상에서는 이 절차를 실행하지 않는다.
아래 경로는 고정된 대상 `project_root` 기준이며, 계획 폴더나 임의의 하위 cwd를 기준으로 옮기지 않는다.

---

## 아카이브 대상 파일

- `plan.md`, `interview.md`, `qa-scenarios.md`
- `sections/` 디렉토리 전체
- `docs/zeus/zeus-log.md`, `docs/zeus/zeus-report.md`, `docs/zeus/zeus-state.json`

## 실행 절차

1. 위 대상 파일 중 **하나라도 존재하는지** 확인하고, 기존 Zeus 실행이 만든 산출물임을 로그·상태로 대조한다. 소유 범위가 확인되지 않는 사용자 파일은 이동하지 않는다. 이동 원본과 대상의 절대경로가 의도한 프로젝트/아카이브 아래인지 확인한다.
2. 존재하면 타임스탬프 기반 아카이브 디렉토리 생성:
   ```bash
   ARCHIVE_DIR="docs/zeus/archive/$(date +%Y%m%d-%H%M%S)"
   mkdir -p "$ARCHIVE_DIR"
   ```
3. 대상 파일/디렉토리를 아카이브로 **이동** (복사가 아닌 이동):
   ```bash
   # 존재하는 파일만 이동
   [ -f plan.md ] && mv plan.md "$ARCHIVE_DIR/"
   [ -f interview.md ] && mv interview.md "$ARCHIVE_DIR/"
   [ -f qa-scenarios.md ] && mv qa-scenarios.md "$ARCHIVE_DIR/"
   [ -d sections ] && mv sections "$ARCHIVE_DIR/"
   [ -f docs/zeus/zeus-log.md ] && mv docs/zeus/zeus-log.md "$ARCHIVE_DIR/"
   [ -f docs/zeus/zeus-report.md ] && mv docs/zeus/zeus-report.md "$ARCHIVE_DIR/"
   [ -f docs/zeus/zeus-state.json ] && mv docs/zeus/zeus-state.json "$ARCHIVE_DIR/"
   ```
4. 아카이브 완료 로그:
   ```
   [ZEUS] 이전 산출물을 {ARCHIVE_DIR}로 아카이브 완료
   ```
5. 대상 파일이 하나도 없으면 아카이브 생략 (첫 실행)

**주의:** `docs/zeus/archive/` 디렉토리 자체는 아카이브 대상이 아닙니다. 누적 보존됩니다.

## 출력 디렉토리 초기화

아카이브 완료 후:
```bash
mkdir -p docs/zeus
```

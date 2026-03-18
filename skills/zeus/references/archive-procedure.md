# Archive Procedure — 이전 실행 산출물 정리

Zeus Phase 0의 첫 번째 동작: 이전 실행 산출물을 타임스탬프 디렉토리로 이동.

---

## 아카이브 대상 파일

- `plan.md`, `interview.md`, `qa-scenarios.md`
- `sections/` 디렉토리 전체
- `docs/zeus/zeus-log.md`, `docs/zeus/zeus-report.md`, `docs/zeus/zeus-state.json`

## 실행 절차

1. 위 대상 파일 중 **하나라도 존재하는지** 확인
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

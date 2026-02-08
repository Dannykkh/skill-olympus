# Section Parser

`sections/index.md`에서 SECTION_MANIFEST와 의존성 그래프를 파싱하는 프로토콜.

## 파싱 절차

### 1. SECTION_MANIFEST 추출

```markdown
<!-- SECTION_MANIFEST
section-01-foundation
section-02-config
section-03-parser
section-04-api
END_MANIFEST -->
```

**파싱 규칙:**
- `<!-- SECTION_MANIFEST` 와 `END_MANIFEST -->` 사이의 줄을 추출
- 각 줄이 하나의 섹션 이름 (format: `section-NN-name`)
- 빈 줄, 공백 무시
- 순서가 기본 실행 순서 (의존성 그래프로 오버라이드 가능)

### 2. Dependency Graph 추출

index.md의 Dependency Graph 테이블 파싱:

```markdown
| Section | Depends On | Blocks | Parallelizable |
|---------|------------|--------|----------------|
| section-01-foundation | - | section-02, section-03 | Yes |
| section-02-config | section-01 | section-04 | No |
| section-03-parser | section-01 | section-04 | Yes |
| section-04-api | section-02, section-03 | - | No |
```

**파싱 규칙:**
- `Depends On` 컬럼에서 의존성 추출
- `-` 또는 비어있으면 의존성 없음 (Wave 1 후보)
- 쉼표로 구분된 복수 의존성 지원
- 섹션명에서 `section-` 접두사가 생략된 경우 (예: `01`) 자동 매핑

### 3. 섹션 파일 존재 확인

SECTION_MANIFEST의 각 섹션에 대해:
```
Glob("sections/section-NN-*.md")
```

존재하지 않는 섹션 파일이 있으면 경고:
```
⚠️ section-03-parser.md 파일이 없습니다. 이 섹션은 실행할 수 없습니다.
```

### 4. 파일 소유권 추출

각 `section-NN-*.md` 파일에서 "Files to Create/Modify" 섹션 파싱:

```markdown
## Files to Create/Modify

- `src/core/foundation.ts` - 기반 모듈
- `src/core/types.ts` - 타입 정의
```

**파싱 규칙:**
- `## Files to Create/Modify` 또는 `## Files` 헤딩 아래의 목록
- 백틱 안의 파일 경로 추출
- glob 패턴도 지원 (`src/core/**`)

### 5. 출력 형식

파싱 결과를 내부 데이터 구조로 구성:

```
sections:
  - name: section-01-foundation
    dependsOn: []
    blocks: [section-02-config, section-03-parser]
    files: [src/core/foundation.ts, src/core/types.ts]
    fileExists: true

  - name: section-02-config
    dependsOn: [section-01-foundation]
    blocks: [section-04-api]
    files: [src/config/index.ts]
    fileExists: true
```

## 에러 처리

| 상황 | 대응 |
|------|------|
| SECTION_MANIFEST 없음 | "index.md에 SECTION_MANIFEST 블록이 필요합니다" 에러 |
| Dependency Graph 테이블 없음 | MANIFEST 순서를 순차 의존성으로 가정 (01→02→03...) |
| 섹션 파일 누락 | 경고 출력, 해당 섹션은 skip 가능 여부 사용자에게 확인 |
| 의존성 대상 섹션이 MANIFEST에 없음 | 경고 출력, 해당 의존성 무시 |

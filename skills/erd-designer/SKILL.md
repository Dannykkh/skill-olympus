---
name: erd-designer
description: ERD (Entity Relationship Diagram) 생성 스킬. Mermaid 다이어그램 형식.
---

# ERD Designer

## 출력 형식
\`\`\`mermaid
erDiagram
    users ||--o{ test_data : creates
    users {
        uuid user_id PK
        string employee_id
    }
\`\`\`

**사용:** "전체 ERD 생성해줘"

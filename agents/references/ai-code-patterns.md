# AI/ML Code Patterns

`ai-ml.md` 에이전트의 상세 코드 패턴입니다.

## FastAPI Endpoint

```python
from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.llm_service import LLMService

router = APIRouter(prefix="/api/v1/ai", tags=["AI"])

class AnalysisRequest(BaseModel):
    document_version_id: int
    text_content: str
    file_name: str

class AnalysisResponse(BaseModel):
    analysis_id: str
    summary: str
    key_entities: dict
    suggested_classification: dict
    quality_flags: list[dict]
    sections: list[dict]

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_document(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    llm_service: LLMService = Depends(get_llm_service),
):
    """
    LLM을 사용한 문서 분석.
    - 요약 생성
    - 핵심 엔티티 추출 (날짜, 버전, 서명자)
    - 분류 제안
    - 품질 이슈 식별
    """
    try:
        result = await llm_service.analyze_document(
            text=request.text_content,
            file_name=request.file_name,
        )
        # 임베딩 생성을 백그라운드로
        background_tasks.add_task(
            generate_embeddings,
            document_version_id=request.document_version_id,
            text=request.text_content,
        )
        return AnalysisResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## LLM Service

```python
import anthropic
import json
from typing import Optional
from app.prompts.analysis import ANALYSIS_PROMPT
from app.config import settings

class LLMService:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        # ⚠️ 모델명은 WebSearch로 확인 후 설정 (하드코딩 금지)
        self.model = settings.LLM_MODEL

    async def analyze_document(
        self,
        text: str,
        file_name: str,
        artifact_list: Optional[list] = None,
    ) -> dict:
        """Claude로 문서 분석."""
        prompt = ANALYSIS_PROMPT.format(
            file_name=file_name,
            text_content=text[:50000],  # 컨텍스트 한도 고려
            artifact_list=artifact_list or "Standard artifacts",
        )
        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
            system="You are an expert in document analysis."
        )
        response_text = message.content[0].text
        return self._parse_analysis_response(response_text)

    def _parse_analysis_response(self, response: str) -> dict:
        """LLM 응답을 구조화된 형식으로 파싱."""
        try:
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            return json.loads(response[json_start:json_end])
        except json.JSONDecodeError:
            return self._fallback_parse(response)
```

## RAG Search Service

```python
from typing import Optional
from pymilvus import connections, Collection
from openai import OpenAI

class RAGSearchService:
    def __init__(self):
        self.openai = OpenAI()
        self.embedding_model = "text-embedding-3-large"
        self.collection_name = "document_chunks"
        connections.connect(host="localhost", port=19530)
        self.collection = Collection(self.collection_name)

    async def search(
        self,
        query: str,
        study_id: int,
        tenant_id: int,
        top_k: int = 10,
        artifact_types: Optional[list[str]] = None,
    ) -> list[dict]:
        """시맨틱 유사도 기반 문서 검색."""
        embedding = self._get_embedding(query)

        filter_expr = f"tenant_id == {tenant_id} and study_id == {study_id}"
        if artifact_types:
            artifacts_str = ", ".join([f'"{a}"' for a in artifact_types])
            filter_expr += f" and artifact_type in [{artifacts_str}]"

        results = self.collection.search(
            data=[embedding],
            anns_field="embedding",
            param={"metric_type": "COSINE", "params": {"nprobe": 10}},
            limit=top_k,
            expr=filter_expr,
            output_fields=["document_id", "chunk_text", "page_number", "document_title"]
        )
        return self._format_results(results[0])

    async def ask(
        self,
        question: str,
        study_id: int,
        tenant_id: int,
    ) -> dict:
        """RAG 기반 질문 답변."""
        chunks = await self.search(
            query=question, study_id=study_id,
            tenant_id=tenant_id, top_k=5,
        )
        context = self._build_context(chunks)
        answer = await self._generate_answer(question, context)
        return {"answer": answer, "sources": chunks}

    def _get_embedding(self, text: str) -> list[float]:
        """텍스트 임베딩 생성."""
        response = self.openai.embeddings.create(
            model=self.embedding_model, input=text,
        )
        return response.data[0].embedding
```

"""银发乡播 · AI 问答助手后端（FastAPI）。

启动：
    pip install -r server/requirements.txt
    python -m uvicorn server.app:app --host 127.0.0.1 --port 8000
浏览器访问 http://127.0.0.1:8000 即同时打开看板与问答接口。

可选环境变量：
    LLM_BASE_URL / LLM_API_KEY / LLM_MODEL   OpenAI 兼容接口，用于生成式回答
    LOCAL_MODEL_PATH / LORA_ADAPTER_PATH     本地模型 + LoRA 适配器路径
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .agent import Agent
from .local_model import resolve_adapter_path
from .rag import RagAssistant

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
KB_DIR = BASE_DIR / "knowledge_base"
FEEDBACK_FILE = BASE_DIR / "data" / "feedback.jsonl"

app = FastAPI(title="银发乡播 AI 问答助手", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

assistant = RagAssistant(KB_DIR)
agent = Agent(assistant)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=800)
    top_k: int = Field(default=4, ge=1, le=8)
    history: list[ChatMessage] = Field(default_factory=list)


class FeedbackRequest(BaseModel):
    question: str = ""
    answer: str = ""
    rating: str = "ok"
    comment: str = ""


def _health_payload() -> dict:
    return {
        "status": "ok",
        "service": "银发乡播 AI 问答助手",
        "kb": assistant.stats,
        "engine": "tf-idf-cosine",
        "llm": {
            "configured": bool(
                os.environ.get("LLM_BASE_URL")
                and os.environ.get("LLM_API_KEY")
                and os.environ.get("LLM_MODEL")
            ),
            "model": os.environ.get("LLM_MODEL") or None,
        },
        "lora": {
            "adapter": resolve_adapter_path(),
            "local_model": os.environ.get("LOCAL_MODEL_PATH") or None,
        },
        "agent": agent.info,
        "time": datetime.now().isoformat(timespec="seconds"),
    }


@app.get("/api/health")
def health() -> dict:
    return _health_payload()


@app.get("/api/kb")
def knowledge_base() -> dict:
    return {
        "documents": assistant.kb.documents,
        "chunks": len(assistant.kb.chunks),
    }


@app.get("/api/tools")
def tools() -> dict:
    return {"agent": agent.info, "tools": agent.tool_specs}


@app.post("/api/chat")
def chat(payload: ChatRequest) -> dict:
    started = time.perf_counter()
    result = agent.answer(
        payload.question,
        top_k=payload.top_k,
        history=[item.model_dump() for item in payload.history],
    )
    result["latency_ms"] = round((time.perf_counter() - started) * 1000, 1)
    result["question"] = payload.question
    return result


@app.post("/api/feedback")
def feedback(payload: FeedbackRequest) -> dict:
    FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)
    record = {
        "time": datetime.now().isoformat(timespec="seconds"),
        **payload.model_dump(),
    }
    with FEEDBACK_FILE.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, ensure_ascii=False) + "\n")
    return {"ok": True}


# 只托管页面依赖的静态资源，避免把台账 Excel / 报告等原始文件暴露在服务根目录
if (ROOT_DIR / "index.html").exists():
    app.mount("/css", StaticFiles(directory=str(ROOT_DIR / "css")), name="css")
    app.mount("/js", StaticFiles(directory=str(ROOT_DIR / "js")), name="js")

    @app.get("/", include_in_schema=False)
    @app.get("/index.html", include_in_schema=False)
    def index_page() -> FileResponse:
        return FileResponse(ROOT_DIR / "index.html")

    @app.get("/bigscreen.html", include_in_schema=False)
    def bigscreen_page() -> FileResponse:
        return FileResponse(ROOT_DIR / "bigscreen.html")

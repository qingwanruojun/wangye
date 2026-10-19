"""轻量 RAG：本地知识库分块 + TF-IDF 余弦检索 + 句子级抽取回答。

不依赖任何第三方库；若配置了 OpenAI 兼容的 LLM 接口，则把检索结果作为
上下文交给模型生成答案，否则直接从命中段落中抽取最相关句子。
"""

from __future__ import annotations

import json
import math
import os
import re
import urllib.error
import urllib.request
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

CJK_RE = re.compile(r"[一-鿿]+")
LATIN_RE = re.compile(r"[a-z0-9]+")
SENTENCE_RE = re.compile(r"[^。！？\n]+[。！？]?")

GREETING_RE = re.compile(
    r"^(你好|您好|hi|hello|hey|在吗|你是谁|你叫什么|介绍一下你自己|能做什么|你会什么)[\s!！。.？?]*$",
    re.IGNORECASE,
)

# 追问（「那收益呢？」「它怎么算？」）需要带上上一轮问题一起检索
FOLLOWUP_RE = re.compile(
    r"^(那|那么|还有|这个|那个|这些|上述|上面|刚才|它|他|她)|呢[？?]?\s*$"
)

PUNCT_RE = re.compile(r"[\s，。；：、！？「」『』“”‘’（）()\[\]【】¥$%\-—–/\\.,;:!?\"'·]+")

QUESTION_STOPWORDS = {
    "什么", "怎么", "如何", "哪些", "哪个", "是否", "可以", "能不能", "有没有",
    "这个", "那个", "一下", "请问", "告诉", "我们", "你们", "他们", "以及",
    "多少", "为什么", "目前", "现在", "相关", "情况", "介绍", "说说", "看看",
    "是什", "有哪", "怎样", "为什", "能否", "是", "的", "了", "在", "和",
    "与", "及", "或", "也", "都", "有", "吗", "呢", "吧", "啊",
}


def tokenize(text: str) -> list[str]:
    """中文二元组 + 单字 + 英文/数字词，兼顾召回与轻量。"""
    text = text.lower()
    tokens: list[str] = LATIN_RE.findall(text)
    for run in CJK_RE.findall(text):
        tokens.extend(run[i : i + 2] for i in range(len(run) - 1))
        tokens.extend(run)
    return [t for t in tokens if t not in QUESTION_STOPWORDS]


def token_weight(token: str) -> float:
    """二元组承载语义，单字只做辅助召回，避免「其/他/村」这类噪声。"""
    return 0.3 if len(token) == 1 and CJK_RE.fullmatch(token) else 1.0


def _char_bigrams(text: str) -> set[str]:
    normalized = PUNCT_RE.sub("", text)
    if len(normalized) < 2:
        return {normalized} if normalized else set()
    return {normalized[i : i + 2] for i in range(len(normalized) - 1)}


def _overlap_coefficient(a: set[str], b: set[str]) -> float:
    """重叠系数：短句被长句完整包含时也能识别为重复。"""
    if not a or not b:
        return 0.0
    return len(a & b) / min(len(a), len(b))


@dataclass
class Chunk:
    doc_id: str
    doc_title: str
    heading: str
    text: str
    tokens: Counter = field(default_factory=Counter)
    weight: dict[str, float] = field(default_factory=dict)

    def to_source(self, score: float) -> dict:
        return {
            "doc": self.doc_id,
            "title": self.doc_title,
            "heading": self.heading,
            "snippet": self.text[:220].replace("\n", " ").strip(),
            "score": round(score, 4),
        }


def _split_markdown(path: Path) -> tuple[str, list[tuple[str, str]]]:
    """返回 (文档标题, [(小节标题, 段落文本), ...])。"""
    raw = path.read_text(encoding="utf-8")
    lines = raw.splitlines()
    doc_title = path.stem
    heading = "概览"
    sections: list[tuple[str, list[str]]] = []
    buffer: list[str] = []

    def flush() -> None:
        if any(line.strip() for line in buffer):
            sections.append((heading, list(buffer)))
        buffer.clear()

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# "):
            flush()
            doc_title = stripped[2:].strip()
            continue
        if stripped.startswith("## "):
            flush()
            heading = stripped[3:].strip()
            continue
        buffer.append(line)

    flush()
    return doc_title, [(h, "\n".join(b).strip()) for h, b in sections if b]


def _chunk_text(text: str, max_chars: int = 420, overlap: int = 80) -> Iterable[str]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    current = ""
    for para in paragraphs:
        if not current:
            current = para
        elif len(current) + len(para) + 2 <= max_chars:
            current = f"{current}\n{para}"
        else:
            yield current
            tail = current[-overlap:] if overlap else ""
            current = f"{tail}\n{para}" if tail else para
            while len(current) > max_chars * 2:
                yield current[:max_chars]
                current = current[max_chars - overlap :]
    if current.strip():
        yield current


class KnowledgeBase:
    def __init__(self, kb_dir: Path):
        self.kb_dir = Path(kb_dir)
        self.chunks: list[Chunk] = []
        self.documents: list[dict] = []
        self._idf: dict[str, float] = {}
        self._load()

    def _load(self) -> None:
        if not self.kb_dir.exists():
            return
        for path in sorted(self.kb_dir.glob("*.md")):
            title, sections = _split_markdown(path)
            doc_chunks = 0
            for heading, section_text in sections:
                for piece in _chunk_text(section_text):
                    chunk = Chunk(
                        doc_id=path.name,
                        doc_title=title,
                        heading=heading,
                        text=piece.strip(),
                    )
                    chunk.tokens = Counter(tokenize(f"{title} {heading} {piece}"))
                    if not chunk.tokens:
                        continue
                    self.chunks.append(chunk)
                    doc_chunks += 1
            self.documents.append(
                {"doc": path.name, "title": title, "chunks": doc_chunks}
            )
        self._build_index()

    def _build_index(self) -> None:
        if not self.chunks:
            return
        df: Counter = Counter()
        for chunk in self.chunks:
            df.update(chunk.tokens.keys())
        total = len(self.chunks)
        self._idf = {
            token: math.log((total + 1) / (count + 1)) + 1.0
            for token, count in df.items()
        }
        for chunk in self.chunks:
            total = max(sum(chunk.tokens.values()), 1)
            vector = {
                token: (count / total) * self._idf[token] * token_weight(token)
                for token, count in chunk.tokens.items()
            }
            norm = math.sqrt(sum(value * value for value in vector.values())) or 1.0
            chunk.weight = {token: value / norm for token, value in vector.items()}

    def _query_vector(self, question: str) -> dict[str, float]:
        tokens = Counter(tokenize(question))
        if not tokens:
            return {}
        total = sum(tokens.values())
        vector = {
            token: (count / total) * self._idf.get(token, 1.0) * token_weight(token)
            for token, count in tokens.items()
            if token in self._idf
        }
        norm = math.sqrt(sum(value * value for value in vector.values())) or 1.0
        return {token: value / norm for token, value in vector.items()}

    def search(self, question: str, top_k: int = 4) -> list[tuple[Chunk, float]]:
        query = self._query_vector(question)
        if not query:
            return []
        query_bigrams = {token for token in query if len(token) >= 2}
        scored: list[tuple[Chunk, float]] = []
        for chunk in self.chunks:
            # 至少命中一个中文二元组，避免只靠「电/脑」等单字误召回
            if query_bigrams and not query_bigrams.intersection(chunk.tokens):
                continue
            score = sum(value * chunk.weight.get(token, 0.0) for token, value in query.items())
            if score > 0:
                scored.append((chunk, score))
        scored.sort(key=lambda item: item[1], reverse=True)
        return scored[:top_k]

    def sentence_pick(self, question: str, results: list[tuple[Chunk, float]], limit: int = 3) -> list[str]:
        query = self._query_vector(question)
        if not query:
            return []
        query_bigrams = {token for token in query if len(token) >= 2}
        candidates: list[tuple[float, str]] = []
        for chunk, chunk_score in results:
            if chunk_score < results[0][1] * 0.4:
                break
            # 短编号列表整体作为一条候选，避免只抽到「1. 入门认知」
            numbered = [
                item.strip().rstrip("。；，、 ")
                for item in re.findall(r"^\s*\d+[.、]\s*(.+?)\s*$", chunk.text, re.M)
            ]
            has_numbered = len(numbered) >= 2 and all(len(item) <= 14 for item in numbered)
            if has_numbered:
                grouped = f"{chunk.heading}：{'、'.join(numbered)}。"
                tokens = Counter(tokenize(grouped))
                if query_bigrams.intersection(tokens):
                    overlap = sum(
                        query.get(token, 0.0) * self._idf.get(token, 0.0) * count
                        for token, count in tokens.items()
                    )
                    candidates.append((overlap + chunk_score * 0.35, grouped))
            for sentence in SENTENCE_RE.findall(chunk.text):
                sentence = sentence.strip(" \n-*#")
                if len(sentence) < 6:
                    continue
                if has_numbered and re.match(r"^\d+[.、]", sentence):
                    continue
                sentence = re.sub(r"^\d+[.、]\s*", "", sentence)
                # 把小节标题并入打分，帮助「如何复制到其他村庄」这类标题即答案的段落
                tokens = Counter(tokenize(f"{chunk.heading}。{sentence}"))
                if not tokens or not query_bigrams.intersection(tokens):
                    continue
                overlap = sum(
                    query.get(token, 0.0) * self._idf.get(token, 0.0) * count
                    for token, count in tokens.items()
                )
                score = overlap + chunk_score * 0.35
                candidates.append((score, sentence))
        candidates.sort(key=lambda item: item[0], reverse=True)

        if not candidates or candidates[0][0] <= 0:
            return []
        # 只保留与最佳候选差距不大的句子，避免低相关段落被强行拼进回答
        floor = candidates[0][0] * 0.4

        picked: list[str] = []
        picked_grams: list[set[str]] = []
        for score, sentence in candidates:
            if score < floor:
                break
            grams = _char_bigrams(sentence)
            if any(_overlap_coefficient(grams, prev) >= 0.45 for prev in picked_grams):
                continue
            picked.append(sentence)
            picked_grams.append(grams)
            if len(picked) >= limit:
                break
        return picked


def _retrieval_query(question: str, history: list[dict] | None) -> str:
    """追问时把上一轮问题并入检索词，让「那收益呢？」仍能命中上下文。"""
    if not history or not FOLLOWUP_RE.search(question):
        return question
    for item in reversed(history):
        if item.get("role") == "user" and item.get("content"):
            previous = str(item["content"]).strip()
            if previous and previous != question:
                return f"{previous} {question}"
            break
    return question


class RagAssistant:
    def __init__(self, kb_dir: Path):
        self.kb = KnowledgeBase(kb_dir)

    @property
    def stats(self) -> dict:
        return {
            "documents": len(self.kb.documents),
            "chunks": len(self.kb.chunks),
        }

    def answer(self, question: str, top_k: int = 4, history: list[dict] | None = None) -> dict:
        question = (question or "").strip()
        if not question:
            return self._result("请先输入一个问题，例如「香椿季有哪些爆款选题？」", [], "rag-local")

        if GREETING_RE.match(question):
            return self._result(
                "你好，我是乡播 AI 问答助手。我可以基于本项目的台账知识库回答：主播成长、视频号流量、电商分成、农文旅运营、村庄适配度评估、隐私合规，以及 RAG / LoRA 的实现方式。",
                [],
                self.current_mode(has_context=False),
            )

        search_query = _retrieval_query(question, history)
        results = self.kb.search(search_query, top_k=top_k)
        sources = [chunk.to_source(score) for chunk, score in results]
        best_score = results[0][1] if results else 0.0

        if not results or best_score < 0.10:
            return self._result(
                "知识库中没有检索到足够相关的内容。可以换一种问法，或试试：账号表现、六阶成长、创作分成、香椿季选题、AHP 适配度、隐私保护。",
                sources,
                self.current_mode(has_context=False),
            )

        llm_answer = self._call_local_model(question, results)
        mode = "lora-rag"
        if llm_answer is None:
            llm_answer = self._call_llm(question, results, history or [])
            mode = "llm-rag"
        if llm_answer is None:
            sentences = self.kb.sentence_pick(search_query, results)
            if sentences:
                body = "".join(sentences)
            else:
                body = results[0][0].text[:300]
            llm_answer = f"根据项目知识库：{body}"
            mode = "rag-local"

        return self._result(llm_answer, sources, mode)

    def current_mode(self, has_context: bool = True) -> str:
        if not has_context:
            return "rag-local"
        if _local_model_configured():
            return "lora-rag"
        if _llm_configured():
            return "llm-rag"
        return "rag-local"

    def _call_local_model(self, question: str, results: list[tuple[Chunk, float]]) -> str | None:
        if not _local_model_configured():
            return None
        try:
            from .local_model import LocalLoraModel

            model = LocalLoraModel.get()
            return model.generate(question, _context_text(results))
        except Exception:
            return None

    def _call_llm(self, question: str, results: list[tuple[Chunk, float]], history: list[dict]) -> str | None:
        if not _llm_configured():
            return None
        base_url = os.environ["LLM_BASE_URL"].rstrip("/")
        payload = {
            "model": os.environ["LLM_MODEL"],
            "temperature": 0.2,
            "max_tokens": 700,
            "messages": _llm_messages(question, results, history),
        }
        request = urllib.request.Request(
            f"{base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {os.environ['LLM_API_KEY']}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                data = json.loads(response.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"].strip()
            return content or None
        except (urllib.error.URLError, KeyError, IndexError, json.JSONDecodeError, TimeoutError):
            return None

    @staticmethod
    def _result(answer: str, sources: list[dict], mode: str) -> dict:
        return {"answer": answer, "sources": sources, "mode": mode}


def _context_text(results: list[tuple[Chunk, float]]) -> str:
    parts = []
    for chunk, _score in results:
        parts.append(f"【{chunk.doc_title} · {chunk.heading}】\n{chunk.text}")
    return "\n\n".join(parts)


def _llm_messages(question: str, results: list[tuple[Chunk, float]], history: list[dict]) -> list[dict]:
    system = (
        "你是「银发乡播·AI 适老化大数据服务看板」的问答助手。"
        "请只依据给出的项目知识库片段回答，不要编造台账中没有的数字；"
        "资料不足时明确说明，并建议用户查看对应页面。"
        "回答使用简体中文，语气亲切、简洁，适合村委与银发主播阅读，必要时用短列表。"
    )
    messages = [{"role": "system", "content": system}]
    for item in history[-6:]:
        role = item.get("role")
        content = str(item.get("content", ""))[:1200]
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})
    messages.append(
        {
            "role": "user",
            "content": f"知识库片段：\n{_context_text(results)}\n\n用户问题：{question}",
        }
    )
    return messages


def _llm_configured() -> bool:
    return all(os.environ.get(key) for key in ("LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"))


def _local_model_configured() -> bool:
    return bool(os.environ.get("LOCAL_MODEL_PATH"))

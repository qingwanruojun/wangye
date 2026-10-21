"""对话式工具调用 Agent。

编排策略：
1. 配置了 OpenAI 兼容接口 → function calling 循环（最多 3 步），由模型决定调用哪个工具；
2. 否则 → 规则编排：按意图选择 1–2 个工具，再用本地 LoRA 或抽取式回答合成；
3. 没有命中任何意图 → 回退到原有 RAG 问答。

工具只读，所有参数在服务端校验，工具结果以 JSON/文本回填给模型。
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request

from .ledger import (
    ACCOUNT_ALIASES,
    ACCOUNTS,
    GROWTH_STAGES,
    VILLAGES,
    find_accounts,
    find_villages,
    format_account,
    format_village,
    training_stats,
)
from .rag import RagAssistant, _context_text

MAX_STEPS = 3

AGENT_SYSTEM = (
    "你是「银发乡播 · AI 适老化大数据服务看板」的对话式助手。"
    "你可以调用工具查询主播台账、项目知识库、AHP 村庄适配度和培训统计。"
    "回答必须基于工具返回结果，不得编造数字；信息不足时明确说明。"
    "需要多个信息时可以连续调用工具，但最多 3 步。"
    "回答使用简体中文，简洁亲切，适合村委与银发主播阅读。"
)

TOOL_SPECS = [
    {
        "type": "function",
        "function": {
            "name": "search_knowledge",
            "description": "检索项目知识库（主播成长、流量运营、电商分成、农文旅、适配度、隐私合规、FAQ）。",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {"type": "string", "description": "检索问题"},
                    "top_k": {"type": "integer", "description": "返回片段数，1-8"},
                },
                "required": ["question"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_account_profile",
            "description": "查询银发主播的一人一档台账：年龄、数字评分、成长阶段、原创、赞藏、播放、完播率。",
            "parameters": {
                "type": "object",
                "properties": {
                    "account": {
                        "type": "string",
                        "description": "主播昵称或简称，如「胖嫂子」「祁嫂子」；留空返回全部账号",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_village_score",
            "description": "计算村庄 AHP 适配度 A/F/RVCPM，判定明星区、潜力区、机会区、边缘区。",
            "parameters": {
                "type": "object",
                "properties": {
                    "village": {
                        "type": "string",
                        "description": "村庄名，如「八道河村」「沙门村」；留空返回全部村庄",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_training_stats",
            "description": "查询培训场次、累计签到人次、去重人数与场次明细。",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_growth_path",
            "description": "查询银发主播六阶成长路径与当前整体进度。",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]

TOOL_NAMES = [spec["function"]["name"] for spec in TOOL_SPECS]

REVENUE_RE = re.compile(r"分成|收益|收入|对账|赚|钱")
TRAINING_RE = re.compile(r"培训|签到|场次|课时")
GROWTH_RE = re.compile(r"六阶|成长路径|成长阶段|入门认知|种子讲师")
VILLAGE_CALC_RE = re.compile(r"适配度|AHP|RVCPM|四象限|明星区|潜力区|机会区|边缘区|村庄.{0,6}(评分|打分|排名)", re.I)
VILLAGE_FIT_RE = re.compile(
    r"(我们村|咱村|本村|村里|村委).{0,8}(适合|能不能|可不可以|能做|该不该)"
    r"|适合.{0,6}(直播|电商|助农|带货|做账号)"
)
# 问方法论（怎么评估、看哪些指标）时应走知识库，而不是直接返回示例村评分
VILLAGE_METHOD_RE = re.compile(
    r"如何|怎样|步骤|流程|方法|指标|维度|体系|评估标准|怎么(做|评估|判断|开展|落地|测)"
)
ACCOUNT_HINT_RE = re.compile(r"账号|主播|播放|点赞|收藏|粉丝|关注|原创|完播|数字评分")
REVENUE_LINE_RE = re.compile(r"¥|分成|收入|收益|激励|对账|金额")
LIST_RE = re.compile(r"多少|几|哪些|列表|概况|排名|最好|最差|谁")
FOLLOWUP_RE = re.compile(r"^(那|那么|还有|它|他|她|这个|那个)|呢[？?]?\s*$")


class Agent:
    def __init__(self, assistant: RagAssistant):
        self.assistant = assistant
        self.kb = assistant.kb

    @property
    def tool_specs(self) -> list[dict]:
        return TOOL_SPECS

    @property
    def info(self) -> dict:
        return {
            "tools": TOOL_NAMES,
            "planner": "llm-tool-calling" if _llm_configured() else "rule-fallback",
            "max_steps": MAX_STEPS,
        }

    def answer(self, question: str, top_k: int = 4, history: list[dict] | None = None) -> dict:
        question = (question or "").strip()
        history = history or []
        if not question:
            return self.assistant.answer(question, top_k, history)

        if _llm_configured():
            result = self._answer_with_llm(question, top_k, history)
            if result is not None:
                return result

        return self._answer_with_rules(question, top_k, history)

    def _resolve_followup(self, question: str, history: list[dict]) -> str:
        """「那她呢？」这类追问先并入上一轮问题，便于匹配账号或村庄实体。"""
        if not FOLLOWUP_RE.search(question) or not history:
            return question
        for item in reversed(history):
            if item.get("role") == "user" and item.get("content"):
                previous = str(item["content"]).strip()
                if previous and previous != question:
                    accounts = find_accounts(previous)
                    if len(accounts) == 1:
                        return f"{accounts[0]['nickname']} {question}"
                    villages = find_villages(previous)
                    if len(villages) == 1:
                        return f"{villages[0]['short']} {question}"
                    return f"{previous} {question}"
                break
        return question

    # ── 规划：规则降级路径 ───────────────────────────────

    def _plan(self, question: str) -> list[tuple[str, dict]]:
        accounts = find_accounts(question)
        if accounts:
            account = accounts[0]["nickname"] if len(accounts) == 1 else ""
            plan = [("get_account_profile", {"account": account})]
            if REVENUE_RE.search(question):
                plan.append(("search_knowledge", {"question": f"{question} 创作分成 直播收入 对账"}))
            return plan

        villages = find_villages(question)
        if villages:
            village = villages[0]["short"] if len(villages) == 1 else ""
            return [("get_village_score", {"village": village})]
        if VILLAGE_CALC_RE.search(question) or VILLAGE_FIT_RE.search(question):
            if VILLAGE_METHOD_RE.search(question):
                return []
            return [("get_village_score", {"village": ""})]

        if TRAINING_RE.search(question):
            return [("get_training_stats", {})]
        if GROWTH_RE.search(question):
            return [("get_growth_path", {})]
        if ACCOUNT_HINT_RE.search(question) and LIST_RE.search(question):
            return [("get_account_profile", {"account": ""})]
        return []

    def _answer_with_rules(self, question: str, top_k: int, history: list[dict]) -> dict:
        plan = self._plan(question)
        resolved = question
        if not plan:
            # 当前问题没带实体时，才并入上一轮问题，避免「那祁嫂子呢？」被上一轮的胖嫂子覆盖
            merged = self._resolve_followup(question, history)
            if merged != question:
                merged_plan = self._plan(merged)
                if merged_plan:
                    plan = merged_plan
                    resolved = merged
        if not plan:
            result = self.assistant.answer(resolved, top_k=top_k, history=history)
            result["trace"] = [
                {
                    "tool": "search_knowledge",
                    "args": {"question": resolved},
                    "summary": f"命中 {len(result.get('sources', []))} 个片段",
                }
            ]
            return result

        trace: list[dict] = []
        outputs: list[dict] = []
        for name, args in plan[:2]:
            output = self._execute(name, args, top_k)
            output["tool"] = name
            trace.append({"tool": name, "args": args, "summary": output["summary"]})
            outputs.append(output)

        context = "\n\n".join(output["text"] for output in outputs)
        sources = _dedupe_sources([s for output in outputs for s in output.get("sources", [])])
        guarded = self._revenue_guard(resolved, outputs)
        if guarded:
            return {"answer": guarded, "sources": sources, "mode": "agent-local", "trace": trace}
        answer, mode = self._synthesize(resolved, context, outputs, history)
        return {"answer": answer, "sources": sources, "mode": mode, "trace": trace}

    def _revenue_guard(self, question: str, outputs: list[dict]) -> str | None:
        """问某个账号的收益时，只让这个账号自己的条目进入生成上下文。

        小模型容易把书记号或祁嫂子的分成金额套到别的账号上；这里先按账号
        收窄检索片段，一条都没有时直接返回确定性答案。
        """
        if not REVENUE_RE.search(question):
            return None
        accounts = find_accounts(question)
        if len(accounts) != 1:
            return None
        account = accounts[0]
        names = [account["nickname"]] + [
            alias for alias, nickname in ACCOUNT_ALIASES.items() if nickname == account["nickname"]
        ]
        search_outputs = [
            output for output in outputs if output.get("tool") == "search_knowledge"
        ]
        if not search_outputs:
            return None
        lines: list[str] = []
        for output in search_outputs:
            for match in output.get("matches", []):
                for raw in re.split(r"[\n。；]", match["text"]):
                    line = raw.strip().lstrip("-*・ ")
                    if not line or not any(name in line for name in names):
                        continue
                    if not REVENUE_LINE_RE.search(line):
                        continue
                    lines.append(line.rstrip("。"))
        if not lines:
            return (
                f"台账与知识库中暂无「{account['nickname']}」的独立收益记录。"
                "知识库现有可查的收益样例属于八道河村书记号（创作分成 ¥333.68、直播收入 ¥18.95）"
                "和祁嫂子（香椿季单条分成 ¥3.08），不能直接套到其他账号。"
            )
        profile = next(
            (
                output.get("fallback_answer", "")
                for output in outputs
                if output.get("tool") == "get_account_profile"
            ),
            "",
        )
        body = "根据项目知识库：" + "；".join(dict.fromkeys(lines))
        return f"{profile}\n\n{body}".strip()

    def _synthesize(
        self, question: str, context: str, outputs: list[dict], history: list[dict]
    ) -> tuple[str, str]:
        if _local_model_configured() and any(output.get("synthesize") for output in outputs):
            try:
                from .local_model import LocalLoraModel

                generated = LocalLoraModel.get().generate(question, context)
                if generated:
                    return generated, "agent-lora"
            except Exception:
                pass

        if _llm_configured():
            generated = self._remote_complete(question, context, history)
            if generated:
                return generated, "agent-llm"

        fallback = "\n\n".join(
            output["fallback_answer"] for output in outputs if output.get("fallback_answer")
        )
        return fallback, "agent-local"

    # ── 工具执行 ───────────────────────────────────────

    def _execute(self, name: str, args: dict, top_k: int = 4) -> dict:
        if name == "search_knowledge":
            return self._tool_search(args, top_k)
        if name == "get_account_profile":
            return self._tool_account(args)
        if name == "get_village_score":
            return self._tool_village(args)
        if name == "get_training_stats":
            return self._tool_training()
        if name == "get_growth_path":
            return self._tool_growth()
        text = f"不支持的工具：{name}"
        return {"summary": text, "text": text, "fallback_answer": text, "sources": []}

    def _tool_search(self, args: dict, top_k: int) -> dict:
        question = str(args.get("question") or "").strip()
        try:
            limit = int(args.get("top_k") or top_k)
        except (TypeError, ValueError):
            limit = top_k
        limit = max(1, min(8, limit))

        results = self.kb.search(question, top_k=limit)
        if not results:
            text = "知识库中没有检索到相关内容。"
            return {
                "summary": "检索未命中",
                "text": text,
                "fallback_answer": text,
                "sources": [],
                "matches": [],
                "synthesize": True,
            }

        sources = [chunk.to_source(score) for chunk, score in results]
        matches = [
            {"text": chunk.text, "source": chunk.to_source(score)}
            for chunk, score in results
        ]
        text = _context_text(self.kb.expand_context(results))
        best = results[0][1]
        if best < 0.10:
            answer = (
                "知识库中没有检索到足够相关的内容。可以换一种问法，或试试："
                "账号表现、六阶成长、创作分成、香椿季选题、AHP 适配度、隐私保护。"
            )
            return {
                "summary": f"检索命中但最高分仅 {best:.3f}",
                "text": text,
                "fallback_answer": answer,
                "sources": [],
                "matches": [],
                "synthesize": True,
            }

        sentences = self.kb.sentence_pick(question, results)
        body = "".join(sentences) if sentences else results[0][0].text[:300]
        return {
            "summary": f"检索命中 {len(results)} 个片段，最高分 {best:.3f}",
            "text": text,
            "fallback_answer": f"根据项目知识库：{body}",
            "sources": sources,
            "matches": matches,
            "synthesize": True,
        }

    def _tool_account(self, args: dict) -> dict:
        account = str(args.get("account") or "").strip()
        matches = find_accounts(account) if account else list(ACCOUNTS)
        if not matches:
            text = f"台账中没有找到「{account}」。当前重点跟踪 {len(ACCOUNTS)} 个账号，可以问具体昵称。"
            return {"summary": "未找到账号", "text": text, "fallback_answer": text, "sources": []}

        if account and len(matches) == 1:
            text = format_account(matches[0])
            summary = f"查询账号「{matches[0]['nickname']}」"
        else:
            text = f"当前重点跟踪 {len(ACCOUNTS)} 个账号：\n" + "\n".join(
                f"- {format_account(item)}" for item in matches
            )
            summary = f"查询账号列表（{len(matches)} 个）"
        return {"summary": summary, "text": text, "fallback_answer": text, "sources": []}

    def _tool_village(self, args: dict) -> dict:
        village = str(args.get("village") or "").strip()
        matches = find_villages(village) if village else list(VILLAGES)
        if not matches:
            text = f"没有找到村庄「{village}」。当前示例村庄：{'、'.join(v['short'] for v in VILLAGES)}。"
            return {"summary": "未找到村庄", "text": text, "fallback_answer": text, "sources": []}

        header = (
            "AHP 口径：A=0.35·C4′+0.35·C5′+0.30·C6′；"
            "F=0.25·C7′+0.25·C8′+0.15·C9′+0.20·C10′+0.15·C11′；"
            "RVCPM=√(A²+F²)，A/F 以 0.5 为四象限阈值。"
        )
        text = header + "\n" + "\n".join(format_village(item) for item in matches)
        return {
            "summary": f"计算适配度（{len(matches)} 个村庄）",
            "text": text,
            "fallback_answer": text,
            "sources": [],
        }

    def _tool_training(self) -> dict:
        stats = training_stats()
        text = (
            f"培训统计：共 {stats.get('培训场次数', '—')} 场，"
            f"累计签到 {stats.get('累计培训人次（签到合计）', '—')} 人次，"
            f"去重人数 {stats.get('签到涉及人数（去重）', '—')} 人。"
        )
        details = stats.get("场次明细") or []
        if details:
            lines = [
                f"{item.get('日期', '')} {item.get('形式', '')} {item.get('签到人数（本场）', '')} 人"
                for item in details[:8]
            ]
            text += "\n场次明细：" + "；".join(lines)
        return {"summary": "查询培训统计", "text": text, "fallback_answer": text, "sources": []}

    def _tool_growth(self) -> dict:
        text = (
            "银发主播六阶成长路径：" + " → ".join(GROWTH_STAGES) + "。"
            "当前台账均值处于第 2—3 阶之间，整体进度约 68%。"
        )
        return {"summary": "查询六阶成长路径", "text": text, "fallback_answer": text, "sources": []}

    # ── 远程 LLM function calling ───────────────────────

    def _answer_with_llm(self, question: str, top_k: int, history: list[dict]) -> dict | None:
        messages = (
            [{"role": "system", "content": AGENT_SYSTEM}]
            + _trim_history(history)
            + [{"role": "user", "content": question}]
        )
        trace: list[dict] = []
        sources: list[dict] = []

        for _ in range(MAX_STEPS):
            message = self._chat_with_tools(messages)
            if message is None:
                return None

            tool_calls = message.get("tool_calls") or []
            if not tool_calls:
                content = str(message.get("content") or "").strip()
                if not content:
                    return None
                return {
                    "answer": content,
                    "sources": _dedupe_sources(sources),
                    "mode": "agent-llm",
                    "trace": trace,
                }

            messages.append(
                {
                    "role": "assistant",
                    "content": message.get("content") or "",
                    "tool_calls": tool_calls,
                }
            )
            for call in tool_calls:
                function = call.get("function") or {}
                name = str(function.get("name") or "")
                try:
                    args = json.loads(function.get("arguments") or "{}")
                except json.JSONDecodeError:
                    args = {}
                if not isinstance(args, dict):
                    args = {}
                output = self._execute(name, args, top_k)
                trace.append({"tool": name, "args": args, "summary": output["summary"]})
                sources.extend(output.get("sources", []))
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.get("id", ""),
                        "name": name,
                        "content": output["text"],
                    }
                )
        return None

    def _chat_with_tools(self, messages: list[dict]) -> dict | None:
        payload = {
            "model": os.environ["LLM_MODEL"],
            "temperature": 0.2,
            "max_tokens": 700,
            "messages": messages,
            "tools": TOOL_SPECS,
            "tool_choice": "auto",
        }
        data = _post_chat(payload)
        if not data:
            return None
        try:
            return data["choices"][0]["message"]
        except (KeyError, IndexError, TypeError):
            return None

    def _remote_complete(self, question: str, context: str, history: list[dict]) -> str | None:
        messages = (
            [{"role": "system", "content": AGENT_SYSTEM}]
            + _trim_history(history)
            + [{"role": "user", "content": f"工具结果：\n{context}\n\n用户问题：{question}"}]
        )
        data = _post_chat(
            {
                "model": os.environ["LLM_MODEL"],
                "temperature": 0.2,
                "max_tokens": 700,
                "messages": messages,
            }
        )
        if not data:
            return None
        try:
            content = str(data["choices"][0]["message"]["content"]).strip()
        except (KeyError, IndexError, TypeError):
            return None
        return content or None


def _post_chat(payload: dict) -> dict | None:
    if not _llm_configured():
        return None
    base_url = os.environ["LLM_BASE_URL"].rstrip("/")
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
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None


def _trim_history(history: list[dict]) -> list[dict]:
    trimmed = []
    for item in history[-6:]:
        role = item.get("role")
        content = str(item.get("content", ""))[:1200]
        if role in {"user", "assistant"} and content:
            trimmed.append({"role": role, "content": content})
    return trimmed


def _dedupe_sources(sources: list[dict]) -> list[dict]:
    seen: set[tuple] = set()
    unique: list[dict] = []
    for source in sources:
        key = (source.get("doc"), source.get("heading"), source.get("snippet"))
        if key in seen:
            continue
        seen.add(key)
        unique.append(source)
    return unique


def _llm_configured() -> bool:
    return all(os.environ.get(key) for key in ("LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"))


def _local_model_configured() -> bool:
    return bool(os.environ.get("LOCAL_MODEL_PATH"))

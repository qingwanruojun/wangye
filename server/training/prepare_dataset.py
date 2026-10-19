"""把知识库 + 种子问答转换成 LoRA SFT 数据（chat messages 格式）。

用法（在项目根目录）：
    python3 server/training/prepare_dataset.py
生成：
    server/training/data/train.jsonl
    server/training/data/valid.jsonl
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

TRAINING_DIR = Path(__file__).resolve().parent
ROOT_DIR = TRAINING_DIR.parent.parent
KB_DIR = TRAINING_DIR.parent / "knowledge_base"
SEED_FILE = TRAINING_DIR / "qa_seed.jsonl"
OUT_DIR = TRAINING_DIR / "data"

sys.path.insert(0, str(ROOT_DIR))

from server.rag import KnowledgeBase  # noqa: E402

SYSTEM_PROMPT = (
    "你是「银发乡播·AI 适老化大数据服务看板」的问答助手。"
    "只依据提供的项目资料回答，不编造台账中没有的数字；资料不足时明确说明。"
    "回答使用简体中文，语气亲切、简洁，适合村委与银发主播阅读。"
)


def load_seed() -> list[dict]:
    rows = []
    with SEED_FILE.open(encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def build_context(kb: KnowledgeBase, question: str, top_k: int = 3) -> str:
    results = kb.search(question, top_k=top_k)
    parts = [f"【{chunk.doc_title} · {chunk.heading}】\n{chunk.text}" for chunk, _ in results]
    return "\n\n".join(parts)


def main() -> None:
    kb = KnowledgeBase(KB_DIR)
    seed = load_seed()
    samples: list[dict] = []

    for row in seed:
        question = row["instruction"]
        answer = row["output"]
        context = build_context(kb, question)

        if context:
            user_content = f"参考资料：\n{context}\n\n问题：{question}"
        else:
            user_content = question
        samples.append(
            {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                    {"role": "assistant", "content": answer},
                ]
            }
        )
        # 无资料的直答样本，保留模型的项目口径与语气
        samples.append(
            {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": question},
                    {"role": "assistant", "content": answer},
                ]
            }
        )

    random.seed(42)
    random.shuffle(samples)
    split = max(1, int(len(samples) * 0.1))
    valid, train = samples[:split], samples[split:]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, rows in (("train.jsonl", train), ("valid.jsonl", valid)):
        with (OUT_DIR / name).open("w", encoding="utf-8") as handle:
            for row in rows:
                handle.write(json.dumps(row, ensure_ascii=False) + "\n")
        print(f"{name}: {len(rows)} 条")

    print(f"知识库：{len(kb.documents)} 篇文档 / {len(kb.chunks)} 个分块")


if __name__ == "__main__":
    main()

"""把知识库编译成浏览器可用的静态索引（js/rag-index.js）。

用法（在项目根目录）：
    python3 scripts/build_rag_index.py

修改 server/knowledge_base/ 下的 Markdown 后重新执行即可；
生成的索引与后端共享 server/rag.py 的分块和 TF-IDF 权重。
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from server.rag import KnowledgeBase  # noqa: E402

KB_DIR = ROOT_DIR / "server" / "knowledge_base"
OUT_FILE = ROOT_DIR / "js" / "rag-index.js"


def build_payload(kb: KnowledgeBase) -> dict:
    return {
        "generated": date.today().isoformat(),
        "documents": kb.documents,
        "idf": kb._idf,
        "chunks": [
            {
                "doc": chunk.doc_id,
                "title": chunk.doc_title,
                "heading": chunk.heading,
                "text": chunk.text,
                "tokens": dict(chunk.tokens),
                "weight": chunk.weight,
            }
            for chunk in kb.chunks
        ],
    }


def main() -> None:
    kb = KnowledgeBase(KB_DIR)
    if not kb.chunks:
        raise SystemExit(f"知识库为空：{KB_DIR}")

    payload = build_payload(kb)
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    OUT_FILE.write_text(
        "/* 由 scripts/build_rag_index.py 生成，请勿手动修改。 */\n"
        f"window.__RAG_INDEX__ = {body};\n",
        encoding="utf-8",
    )
    size_kb = OUT_FILE.stat().st_size / 1024
    print(
        f"已生成 {OUT_FILE.relative_to(ROOT_DIR)}："
        f"{len(kb.documents)} 篇文档 / {len(kb.chunks)} 个分块 / {size_kb:.1f} KB"
    )


if __name__ == "__main__":
    main()

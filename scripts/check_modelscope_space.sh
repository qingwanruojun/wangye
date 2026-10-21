#!/usr/bin/env bash
# 检查已部署的 ModelScope 创空间：健康接口 + 问答接口。
# 用法：bash scripts/check_modelscope_space.sh [应用地址]
set -euo pipefail

BASE="${1:-${MODELSCOPE_APP_URL:-https://qingwanruojun-wangye-agent.ms.show}}"
BASE="${BASE%/}"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
QUESTION="${CHECK_QUESTION:-乡村主播怎么提升直播人气？}"

echo "应用地址：$BASE"

health="$(curl -sS -m 60 -A "$UA" "$BASE/api/health")"
python3 - "$health" <<'PY'
import json, sys
try:
    data = json.loads(sys.argv[1])
except json.JSONDecodeError:
    raise SystemExit("健康检查返回非 JSON：" + sys.argv[1][:200])
if data.get("status") != "ok":
    raise SystemExit("健康检查失败：" + json.dumps(data, ensure_ascii=False)[:300])
kb = data.get("kb", {})
agent = data.get("agent", {})
print(f"健康检查：ok · 知识库 {kb.get('documents')} 篇 / {kb.get('chunks')} 片段 · 工具 {len(agent.get('tools', []))} 个")
PY

answer="$(curl -sS -m 90 -A "$UA" -H "Content-Type: application/json" \
  -X POST -d "{\"question\": \"$QUESTION\", \"top_k\": 4}" "$BASE/api/chat")"
python3 - "$answer" <<'PY'
import json, sys
try:
    data = json.loads(sys.argv[1])
except json.JSONDecodeError:
    raise SystemExit("问答接口返回非 JSON：" + sys.argv[1][:200])
if "answer" not in data:
    raise SystemExit("问答接口失败：" + json.dumps(data, ensure_ascii=False)[:300])
tools = " → ".join(item.get("tool", "") for item in data.get("trace", []))
print(f"问答接口：{data.get('mode')} · {data.get('latency_ms')} ms · 工具 {tools or '无'}")
print("回答：" + data["answer"][:120].replace("\n", " "))
PY

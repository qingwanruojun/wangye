#!/usr/bin/env bash
# 生成可推送到 ModelScope Gradio 创空间的目录（FastAPI 由 app.py 启动）。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/deploy/modelscope-gradio"
OUT="$SRC/build"

rm -rf "$OUT"
mkdir -p "$OUT/data"

rsync -a \
  --exclude '__pycache__/' \
  --exclude 'training/' \
  --exclude 'data/feedback.jsonl' \
  "$ROOT/server/" "$OUT/server/"

cp "$ROOT/data/village_derived_stats.json" "$OUT/data/"
cp -R "$ROOT/css" "$ROOT/js" "$OUT/"
cp "$ROOT/index.html" "$ROOT/bigscreen.html" "$OUT/"
cp "$SRC/app.py" "$SRC/requirements.txt" "$SRC/README.md" "$OUT/"

# 创空间页面与接口同源，构建时清空远程后端地址，避免多一跳探测
python3 - "$OUT/index.html" <<'PY'
import re, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as handle:
    html = handle.read()
html = re.sub(r'window\.ASSISTANT_API_BASE = "[^"]*";', 'window.ASSISTANT_API_BASE = "";', html)
with open(path, "w", encoding="utf-8") as handle:
    handle.write(html)
PY

find "$OUT" -type d -name __pycache__ -prune -exec rm -rf {} +

echo "已生成：$OUT"
du -sh "$OUT"

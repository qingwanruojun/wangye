#!/usr/bin/env bash
# 生成可直接推送到 Hugging Face Space 的独立目录。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/deploy/hf-space"
OUT="$SRC/build"
ADAPTER="$ROOT/server/training/output/lora-adapter"

if [[ ! -f "$ADAPTER/adapter_model.safetensors" ]]; then
  echo "缺少 LoRA 适配器：$ADAPTER" >&2
  echo "请先运行 server/training/train_lora.py 训练，或把适配器放到该目录。" >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT/data" "$OUT/server/training/output/lora-adapter"

rsync -a \
  --exclude '__pycache__/' \
  --exclude 'training/output/' \
  --exclude 'training/data/' \
  --exclude 'data/feedback.jsonl' \
  "$ROOT/server/" "$OUT/server/"

cp "$ADAPTER/adapter_config.json" "$ADAPTER/adapter_model.safetensors" \
  "$OUT/server/training/output/lora-adapter/"
cp "$ROOT/data/village_derived_stats.json" "$OUT/data/"
cp -R "$ROOT/css" "$ROOT/js" "$OUT/"
cp "$ROOT/index.html" "$ROOT/bigscreen.html" "$OUT/"
cp "$SRC/Dockerfile" "$SRC/requirements.txt" "$SRC/README.md" "$OUT/"

find "$OUT" -type d -name __pycache__ -prune -exec rm -rf {} +

echo "已生成：$OUT"
du -sh "$OUT"

#!/usr/bin/env bash
# 一键重新部署 ModelScope Gradio 创空间：同步构建目录并推送到创空间仓库。
# 用法：
#   bash scripts/deploy_modelscope_gradio_space.sh
# 可通过 MODELSCOPE_USER / MODELSCOPE_SPACE 覆盖默认空间，
# 令牌从 .modelscope_token 读取（或通过 MODELSCOPE_TOKEN 传入）。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export MODELSCOPE_USER="${MODELSCOPE_USER:-qingwanruojun}"
export MODELSCOPE_SPACE="${MODELSCOPE_SPACE:-wangye-agent}"
export SPACE_BUILD="$ROOT/deploy/modelscope-gradio/build"
export SPACE_REPO="$ROOT/deploy/modelscope-gradio/repo"
export SPACE_SYNC="$ROOT/scripts/sync_modelscope_gradio_space.sh"

bash "$ROOT/scripts/deploy_modelscope_space.sh"

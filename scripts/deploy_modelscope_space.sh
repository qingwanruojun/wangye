#!/usr/bin/env bash
# 把构建目录推送到 ModelScope 创空间（Docker 类型）。
# 用法：
#   MODELSCOPE_USER=用户名 MODELSCOPE_SPACE=创空间名 bash scripts/deploy_modelscope_space.sh
# 访问令牌从项目根目录 .modelscope_token 读取（或通过 MODELSCOPE_TOKEN 传入）。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="${SPACE_BUILD:-$ROOT/deploy/modelscope/build}"
REPO="${SPACE_REPO:-$ROOT/deploy/modelscope/repo}"
SYNC="${SPACE_SYNC:-$ROOT/scripts/sync_modelscope_space.sh}"

if [[ -z "${MODELSCOPE_TOKEN:-}" ]]; then
  for f in "$ROOT/.modelscope_token" "$HOME/.modelscope_token"; do
    if [[ -s "$f" ]]; then
      MODELSCOPE_TOKEN="$(tr -d '[:space:]' < "$f")"
      break
    fi
  done
fi

: "${MODELSCOPE_USER:?请设置 MODELSCOPE_USER（魔搭用户名）}"
: "${MODELSCOPE_TOKEN:?请设置 MODELSCOPE_TOKEN，或写入 .modelscope_token（见 https://modelscope.cn/my/myaccesstoken）}"
: "${MODELSCOPE_SPACE:?请设置 MODELSCOPE_SPACE（创空间名称）}"

bash "$SYNC"

# SDK 访问令牌不能直接用于 Git，需要先换取 Git 令牌
GIT_TOKEN="$(MODELSCOPE_TOKEN="$MODELSCOPE_TOKEN" python3 - <<'PY'
import json, os, urllib.request
req = urllib.request.Request(
    "https://www.modelscope.cn/api/v1/login",
    data=json.dumps({"AccessToken": os.environ["MODELSCOPE_TOKEN"]}).encode(),
    headers={"Content-Type": "application/json"},
)
d = json.load(urllib.request.urlopen(req, timeout=30))
if not d.get("Success"):
    raise SystemExit("登录失败：" + str(d))
print(d["Data"]["AccessToken"])
PY
)"

REMOTE="https://www.modelscope.cn/studios/${MODELSCOPE_USER}/${MODELSCOPE_SPACE}.git"
export GIT_TOKEN
CRED='!f() { echo username=$MODELSCOPE_USER; echo password=$GIT_TOKEN; }; f'

rm -rf "$REPO"
git -c credential.helper="$CRED" clone -q "$REMOTE" "$REPO"

rsync -a --delete --exclude '.git' "$BUILD/" "$REPO/"
cd "$REPO"
git config user.name "$MODELSCOPE_USER"
git config user.email "${MODELSCOPE_EMAIL:-$MODELSCOPE_USER@users.noreply.modelscope.cn}"
git add -A
if git diff --cached --quiet; then
  echo "没有需要推送的改动。"
else
  git commit -q -m "deploy: 银发乡播 AI 问答后端"
  MODELSCOPE_USER="$MODELSCOPE_USER" git -c credential.helper="$CRED" push -q origin HEAD
  echo "已推送到 ${MODELSCOPE_USER}/${MODELSCOPE_SPACE}"
fi

echo "创空间：https://modelscope.cn/studios/${MODELSCOPE_USER}/${MODELSCOPE_SPACE}"

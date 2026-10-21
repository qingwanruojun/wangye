# 银发乡播 · ModelScope 创空间（Docker）

FastAPI 后端 + 本地 LoRA 模型 + RAG 检索，供主看板 AI 助手调用。

- 依赖与前端页面同源，静态站点仍可由 GitHub Pages 托管
- 基座模型在构建期从 ModelScope 下载：`Qwen/Qwen2.5-0.5B-Instruct`
- LoRA 适配器随仓库带入：`server/training/output/lora-adapter`

## 部署

1. 在 <https://modelscope.cn> 创建创空间，类型选 **Docker**
2. 复制创空间 Git 地址
3. 本地生成构建目录并推送：

```bash
bash scripts/sync_modelscope_space.sh
cd deploy/modelscope/build
git init
git remote add origin https://oauth2:<你的访问令牌>@www.modelscope.cn/studios/<用户名>/<创空间名>.git
git add .
git commit -m "deploy: wangye agent backend"
git push -f origin main
```

4. 构建完成后访问 `https://modelscope.cn/studios/<用户名>/<创空间名>/files`，
   接口地址为 `https://<用户名>-<创空间名>.modelscope.space`（以创空间页面显示为准）

## 接口

- `GET /api/health`：健康检查，返回知识库规模与 agent 模式
- `GET /api/tools`：可用工具列表
- `GET /api/kb`：知识库文档与片段
- `POST /api/chat`：问答，支持工具调用与来源返回

## 环境变量（可选）

- `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`：接入 OpenAI 兼容大模型
- `LOCAL_MODEL_PATH` / `LORA_ADAPTER_PATH`：本地模型与适配器路径
- `PORT`：服务端口，默认 `7860`

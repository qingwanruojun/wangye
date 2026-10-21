---
title: Wangye Silver-hair AI Assistant
emoji: 🌾
colorFrom: green
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# 银发乡播 · AI 适老化大数据服务看板

FastAPI 后端 + TF-IDF RAG + Qwen2.5-0.5B LoRA + 对话式 Agent。

- 看板页面：`/`
- 健康检查：`/api/health`
- 工具清单：`/api/tools`
- 对话接口：`POST /api/chat`

本 Space 由 `scripts/sync_hf_space.sh` 从主仓库生成，请勿直接手改 `server/`。

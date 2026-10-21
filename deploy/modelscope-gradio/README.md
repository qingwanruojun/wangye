# 银发乡播 · AI 问答后端

FastAPI + 工具调用 Agent + TF-IDF RAG，供主看板 AI 助手调用。

## 接口

- `GET /api/health`：健康检查
- `GET /api/tools`：可用工具列表
- `GET /api/kb`：知识库文档与片段
- `POST /api/chat`：问答，支持工具调用与来源返回

## 说明

本创空间使用 Gradio 运行时启动 `app.py`，由 FastAPI 监听平台要求的 `0.0.0.0:7860`。
页面与静态资源同源提供，浏览器直接访问创空间地址即可。

## 部署与自检

- 创空间：<https://modelscope.cn/studios/qingwanruojun/wangye-agent>
- 应用地址：<https://qingwanruojun-wangye-agent.ms.show>
- 一键重新部署：`bash scripts/deploy_modelscope_gradio_space.sh`
- 线上自检：`bash scripts/check_modelscope_space.sh`

注意：魔搭网关会拦截 curl 默认 User-Agent，命令行自检需带浏览器 UA（脚本已处理）。

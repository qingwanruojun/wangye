FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MODELSCOPE_CACHE=/app/.cache/modelscope \
    LOCAL_MODEL_PATH=/app/models/Qwen2.5-0.5B-Instruct \
    LORA_ADAPTER_PATH=/app/server/training/output/lora-adapter

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple \
    && pip install --no-cache-dir modelscope \
    && pip install --no-cache-dir torch==2.6.0+cpu \
       -f https://mirrors.aliyun.com/pytorch-wheels/cpu/ \
    && pip install --no-cache-dir -r requirements.txt

# 从 ModelScope 预下载基座模型，避免启动后第一次对话再等下载
RUN python - <<'PY'
from modelscope import snapshot_download

snapshot_download("Qwen/Qwen2.5-0.5B-Instruct", local_dir="/app/models/Qwen2.5-0.5B-Instruct")
PY

COPY server ./server
COPY data ./data
COPY index.html bigscreen.html ./
COPY css ./css
COPY js ./js

EXPOSE 7860
CMD ["sh", "-c", "python -m uvicorn server.app:app --host 0.0.0.0 --port ${PORT:-7860}"]

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.cache/huggingface \
    LOCAL_MODEL_PATH=Qwen/Qwen2.5-0.5B-Instruct \
    LORA_ADAPTER_PATH=/app/server/training/output/lora-adapter

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# 构建期预下载基座模型，避免 Space 启动后第一次对话再等下载
RUN python - <<'PY'
from huggingface_hub import snapshot_download

snapshot_download("Qwen/Qwen2.5-0.5B-Instruct")
PY

COPY server ./server
COPY data ./data
COPY index.html bigscreen.html ./
COPY css ./css
COPY js ./js

EXPOSE 7860
CMD ["python", "-m", "uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "7860"]

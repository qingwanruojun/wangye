"""ModelScope 创空间入口：在 Gradio 运行时里启动 FastAPI 服务。

平台要求对外监听 0.0.0.0:7860；接口与页面均由 server.app 提供。
"""

import os

import uvicorn

from server.app import app

if __name__ == "__main__":
    port = int(
        os.environ.get("PORT")
        or os.environ.get("GRADIO_SERVER_PORT")
        or 7860
    )
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

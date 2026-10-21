"""可选：加载 LoRA 微调后的本地模型做 RAG 生成。

仅当设置 LOCAL_MODEL_PATH 时启用；需要 transformers / peft / torch。
未安装依赖时自动跳过，接口会回退到抽取式回答或远程 LLM。
"""

from __future__ import annotations

import os
import re
import threading
from pathlib import Path

DEFAULT_ADAPTER_DIR = Path(__file__).resolve().parent / "training" / "output" / "lora-adapter"

CALC_HINT_RE = re.compile(r"怎么算|如何计算|怎么计算|计算公式|公式|多少|比例|占比|权重")
CALC_HINT = "\n\n涉及计算时请原样引用片段中的公式，不要自行解释或编造。"


def resolve_adapter_path() -> str | None:
    """优先读环境变量，否则使用训练脚本的默认输出目录。"""
    explicit = os.environ.get("LORA_ADAPTER_PATH")
    if explicit:
        return explicit
    return str(DEFAULT_ADAPTER_DIR) if DEFAULT_ADAPTER_DIR.exists() else None


class LocalLoraModel:
    _instance: "LocalLoraModel | None" = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self.model_path = os.environ.get("LOCAL_MODEL_PATH", "")
        self.adapter_path = resolve_adapter_path() or ""
        self._loaded = False
        self._model = None
        self._tokenizer = None

    @classmethod
    def get(cls) -> "LocalLoraModel":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _load(self) -> bool:
        if self._loaded:
            return self._model is not None
        self._loaded = True
        try:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer

            # 优先只读本地缓存，避免离线时每个请求都卡在 HF Hub 重试上
            try:
                tokenizer = AutoTokenizer.from_pretrained(
                    self.model_path, trust_remote_code=True, local_files_only=True
                )
            except Exception:
                tokenizer = AutoTokenizer.from_pretrained(self.model_path, trust_remote_code=True)
            try:
                model = AutoModelForCausalLM.from_pretrained(
                    self.model_path,
                    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                    device_map="auto",
                    trust_remote_code=True,
                    local_files_only=True,
                )
            except Exception:
                model = AutoModelForCausalLM.from_pretrained(
                    self.model_path,
                    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                    device_map="auto",
                    trust_remote_code=True,
                )
            if self.adapter_path and os.path.isdir(self.adapter_path):
                from peft import PeftModel

                model = PeftModel.from_pretrained(model, self.adapter_path)
            model.eval()
            self._tokenizer = tokenizer
            self._model = model
            return True
        except Exception:
            self._model = None
            self._tokenizer = None
            return False

    def generate(self, question: str, context: str) -> str | None:
        if not self._load() or self._model is None or self._tokenizer is None:
            return None
        messages = [
            {
                "role": "system",
                "content": (
                    "你是银发乡播看板的问答助手。只依据知识库片段回答，不要编造片段中没有的"
                    "数字、公式或结论；片段中有公式、金额、比例时须原样引用；"
                    "资料不足时明确说明。使用简体中文，简洁亲切。"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"知识库片段：\n{context}\n\n用户问题：{question}"
                    + (CALC_HINT if CALC_HINT_RE.search(question) else "")
                ),
            },
        ]
        try:
            text = self._tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            inputs = self._tokenizer(text, return_tensors="pt").to(self._model.device)
            output = self._model.generate(
                **inputs,
                max_new_tokens=512,
                temperature=0.3,
                do_sample=True,
                top_p=0.9,
                repetition_penalty=1.05,
            )
            generated = output[0][inputs["input_ids"].shape[-1] :]
            return self._tokenizer.decode(generated, skip_special_tokens=True).strip() or None
        except Exception:
            return None

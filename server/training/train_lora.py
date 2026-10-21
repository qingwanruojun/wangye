"""LoRA 微调脚本（transformers + peft）。

示例（CPU 冒烟测试，几秒即可跑完）：
    python3 server/training/train_lora.py \
        --model Qwen/Qwen2.5-0.5B-Instruct \
        --epochs 1 --batch-size 1 --max-length 512

训练完成后适配器保存在 server/training/output/lora-adapter，
后端设置 LOCAL_MODEL_PATH / LORA_ADAPTER_PATH 即可加载。

依赖：
    pip install -r server/requirements-training.txt
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)

TRAINING_DIR = Path(__file__).resolve().parent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="银发乡播 LoRA 微调")
    parser.add_argument("--model", default="Qwen/Qwen2.5-0.5B-Instruct")
    parser.add_argument("--data-dir", default=str(TRAINING_DIR / "data"))
    parser.add_argument("--output-dir", default=str(TRAINING_DIR / "output" / "lora-adapter"))
    parser.add_argument("--epochs", type=float, default=2)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--grad-accum", type=int, default=8)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--max-length", type=int, default=1024)
    parser.add_argument("--lora-r", type=int, default=8)
    parser.add_argument("--lora-alpha", type=int, default=16)
    parser.add_argument("--lora-dropout", type=float, default=0.05)
    parser.add_argument("--device", choices=["auto", "cpu", "cuda", "npu"], default="auto")
    return parser.parse_args()


def load_tokenizer(path: str):
    tokenizer = AutoTokenizer.from_pretrained(path, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    return tokenizer


def main() -> None:
    args = parse_args()

    if args.device == "npu":
        import torch_npu  # noqa: F401

        torch.npu.set_device(0)
        print("使用 Ascend NPU 训练")

    tokenizer = load_tokenizer(args.model)
    raw = load_dataset(
        "json",
        data_files={
            "train": str(Path(args.data_dir) / "train.jsonl"),
            "validation": str(Path(args.data_dir) / "valid.jsonl"),
        },
    )

    def format_and_tokenize(batch: dict) -> dict:
        input_ids, labels = [], []
        for messages in batch["messages"]:
            prompt_ids = tokenizer.apply_chat_template(
                messages[:-1], tokenize=True, add_generation_prompt=True
            )
            full_ids = tokenizer.apply_chat_template(
                messages, tokenize=True, add_generation_prompt=False
            )[: args.max_length]
            # 只对 assistant 回答计算 loss，system / user 部分屏蔽为 -100
            limit = min(len(prompt_ids), len(full_ids))
            prefix = limit if prompt_ids[:limit] == full_ids[:limit] else 0
            labels.append([-100] * prefix + full_ids[prefix:])
            input_ids.append(full_ids)
        return {
            "input_ids": input_ids,
            "attention_mask": [[1] * len(ids) for ids in input_ids],
            "labels": labels,
        }

    tokenized = raw.map(format_and_tokenize, batched=True, remove_columns=raw["train"].column_names)
    print(f"训练样本 {len(tokenized['train'])} 条 · 验证 {len(tokenized['validation'])} 条")

    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        torch_dtype=torch.float16 if (args.device != "cpu" and torch.cuda.is_available()) else torch.float32,
        trust_remote_code=True,
    )
    model.config.use_cache = False

    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    output_dir = Path(args.output_dir)
    training_args = TrainingArguments(
        output_dir=str(output_dir / "checkpoints"),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        warmup_ratio=0.05,
        logging_steps=5,
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=2,
        fp16=False,
        report_to=[],
        use_cpu=args.device == "cpu",
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["validation"],
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
    )
    trainer.train()
    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))
    print(f"LoRA 适配器已保存：{output_dir}")


if __name__ == "__main__":
    main()

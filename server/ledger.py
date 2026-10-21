"""Agent 可调用的结构化台账数据。

数据与前端 js/main.js 的 TALENT_PROFILES / VILLAGE_AHP_DEMO 保持一致；
培训统计从 data/village_derived_stats.json 读取，缺失时使用内置兜底值。
"""

from __future__ import annotations

import json
import math
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
TRAINING_FILE = ROOT_DIR / "data" / "village_derived_stats.json"

GROWTH_STAGES = ["入门认知", "拍摄剪辑", "直播基础", "AIGC 应用", "IP 打造", "种子讲师"]

ACCOUNTS = [
    {
        "nickname": "延龙寻路",
        "code": "YQ-XHY-01",
        "age": 42,
        "digital_score": 54,
        "stage": "六阶 · ②—③ 需结构优化",
        "prefs": ["驻村记录", "政策宣传"],
        "original": 12,
        "following": 317,
        "likes": 1934,
        "favorites": 1241,
        "sample_plays": ["140", "883"],
        "completion": None,
        "note": "第一书记驻村记录，宜做强开篇钩子陪练。",
    },
    {
        "nickname": "沙门村的胖嫂子",
        "code": "YQ-SM-01",
        "age": 55,
        "digital_score": 82,
        "stage": "六阶 · ③ 直播基础（场观待提升）",
        "prefs": ["农事节点选题", "大山鲜货"],
        "original": 11,
        "following": 386,
        "likes": 4173,
        "favorites": 3147,
        "sample_plays": ["8803", "7549"],
        "completion": "38% / 16%",
        "note": "六阶节奏与直播场观仍待拉升。",
    },
    {
        "nickname": "沙门村的祁嫂子",
        "code": "YQ-SM-03",
        "age": 63,
        "digital_score": 76,
        "stage": "六阶 · ③ 变现已起步",
        "prefs": ["山村生活记录", "优质原创"],
        "original": 43,
        "following": 813,
        "likes": 9160,
        "favorites": 6555,
        "sample_plays": ["4105", "1605"],
        "completion": "19% / 10%",
        "note": "历史摘录中含香椿带货优质激励条目，单条分成样例 ¥3.08。",
    },
    {
        "nickname": "沙门郭大嫂",
        "code": "YQ-SM-02",
        "age": 58,
        "digital_score": 80,
        "stage": "六阶 · ③—④ 高活跃更新",
        "prefs": ["第一人称口播", "家人们"],
        "original": 74,
        "following": 1268,
        "likes": 9624,
        "favorites": 8115,
        "sample_plays": ["10998", "8828"],
        "completion": "35% / 40%",
        "note": "场次直播曾获赞 1000+（历史摘录）。",
    },
    {
        "nickname": "大山里的春娥姐",
        "code": "YQ-SM-04",
        "age": 56,
        "digital_score": 90,
        "stage": "六阶 · ⑤ IP 话题矩阵",
        "prefs": ["话题标签运营", "乡村自豪叙事"],
        "original": 30,
        "following": 658,
        "likes": 6351,
        "favorites": 5799,
        "sample_plays": ["62637", "56110"],
        "completion": "38% / 38%",
        "note": "峰值播放 82,637（另有样本 62,637）；话题/IP 向选题见长。",
    },
    {
        "nickname": "Villily",
        "code": "YQ-QT-01",
        "age": 48,
        "digital_score": 36,
        "stage": "六阶 · ①—② 启蒙阶段",
        "prefs": ["新手入门", "短视频尝试"],
        "original": 2,
        "following": 12,
        "likes": 35,
        "favorites": 14,
        "sample_plays": ["64", "178"],
        "completion": "55% / 1%",
        "note": "刚起步，需持续陪跑激励。",
    },
    {
        "nickname": "下花园村小馆",
        "code": "YQ-XHY-02",
        "age": 52,
        "digital_score": 68,
        "stage": "六阶 · ③ 内容稳定产出",
        "prefs": ["乡村美食", "本地生活"],
        "original": 46,
        "following": None,
        "likes": 3134,
        "favorites": 2087,
        "sample_plays": [],
        "completion": None,
        "note": "账号以乡村美食探店为主线，内容更新频率稳定。",
    },
    {
        "nickname": "上风上水上郝庄7724",
        "code": "YQ-QT-02",
        "age": 60,
        "digital_score": 40,
        "stage": "六阶 · ② 拍摄入门",
        "prefs": ["乡村风景", "日常记录"],
        "original": None,
        "following": None,
        "likes": 268,
        "favorites": 204,
        "sample_plays": [],
        "completion": None,
        "note": "原创数未填报，建议系统培训拍摄剪辑。",
    },
    {
        "nickname": "井家螺娘钩织手作",
        "code": "YQ-QT-03",
        "age": 54,
        "digital_score": 62,
        "stage": "六阶 · ③ 特色内容定位",
        "prefs": ["手工钩织", "非遗传承"],
        "original": None,
        "following": None,
        "likes": 1063,
        "favorites": 790,
        "sample_plays": [],
        "completion": None,
        "note": "钩织手作内容差异化明显，可往直播带货方向培养。",
    },
    {
        "nickname": "隐世一小童",
        "code": "YQ-QT-04",
        "age": 50,
        "digital_score": 32,
        "stage": "六阶 · ①—② 基础薄弱",
        "prefs": ["生活随拍", "个人记录"],
        "original": None,
        "following": None,
        "likes": 103,
        "favorites": 6,
        "sample_plays": [],
        "completion": None,
        "note": "互动量偏低，建议从基础培训与选题规划开始帮扶。",
    },
]

VILLAGES = [
    {
        "short": "八道河村",
        "name": "延庆区香营乡 · 八道河村",
        "total": 86,
        "secondary": {"C1": 86, "C2": 84, "C3": 78, "C4": 88, "C5": 82, "C6": 74,
                      "C7": 92, "C8": 87, "C9": 80, "C10": 90, "C11": 76, "C12": 85},
        "note": "村书记号周播与创作分成样本领先，可作片区标杆对照。",
    },
    {
        "short": "沙门村",
        "name": "延庆区大庄科乡 · 沙门村（矩阵）",
        "total": 82,
        "secondary": {"C1": 80, "C2": 82, "C3": 75, "C4": 90, "C5": 78, "C6": 80,
                      "C7": 85, "C8": 82, "C9": 72, "C10": 84, "C11": 74, "C12": 88},
        "note": "四账号矩阵，原创条数与农特题材丰富，适合横比培训成效。",
    },
    {
        "short": "张山营样品村",
        "name": "延庆区张山营镇 · 样品村（演示）",
        "total": 71,
        "secondary": {"C1": 74, "C2": 70, "C3": 72, "C4": 76, "C5": 70, "C6": 82,
                      "C7": 68, "C8": 65, "C9": 70, "C10": 72, "C11": 68, "C12": 74},
        "note": "演示数据：冰雪旅游带潜力高，物流与数字基建略弱，可专项补短。",
    },
    {
        "short": "旧县镇样品村",
        "name": "延庆区旧县镇 · 样品村（演示）",
        "total": 63,
        "secondary": {"C1": 70, "C2": 62, "C3": 68, "C4": 58, "C5": 62, "C6": 60,
                      "C7": 65, "C8": 58, "C9": 64, "C10": 66, "C11": 62, "C12": 60},
        "note": "演示数据：综合处于Ⅱ类下游，宜先做一期摸底勘察再投入重培训。",
    },
    {
        "short": "下花园村",
        "name": "延庆区大庄科乡 · 下花园村",
        "total": 54,
        "secondary": {"C1": 52, "C2": 48, "C3": 55, "C4": 50, "C5": 46, "C6": 58,
                      "C7": 62, "C8": 50, "C9": 58, "C10": 55, "C11": 62, "C12": 52},
        "note": "第一书记政策向账号互动偏低，建议实地走访两委与村民小组座谈复核。",
    },
]

TRAINING_FALLBACK = {
    "培训场次数": 7,
    "累计培训人次（签到合计）": 29,
    "签到涉及人数（去重）": 9,
}

QUADRANT_HINTS = {
    "明星区": "保持专班轻量陪跑，总结素材库与话术模板向全村域共享。",
    "潜力区": "重点帮扶：先把 F 做上去（网络、物流、两委执行、政策兑现），再扩培训面与账号矩阵。",
    "机会区": "可承接配套直播点、仓储中转角色，同时策划 1–2 个高辨识度的资源题材。",
    "边缘区": "纳入重点帮扶清单：建议实地勘察 + 两委座谈 + 按指标逐项整改，暂缓大规模投入。",
}


ACCOUNT_ALIASES = {
    "胖嫂子": "沙门村的胖嫂子",
    "祁嫂子": "沙门村的祁嫂子",
    "郭大嫂": "沙门郭大嫂",
    "春娥": "大山里的春娥姐",
    "延龙": "延龙寻路",
    "小馆": "下花园村小馆",
    "郝庄": "上风上水上郝庄7724",
    "螺娘": "井家螺娘钩织手作",
    "钩织": "井家螺娘钩织手作",
    "小童": "隐世一小童",
    "villily": "Villily",
}


def find_accounts(query: str) -> list[dict]:
    """按昵称、简称、建档编号匹配账号；空查询返回全部。"""
    q = (query or "").strip().lower()
    if not q:
        return list(ACCOUNTS)
    for alias, nickname in ACCOUNT_ALIASES.items():
        if alias in q:
            return [account for account in ACCOUNTS if account["nickname"] == nickname]
    return [
        account
        for account in ACCOUNTS
        if q in account["nickname"].lower()
        or account["nickname"].lower() in q
        or q == account["code"].lower()
    ]


def find_villages(query: str) -> list[dict]:
    q = (query or "").strip().lower()
    if not q:
        return list(VILLAGES)
    matches = [
        village
        for village in VILLAGES
        if q in village["short"].lower()
        or village["short"].lower() in q
        or q in village["name"].lower()
    ]
    if matches:
        return matches
    aliases = {"八道河": "八道河村", "沙门": "沙门村", "张山营": "张山营样品村",
               "旧县": "旧县镇样品村", "下花园": "下花园村"}
    for alias, short in aliases.items():
        if alias in q:
            return [v for v in VILLAGES if v["short"] == short]
    return []


def compute_indices(village: dict) -> tuple[float, float, float]:
    s = village["secondary"]
    a = (0.35 * s["C4"] + 0.35 * s["C5"] + 0.30 * s["C6"]) / 100
    f = (0.25 * s["C7"] + 0.25 * s["C8"] + 0.15 * s["C9"] + 0.20 * s["C10"] + 0.15 * s["C11"]) / 100
    return a, f, math.sqrt(a * a + f * f)


def classify_quadrant(a: float, f: float, threshold: float = 0.5) -> str:
    if a >= threshold and f >= threshold:
        return "明星区"
    if a >= threshold and f < threshold:
        return "潜力区"
    if a < threshold and f >= threshold:
        return "机会区"
    return "边缘区"


def village_tier(total: int) -> str:
    if total >= 80:
        return "Ⅰ类 优先支持"
    if total >= 60:
        return "Ⅱ类 审慎优化"
    return "Ⅲ类 建议实地勘察"


def training_stats() -> dict:
    try:
        payload = json.loads(TRAINING_FILE.read_text(encoding="utf-8"))
        stats = payload.get("培训统计") or {}
        if stats:
            return stats
    except (OSError, json.JSONDecodeError):
        pass
    return dict(TRAINING_FALLBACK)


def format_account(account: dict) -> str:
    parts = [
        f"{account['nickname']}（{account['code']}，{account['age']} 岁，数字基础评分 {account['digital_score']}/100）",
        f"成长阶段：{account['stage']}",
        f"内容偏好：{'、'.join(account['prefs'])}",
    ]
    if account.get("original") is not None:
        parts.append(f"原创 {account['original']} 条")
    if account.get("following") is not None:
        parts.append(f"关注 {account['following']}")
    if account.get("likes") is not None:
        parts.append(f"赞 {account['likes']} / 收藏 {account['favorites']}")
    if account.get("sample_plays"):
        parts.append("台账样本播放 " + " / ".join(account["sample_plays"]))
    if account.get("completion"):
        parts.append(f"完播率 {account['completion']}")
    if account.get("note"):
        parts.append(account["note"])
    return "；".join(parts)


def format_village(village: dict) -> str:
    a, f, rv = compute_indices(village)
    quadrant = classify_quadrant(a, f)
    return (
        f"{village['short']}：A={a:.3f}，F={f:.3f}，RVCPM={rv:.3f} → {quadrant}"
        f"（{QUADRANT_HINTS[quadrant]}）；综合总分 {village['total']}（{village_tier(village['total'])}）。"
        f"备注：{village['note']}"
    )

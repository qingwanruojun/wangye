/**
 * AI 问答助手：优先调用 FastAPI RAG 后端，后端不可用时使用内置演示知识库。
 */

(function () {
  const API_CANDIDATES = ["", "http://127.0.0.1:8000", "http://localhost:8000"];
  const PROBE_TIMEOUT = 1200;
  const CHAT_TIMEOUT = 45000;

  const state = {
    apiBase: null,
    online: false,
    health: null,
    busy: false,
    history: [],
    probing: false,
    session: 0,
    browserRag: null,
    browserReady: false,
  };

  const els = {
    status: document.getElementById("aiStatus"),
    log: document.getElementById("chatLog"),
    form: document.getElementById("chatForm"),
    input: document.getElementById("chatInput"),
    send: document.getElementById("chatSend"),
    clear: document.getElementById("chatClear"),
    quick: document.getElementById("quickPrompts"),
    sources: document.getElementById("ragSources"),
    kbList: document.getElementById("kbDocList"),
    welcomeMeta: document.getElementById("welcomeMeta"),
    kbText: document.getElementById("aiKbText"),
    modeText: document.getElementById("aiModeText"),
    loraText: document.getElementById("aiLoraText"),
  };

  if (!els.log || !els.form) return;

  const MODE_LABELS = {
    "rag-local": "抽取式 RAG",
    "llm-rag": "LLM + RAG",
    "lora-rag": "LoRA + RAG",
    "browser-rag": "浏览器内 RAG",
    "offline-demo": "本地演示",
  };

  function initBrowserRag() {
    if (state.browserReady) return true;
    try {
      const index = window.__RAG_INDEX__;
      const factory = window.BrowserRag;
      if (!index || !factory) return false;
      state.browserRag = factory.create(index);
      state.browserReady = Boolean(state.browserRag);
      return state.browserReady;
    } catch (error) {
      state.browserRag = null;
      state.browserReady = false;
      return false;
    }
  }

  function browserAnswer(question) {
    if (!state.browserReady || !state.browserRag) return null;
    try {
      return state.browserRag.answer(question, {
        topK: 4,
        history: state.history.slice(-6),
      });
    } catch (error) {
      return null;
    }
  }

  const LOCAL_KB = [
    {
      keywords: ["看板", "项目", "做什么", "介绍", "平台", "银发乡播"],
      label: "项目总览",
      answer:
        "这是青韵馨香实践团的「银发乡播・AI 适老化大数据服务看板」，用一份台账跟踪银发主播成长、视频号流量、电商分成、农文旅运营和村庄复制适配度，并以适老化大字界面呈现。重点跟踪 10 个账号，台账 16 个账号原创合计 612 条。",
    },
    {
      keywords: ["胖嫂子", "郭大嫂", "祁嫂子", "春娥", "八道河", "延龙", "账号表现", "主播"],
      label: "代表账号表现",
      answer:
        "代表账号数据：胖嫂子 55 岁，数字化评分 82，原创 24 条，赞 4173、收藏 3147，近期样本播放 8803 / 7549，完播率约 38% / 16%；郭大嫂原创 109 条；祁嫂子原创 73 条并获香椿季优质原创激励；春娥姐单条峰值播放 82,637（另有样本 62,637）；八道河村书记号周播 137,474 次；延龙寻路为下花园村第一书记政策向账号。",
    },
    {
      keywords: ["六阶", "成长体系", "阶段", "入门认知", "种子讲师", "成长"],
      label: "六阶成长路径",
      answer:
        "六阶依次是：入门认知、拍摄剪辑、直播基础、AIGC 应用、IP 打造、种子讲师。当前台账均值处于第 2—3 阶之间，整体进度约 68%；多数账号已能稳定拍摄剪辑与周更，直播与变现仍在补强。",
    },
    {
      keywords: ["短板", "完播率", "直播间", "留人", "预警", "活跃度", "问题"],
      label: "运营短板与预警",
      answer:
        "集体短板是完播率不高、直播预热与留人偏弱、短视频与直播联动不足，以及政策类题材的互动结构需要陪练。活跃度分三级预警：7 天未活跃提醒、15 天未发布橙色预警、30 天直播或发布缺失为严重预警。",
    },
    {
      keywords: ["收益", "分成", "直播收入", "农户", "赚", "金额", "552", "333"],
      label: "电商透明对账",
      answer:
        "可查收益样例：创作分成 ¥333.68、直播收入 ¥218.95、农户侧分成 ¥27.61（含优质原创激励 ¥19.03），文档期合计 ¥552.63。当前增收以视频号创作分成与激励为主，小店成交明细待对公对账模块接通后展示。",
    },
    {
      keywords: ["香椿", "核桃", "栗子", "鸡蛋", "品类", "带货", "选题", "爆款"],
      label: "选题与带货品类",
      answer:
        "带货主品类包括核桃（沙门村矩阵主营）、栗子（多账号反复出镜）、香椿（季节爆款题材）、柴鸡蛋（同城兴趣转化）。香椿季代表选题有「五一前后出售香椿了」等农事节点内容，祁嫂子单条分成样例 ¥3.08。",
    },
    {
      keywords: ["适配", "复制", "AHP", "评估", "RVCPM", "四象限", "推广", "新村庄"],
      label: "AHP 村庄适配度",
      answer:
        "使用 AHP 村庄适配度评估：十二项二级指标，A = 0.35·C4′ + 0.35·C5′ + 0.30·C6′，F = 0.25·C7′ + 0.25·C8′ + 0.15·C9′ + 0.20·C10′ + 0.15·C11′，RVCPM = √(A² + F²)。四象限为明星区、潜力区、机会区、边缘区，分别对应优先推广、专项帮扶、配套试点与重点帮扶。",
    },
    {
      keywords: ["隐私", "安全", "脱敏", "权限", "备份", "合规", "个人"],
      label: "隐私与安全合规",
      answer:
        "姓名、电话、证件自动脱敏，前端只展示视频号昵称或内部编号；原始数据禁止向第三方或未脱敏提供；每日凌晨全量备份并支持时间点恢复。系统分超级管理员、村管理员、运营专员、志愿者四类角色，村内数据隔离。",
    },
    {
      keywords: ["真实", "演示", "农文旅", "数据来源", "可信", "文旅"],
      label: "数据真实性说明",
      answer:
        "主播账号、原创条数、播放、点赞、收藏与创作分成来自台账和视频号后台摘录，是真实样本；农文旅板块的满意度、客源地、活动人次与金额是演示虚拟数据，页面已用丝带标识区分。",
    },
    {
      keywords: ["RAG", "LoRA", "微调", "后端", "启动", "检索", "大模型", "AI 怎么"],
      label: "RAG 与 LoRA",
      answer:
        "助手采用 RAG：先在知识库做 TF-IDF 相似度检索，取出相关段落并附来源。默认在浏览器内完成检索与抽取式回答，静态部署即可使用；配置大模型 API 或加载 LoRA 适配器时，由 FastAPI 后端基于检索结果生成。LoRA 微调脚本在 server/training/，后端设置 LOCAL_MODEL_PATH 与 LORA_ADAPTER_PATH 即可加载适配器。",
    },
  ];

  function setStatus(kind, text) {
    if (!els.status) return;
    els.status.classList.remove(
      "ai-status-checking",
      "ai-status-online",
      "ai-status-browser",
      "ai-status-offline"
    );
    els.status.classList.add(`ai-status-${kind}`);
    const label = els.status.querySelector("span");
    if (label) label.textContent = text;
    const retryable = kind === "offline" || kind === "browser";
    els.status.title = retryable ? "点击重试连接后端" : "";
    els.status.style.cursor = retryable ? "pointer" : "default";
  }

  function setOfflineNotes(updateWelcome) {
    if (state.browserReady) {
      const stats = state.browserRag.stats;
      if (updateWelcome && els.welcomeMeta) {
        els.welcomeMeta.textContent = `浏览器内 RAG · ${stats.documents} 篇 / ${stats.chunks} 分块 · 无需后端`;
      }
      if (els.kbText) {
        els.kbText.textContent = `浏览器内索引 · ${stats.documents} 篇 / ${stats.chunks} 分块`;
      }
      if (els.modeText) els.modeText.textContent = "浏览器内 TF-IDF + 抽取式回答";
      if (els.loraText) els.loraText.textContent = "启动后端后可接 LLM / LoRA";
      return;
    }

    if (updateWelcome && els.welcomeMeta) {
      els.welcomeMeta.textContent = "未连接 RAG 后端 · 使用内置演示知识库";
    }
    if (els.kbText) els.kbText.textContent = "离线演示 · 内置知识卡";
    if (els.modeText) els.modeText.textContent = "本地演示回答";
    if (els.loraText) els.loraText.textContent = "LoRA 训练脚手架已就绪";
  }

  async function fetchJson(url, options, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function probeBackend() {
    if (state.probing) return;
    state.probing = true;
    state.online = false;
    state.apiBase = null;
    setStatus("checking", "连接后端…");

    const candidates = API_CANDIDATES.filter(
      (base) => !(window.location.protocol === "file:" && base === "")
    );

    for (const base of candidates) {
      try {
        const data = await fetchJson(`${base}/api/health`, undefined, PROBE_TIMEOUT);
        if (data && data.status === "ok") {
          state.apiBase = base;
          state.online = true;
          state.health = data;
          state.probing = false;
          applyHealth(data);
          return;
        }
      } catch (error) {
        /* 继续尝试下一个地址 */
      }
    }

    state.probing = false;
    if (state.browserReady) {
      setStatus("browser", "浏览器内 RAG");
    } else {
      setStatus("offline", "本地演示模式");
    }
    setOfflineNotes(true);
  }

  function applyHealth(data) {
    const kb = data.kb || {};
    setStatus("online", "RAG 后端在线");
    if (els.welcomeMeta) {
      els.welcomeMeta.textContent = `RAG 知识库 ${kb.documents || 0} 篇 · ${kb.chunks || 0} 个分块 · 检索就绪`;
    }
    if (els.kbText) {
      els.kbText.textContent = `TF-IDF 余弦检索 · ${kb.documents || 0} 篇 / ${kb.chunks || 0} 分块`;
    }
    if (els.modeText) {
      els.modeText.textContent = data.llm && data.llm.configured
        ? `${data.llm.model || "LLM"} + RAG 生成`
        : "抽取式 RAG（可接 LLM）";
    }
    if (els.loraText) {
      const adapter = data.lora && data.lora.adapter;
      els.loraText.textContent = adapter
        ? `适配器：${String(adapter).split(/[\\/]/).pop()}`
        : "训练脚手架已就绪 · 未加载适配器";
    }
    loadKnowledgeBase();
  }

  async function loadKnowledgeBase() {
    if (!state.online || !els.kbList) return;
    try {
      const data = await fetchJson(`${state.apiBase}/api/kb`, undefined, 5000);
      const docs = data.documents || [];
      if (!docs.length) return;
      els.kbList.textContent = "";
      docs.forEach((doc) => {
        const row = document.createElement("div");
        row.className = "kb-doc-item";
        const name = document.createElement("span");
        name.textContent = doc.title;
        const count = document.createElement("span");
        count.textContent = `${doc.chunks} 块`;
        row.append(name, count);
        els.kbList.append(row);
      });
    } catch (error) {
      /* 知识库列表失败不影响问答 */
    }
  }

  function scrollLog() {
    els.log.scrollTop = els.log.scrollHeight;
  }

  function appendMessage(role, text, meta, sources) {
    const row = document.createElement("div");
    row.className = `chat-msg ${role}`;

    const avatar = document.createElement("span");
    avatar.className = "chat-avatar";
    avatar.textContent = role === "user" ? "我" : "AI";

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";

    if (text) {
      const paragraph = document.createElement("p");
      paragraph.className = "chat-text";
      paragraph.textContent = text;
      bubble.append(paragraph);
    }

    if (sources && sources.length) {
      const wrap = document.createElement("div");
      wrap.className = "chat-sources";
      const label = document.createElement("span");
      label.className = "chat-source-label";
      label.textContent = "来源";
      wrap.append(label);
      sources.slice(0, 4).forEach((source) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chat-source";
        const score = typeof source.score === "number" ? source.score.toFixed(2) : "本地";
        chip.textContent = source.heading || source.title;
        const value = document.createElement("em");
        value.textContent = score;
        chip.append(value);
        chip.title = source.snippet || "";
        chip.addEventListener("click", () => renderSources([source]));
        wrap.append(chip);
      });
      bubble.append(wrap);
    }

    if (meta) {
      const note = document.createElement("div");
      note.className = "chat-meta";
      note.textContent = meta;
      bubble.append(note);
    }

    row.append(avatar, bubble);
    els.log.append(row);
    scrollLog();
    return bubble;
  }

  function appendTyping() {
    const bubble = appendMessage("assistant", "", "正在检索知识库…");
    const dots = document.createElement("span");
    dots.className = "typing";
    dots.append(document.createElement("i"), document.createElement("i"), document.createElement("i"));
    bubble.prepend(dots);
    bubble.classList.add("chat-typing");
    return bubble;
  }

  function removeTyping(bubble) {
    const row = bubble.closest(".chat-msg");
    if (row) row.remove();
  }

  function renderSources(sources) {
    if (!els.sources) return;
    els.sources.textContent = "";
    if (!sources || !sources.length) {
      const empty = document.createElement("p");
      empty.className = "muted small";
      empty.textContent = "本次回答未命中知识库片段。";
      els.sources.append(empty);
      return;
    }
    const scores = sources.map((item) => (typeof item.score === "number" ? item.score : 0));
    const max = Math.max(...scores, 0.0001);
    sources.forEach((source, index) => {
      const card = document.createElement("div");
      card.className = "rag-source";

      const head = document.createElement("div");
      head.className = "rag-source-head";
      const title = document.createElement("strong");
      title.textContent = source.title || "知识库";
      const score = document.createElement("span");
      score.className = "rag-score";
      score.textContent = typeof source.score === "number" ? source.score.toFixed(3) : "本地";
      head.append(title, score);

      const sub = document.createElement("p");
      sub.className = "rag-source-sub";
      sub.textContent = source.heading || "";

      const bar = document.createElement("div");
      bar.className = "rag-bar";
      const fill = document.createElement("i");
      const ratio = typeof source.score === "number" ? (scores[index] / max) * 100 : 60;
      fill.style.width = `${Math.max(16, Math.round(ratio))}%`;
      bar.append(fill);

      const snippet = document.createElement("p");
      snippet.className = "rag-snippet";
      snippet.textContent = source.snippet || "";

      card.append(head);
      if (source.heading) card.append(sub);
      card.append(bar, snippet);
      els.sources.append(card);
    });
  }

  function localAnswer(question) {
    let best = null;
    let bestScore = 0;
    LOCAL_KB.forEach((item) => {
      const score = item.keywords.reduce((sum, keyword) => {
        if (!question.includes(keyword)) return sum;
        return sum + Math.max(keyword.length, 2);
      }, 0);
      if (score > bestScore) {
        best = item;
        bestScore = score;
      }
    });

    if (!best) {
      return {
        answer:
          "我在内置演示知识库里没有找到直接相关的内容。可以试试：账号表现、六阶成长、创作分成、香椿季选题、AHP 适配度、隐私保护，或启动后端获得完整 RAG 检索。",
        sources: [],
        mode: "offline-demo",
        latency_ms: 0,
      };
    }

    return {
      answer: best.answer,
      sources: [
        {
          title: "内置演示知识库",
          heading: best.label,
          snippet: best.answer.slice(0, 90),
          score: null,
        },
      ],
      mode: "offline-demo",
      latency_ms: 0,
    };
  }

  async function askBackend(question) {
    const payload = {
      question,
      top_k: 4,
      history: state.history.slice(-6),
    };
    return fetchJson(
      `${state.apiBase}/api/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      CHAT_TIMEOUT
    );
  }

  async function sendQuestion(rawQuestion) {
    const question = (rawQuestion || "").trim();
    if (!question || state.busy) return;

    const session = state.session;
    state.busy = true;
    els.send.disabled = true;
    els.input.value = "";
    appendMessage("user", question);
    const typing = appendTyping();

    let result = null;
    if (state.online) {
      try {
        result = await askBackend(question);
      } catch (error) {
        state.online = false;
        state.apiBase = null;
        setStatus(state.browserReady ? "browser" : "offline", state.browserReady ? "浏览器内 RAG" : "本地演示模式");
        setOfflineNotes(false);
      }
    }
    if (!result) result = browserAnswer(question) || localAnswer(question);

    removeTyping(typing);
    if (session !== state.session) {
      state.busy = false;
      els.send.disabled = false;
      return;
    }

    const modeLabel = MODE_LABELS[result.mode] || "RAG";
    const latency = result.latency_ms ? ` · ${Math.round(result.latency_ms)} ms` : "";
    const meta = `${modeLabel}${latency}${result.mode === "offline-demo" ? " · 未连接后端" : ""}`;
    appendMessage("assistant", result.answer, meta, result.sources);
    renderSources(result.sources);

    state.history.push({ role: "user", content: question });
    state.history.push({ role: "assistant", content: result.answer });
    if (state.history.length > 12) state.history = state.history.slice(-12);

    state.busy = false;
    els.send.disabled = false;
    els.input.focus();
  }

  function resetChat() {
    state.session += 1;
    state.history = [];
    state.busy = false;
    els.send.disabled = false;
    els.log.textContent = "";
    const bubble = appendMessage(
      "assistant",
      "你好，我是乡播 AI 问答助手。可以问我主播成长、视频号流量、创作分成、农文旅、村庄适配度或隐私合规等问题。",
      state.online
        ? "RAG 知识库已就绪 · 随时提问"
        : state.browserReady
          ? "浏览器内 RAG 已就绪 · 随时提问"
          : "未连接 RAG 后端 · 使用内置演示知识库"
    );
    bubble.querySelector(".chat-meta").id = "welcomeMeta";
    els.welcomeMeta = bubble.querySelector(".chat-meta");
    els.sources.textContent = "";
    const empty = document.createElement("p");
    empty.className = "muted small";
    empty.textContent = "发送问题后，这里会显示命中的知识库片段与相似度。";
    els.sources.append(empty);
    els.input.focus();
  }

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendQuestion(els.input.value);
  });

  els.quick?.addEventListener("click", (event) => {
    const button = event.target.closest(".quick-prompt");
    if (!button) return;
    sendQuestion(button.textContent);
  });

  els.clear?.addEventListener("click", resetChat);

  els.status?.addEventListener("click", () => {
    if (!state.online && !state.probing) probeBackend();
  });

  initBrowserRag();
  probeBackend();
})();
